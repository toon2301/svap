import type { ConversationListItem } from './types';
import { listConversationsPage } from './conversationsPagingApi';
import {
  appendUniqueConversations,
  conversationsWindowRequests,
  fetchConversationsWindow,
} from './conversationsWindow';

jest.mock('./conversationsPagingApi', () => ({
  ...jest.requireActual('./conversationsPagingApi'),
  listConversationsPage: jest.fn(),
}));

const pageMock = listConversationsPage as jest.Mock;

function conversation(id: number): ConversationListItem {
  return { id, other_user: null, last_message_preview: null, last_message_at: null };
}

function range(from: number, to: number): ConversationListItem[] {
  return Array.from({ length: to - from + 1 }, (_, index) => conversation(from + index));
}

/** Server s `total` konverzáciami (id 1..total), ktorý stránkuje ako Django `PageNumberPagination`. */
function fakeServer(total: number) {
  pageMock.mockImplementation(async ({ page, pageSize }: { page: number; pageSize: number }) => {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return { items: start <= total ? range(start, end) : [], hasMore: page * pageSize < total };
  });
}

describe('conversationsWindowRequests', () => {
  it('loads one batch with one request of 20', () => {
    expect(conversationsWindowRequests(1)).toEqual([{ page: 1, pageSize: 20 }]);
  });

  it.each([
    [2, 40],
    [3, 60],
    [5, 100],
  ])('loads %i batches with one request of %i while it fits the server limit', (pageCount, size) => {
    expect(conversationsWindowRequests(pageCount)).toEqual([{ page: 1, pageSize: size }]);
  });

  it('splits a window above the server limit into pages of 100', () => {
    expect(conversationsWindowRequests(6)).toEqual([
      { page: 1, pageSize: 100 },
      { page: 2, pageSize: 100 },
    ]);
    expect(conversationsWindowRequests(11)).toEqual([
      { page: 1, pageSize: 100 },
      { page: 2, pageSize: 100 },
      { page: 3, pageSize: 100 },
    ]);
  });

  it('does not add an empty page when the window is an exact multiple of 100', () => {
    expect(conversationsWindowRequests(10)).toEqual([
      { page: 1, pageSize: 100 },
      { page: 2, pageSize: 100 },
    ]);
  });

  it('never asks for less than one batch', () => {
    expect(conversationsWindowRequests(0)).toEqual([{ page: 1, pageSize: 20 }]);
    expect(conversationsWindowRequests(-3)).toEqual([{ page: 1, pageSize: 20 }]);
  });

  it('rounds a fractional batch count down', () => {
    expect(conversationsWindowRequests(2.9)).toEqual([{ page: 1, pageSize: 40 }]);
  });
});

describe('appendUniqueConversations', () => {
  it('appends new conversations at the end in order', () => {
    const result = appendUniqueConversations(range(1, 3), range(4, 5));

    expect(result.map((item) => item.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('drops conversations that are already in the list and keeps the first occurrence', () => {
    const current = [{ ...conversation(3), last_message_preview: 'old' }];
    const incoming = [{ ...conversation(3), last_message_preview: 'new' }, conversation(4)];

    const result = appendUniqueConversations(current, incoming);

    expect(result.map((item) => item.id)).toEqual([3, 4]);
    expect(result[0].last_message_preview).toBe('old');
  });

  it('drops duplicates inside the incoming batch itself', () => {
    const result = appendUniqueConversations(range(1, 1), [conversation(2), conversation(2)]);

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it('returns the very same array when nothing new arrives', () => {
    const current = range(1, 3);

    expect(appendUniqueConversations(current, range(2, 3))).toBe(current);
    expect(appendUniqueConversations(current, [])).toBe(current);
  });

  it('does not mutate its inputs', () => {
    const current = range(1, 2);
    const incoming = range(2, 3);

    appendUniqueConversations(current, incoming);

    expect(current.map((item) => item.id)).toEqual([1, 2]);
    expect(incoming.map((item) => item.id)).toEqual([2, 3]);
  });
});

describe('fetchConversationsWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the first batch and reports that more follow', async () => {
    fakeServer(45);

    const result = await fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 1 });

    expect(result.items.map((item) => item.id)).toEqual(range(1, 20).map((item) => item.id));
    expect(result.hasMore).toBe(true);
    expect(pageMock).toHaveBeenCalledTimes(1);
    expect(pageMock).toHaveBeenCalledWith({
      tab: 'messages',
      search: '',
      page: 1,
      pageSize: 20,
    });
  });

  it('reports no more when the whole list fits the first batch', async () => {
    fakeServer(7);

    const result = await fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 1 });

    expect(result.items).toHaveLength(7);
    expect(result.hasMore).toBe(false);
  });

  it('reports no more for an empty list', async () => {
    fakeServer(0);

    const result = await fetchConversationsWindow({ tab: 'requests', search: '', pageCount: 1 });

    expect(result).toEqual({ items: [], hasMore: false });
  });

  it('reloads several batches with a single request', async () => {
    fakeServer(100);

    const result = await fetchConversationsWindow({ tab: 'messages', search: 'x', pageCount: 3 });

    expect(result.items).toHaveLength(60);
    expect(result.hasMore).toBe(true);
    expect(pageMock).toHaveBeenCalledTimes(1);
    expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: 'x', page: 1, pageSize: 60 });
  });

  it('reports the end when the window reaches the last conversation exactly', async () => {
    fakeServer(60);

    const result = await fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 3 });

    expect(result.items).toHaveLength(60);
    expect(result.hasMore).toBe(false);
  });

  it('collects a window above the server limit from several pages of 100 and trims it', async () => {
    fakeServer(500);

    const result = await fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 6 });

    expect(pageMock).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(120);
    expect(result.items[0].id).toBe(1);
    expect(result.items[119].id).toBe(120);
    expect(result.hasMore).toBe(true);
  });

  it('reports the end of a big window when the list ends inside it', async () => {
    fakeServer(150);

    const result = await fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 8 });

    expect(result.items).toHaveLength(150);
    expect(result.hasMore).toBe(false);
    expect(pageMock).toHaveBeenCalledTimes(2);
  });

  it('reports more when the pages of a big window overshoot it, even if the last page is the end', async () => {
    fakeServer(130);

    const result = await fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 6 });

    expect(pageMock).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(120);
    expect(result.hasMore).toBe(true);
  });

  it('treats a fractional batch count as the whole batches below it', async () => {
    fakeServer(100);

    const result = await fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 2.9 });

    expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 1, pageSize: 40 });
    expect(result.items).toHaveLength(40);
  });

  it('stops asking as soon as the server says there is no next page', async () => {
    fakeServer(30);

    await fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 11 });

    expect(pageMock).toHaveBeenCalledTimes(1);
  });

  it('lets errors through to the caller', async () => {
    pageMock.mockRejectedValue(new Error('network'));

    await expect(
      fetchConversationsWindow({ tab: 'messages', search: '', pageCount: 1 }),
    ).rejects.toThrow('network');
  });
});

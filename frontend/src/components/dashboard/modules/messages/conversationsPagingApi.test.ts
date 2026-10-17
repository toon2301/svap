import { api } from '@/lib/api';
import {
  CONVERSATIONS_MAX_PAGE_SIZE,
  CONVERSATIONS_PAGE_SIZE,
  listConversationsPage,
} from './conversationsPagingApi';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get: jest.fn(),
  },
}));

const getMock = api.get as jest.Mock;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function conversation(id: number) {
  return { id, other_user: null, last_message_preview: null, last_message_at: null };
}

describe('listConversationsPage', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('keeps the batch size in line with the server limits', () => {
    expect(CONVERSATIONS_PAGE_SIZE).toBe(20);
    expect(CONVERSATIONS_MAX_PAGE_SIZE).toBe(100);
    expect(CONVERSATIONS_MAX_PAGE_SIZE % CONVERSATIONS_PAGE_SIZE).toBe(0);
  });

  it('asks the conversations endpoint for the requested page', async () => {
    getMock.mockResolvedValue({ data: { results: [conversation(1)], next: null } });

    await listConversationsPage({ tab: 'messages', search: '', page: 3, pageSize: 20 });

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith('/auth/messaging/conversations/', {
      params: { page: 3, page_size: 20 },
    });
  });

  it('asks the requests endpoint for the requests tab', async () => {
    getMock.mockResolvedValue({ data: { results: [], next: null } });

    await listConversationsPage({ tab: 'requests', search: '', page: 1, pageSize: 40 });

    expect(getMock).toHaveBeenCalledWith('/auth/messaging/conversations/requests/', {
      params: { page: 1, page_size: 40 },
    });
  });

  it('sends the search trimmed and with single spaces', async () => {
    getMock.mockResolvedValue({ data: { results: [], next: null } });

    await listConversationsPage({ tab: 'messages', search: '  Jana   Nová ', page: 1, pageSize: 20 });

    expect(getMock).toHaveBeenCalledWith('/auth/messaging/conversations/', {
      params: { page: 1, page_size: 20, search: 'Jana Nová' },
    });
  });

  it('leaves the search out when it is blank', async () => {
    getMock.mockResolvedValue({ data: { results: [], next: null } });

    await listConversationsPage({ tab: 'messages', search: '   ', page: 1, pageSize: 20 });

    const params = getMock.mock.calls[0][1].params;
    expect(params).not.toHaveProperty('search');
  });

  it('reports a next page when the server sends a next link', async () => {
    getMock.mockResolvedValue({
      data: { results: [conversation(1), conversation(2)], next: 'http://api/?page=2' },
    });

    const page = await listConversationsPage({ tab: 'messages', search: '', page: 1, pageSize: 20 });

    expect(page.items.map((item) => item.id)).toEqual([1, 2]);
    expect(page.hasMore).toBe(true);
  });

  it.each([null, undefined, ''])('reports no next page when next is %p', async (next) => {
    getMock.mockResolvedValue({ data: { results: [conversation(1)], next } });

    const page = await listConversationsPage({ tab: 'messages', search: '', page: 1, pageSize: 20 });

    expect(page.hasMore).toBe(false);
  });

  it('treats an unpaginated array response as everything at once', async () => {
    getMock.mockResolvedValue({ data: [conversation(1), conversation(2)] });

    const page = await listConversationsPage({ tab: 'requests', search: '', page: 1, pageSize: 20 });

    expect(page.items.map((item) => item.id)).toEqual([1, 2]);
    expect(page.hasMore).toBe(false);
  });

  it.each([null, undefined, {}, { results: 'x' }])(
    'returns an empty page for the unexpected payload %p',
    async (data) => {
      getMock.mockResolvedValue({ data });

      const page = await listConversationsPage({ tab: 'messages', search: '', page: 1, pageSize: 20 });

      expect(page).toEqual({ items: [], hasMore: false });
    },
  );

  it('lets request errors through to the caller', async () => {
    getMock.mockRejectedValue(new Error('network'));

    await expect(
      listConversationsPage({ tab: 'messages', search: '', page: 1, pageSize: 20 }),
    ).rejects.toThrow('network');
  });

  describe('requests in flight', () => {
    const base = { tab: 'messages' as const, search: '', page: 1, pageSize: 20 };

    it('shares one request between identical simultaneous calls', async () => {
      const slow = deferred<{ data: unknown }>();
      getMock.mockReturnValue(slow.promise);

      const first = listConversationsPage(base);
      const second = listConversationsPage({ ...base });
      slow.resolve({ data: { results: [conversation(1)], next: null } });
      const [firstPage, secondPage] = await Promise.all([first, second]);

      expect(getMock).toHaveBeenCalledTimes(1);
      expect(firstPage).toEqual(secondPage);
    });

    it('treats searches that normalize to the same text as identical', async () => {
      const slow = deferred<{ data: unknown }>();
      getMock.mockReturnValue(slow.promise);

      const first = listConversationsPage({ ...base, search: 'Jana  Nová' });
      const second = listConversationsPage({ ...base, search: ' Jana Nová ' });
      slow.resolve({ data: { results: [], next: null } });
      await Promise.all([first, second]);

      expect(getMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['tab', { tab: 'requests' as const }],
      ['page', { page: 2 }],
      ['page size', { pageSize: 40 }],
      ['search', { search: 'x' }],
    ])('does not share a request that differs in %s', async (_name, change) => {
      getMock.mockResolvedValue({ data: { results: [], next: null } });

      await Promise.all([listConversationsPage(base), listConversationsPage({ ...base, ...change })]);

      expect(getMock).toHaveBeenCalledTimes(2);
    });

    it('asks the server again once the previous request is done', async () => {
      getMock.mockResolvedValue({ data: { results: [], next: null } });

      await listConversationsPage(base);
      await listConversationsPage(base);

      expect(getMock).toHaveBeenCalledTimes(2);
    });

    it('lets every caller see a failure and asks again afterwards', async () => {
      const slow = deferred<{ data: unknown }>();
      getMock.mockReturnValue(slow.promise);
      const settled = Promise.allSettled([listConversationsPage(base), listConversationsPage(base)]);
      slow.reject(new Error('network'));

      const results = await settled;

      expect(getMock).toHaveBeenCalledTimes(1);
      expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);

      getMock.mockResolvedValue({ data: { results: [conversation(1)], next: null } });
      const retried = await listConversationsPage(base);
      expect(retried.items).toHaveLength(1);
      expect(getMock).toHaveBeenCalledTimes(2);
    });
  });
});

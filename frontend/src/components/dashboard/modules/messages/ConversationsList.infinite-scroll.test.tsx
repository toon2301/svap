'use client';

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationsList } from './ConversationsList';
import { listConversationsPage, type ConversationsTab } from './conversationsPagingApi';
import type { ConversationListItem } from './types';
import { getUnreadMessagesSummary, updateConversationPinnedState } from './messagingApi';
import { ensureFreshSessionForBackgroundWork } from '@/lib/api';
import { syncMessageUnreadCountFromConversations } from '@/components/dashboard/contexts/messageUnreadStore';
import {
  dispatchConversationUnavailable,
  requestConversationsRefresh,
} from './messagesEvents';
import { installFiringIntersectionObserver, type FiringObserver } from '../feed/feedObserverTestUtils';

jest.mock('./conversationsPagingApi', () => ({
  ...jest.requireActual('./conversationsPagingApi'),
  listConversationsPage: jest.fn(),
}));

jest.mock('./messagingApi', () => ({
  __esModule: true,
  acceptMessageRequest: jest.fn(),
  createGroupConversation: jest.fn(),
  deleteMessageRequest: jest.fn(),
  getMessageRequestsUnseenSummary: jest.fn(() => Promise.resolve({ count: 0 })),
  getMessagingErrorMessage: jest.fn((_error, options) => options?.fallback || 'Messaging error'),
  getUnreadMessagesSummary: jest.fn(),
  hideConversation: jest.fn(),
  listGroupMemberCandidates: jest.fn(),
  markMessageRequestsSeen: jest.fn(() => Promise.resolve({ count: 0 })),
  updateConversationPinnedState: jest.fn(),
}));

jest.mock('@/components/dashboard/contexts/messageUnreadStore', () => ({
  __esModule: true,
  getMessageUnreadCountStore: jest.fn(() => ({ lastSuccessfulRefreshAt: 0 })),
  publishMessageUnreadCount: jest.fn(),
  syncMessageUnreadCountFromConversations: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  ensureFreshSessionForBackgroundWork: jest.fn(() => Promise.resolve('ready')),
}));

jest.mock('../profile/ReportUserModal', () => ({
  __esModule: true,
  ReportUserModal: () => null,
}));

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn() }),
}));

const SENTINEL = 'conversations-load-more-sentinel';
const BASE_TIME = Date.UTC(2026, 2, 27, 12, 0, 0);

const pageMock = listConversationsPage as jest.Mock;

type Page = { items: ConversationListItem[]; hasMore: boolean };

/** Konverzácia `id`: čím vyššie id, tým staršia posledná správa, takže poradie je id 1, 2, 3 … */
function conversation(id: number, overrides: Partial<ConversationListItem> = {}): ConversationListItem {
  return {
    id,
    other_user: { id: 1000 + id, display_name: `Osoba ${id}` },
    last_message_preview: `Správa ${id}`,
    last_message_at: new Date(BASE_TIME - id * 60_000).toISOString(),
    last_message_sender_id: 1000 + id,
    has_unread: false,
    unread_count: 0,
    ...overrides,
  } as ConversationListItem;
}

type FakeDb = Record<ConversationsTab, ConversationListItem[]>;

/** Server so zoznamom konverzácií a žiadostí, ktorý stránkuje a filtruje ako backend. */
function fakeServer(db: Partial<FakeDb>) {
  const lists: FakeDb = { messages: [], requests: [], ...db };
  pageMock.mockImplementation(
    async ({
      tab,
      search,
      page,
      pageSize,
    }: {
      tab: ConversationsTab;
      search: string;
      page: number;
      pageSize: number;
    }): Promise<Page> => {
      const needle = search.trim().toLowerCase();
      const matching = lists[tab].filter(
        (item) => !needle || (item.other_user?.display_name ?? '').toLowerCase().includes(needle),
      );
      const start = (page - 1) * pageSize;
      return {
        items: matching.slice(start, start + pageSize),
        hasMore: start + pageSize < matching.length,
      };
    },
  );
  return lists;
}

function range(from: number, to: number): ConversationListItem[] {
  return Array.from({ length: to - from + 1 }, (_, index) => conversation(from + index));
}

function renderedIds(): number[] {
  return screen
    .queryAllByText(/^Osoba \d+$/)
    .map((node) => Number((node.textContent || '').replace('Osoba ', '')));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Nechá doznieť efekty a rozbehnuté promisy, aby negatívne asercie nepadli len preto, že ešte nič nebehlo. */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Počká, kým sa sentinel začne sledovať (efekt beží až po vykreslení), a potom ho „pretne". */
async function fireSentinel(observer: FiringObserver, times = 1) {
  await waitFor(() => expect(observer.count()).toBe(1));
  await act(async () => {
    for (let index = 0; index < times; index += 1) observer.fire(SENTINEL);
  });
}

describe('ConversationsList infinite scroll', () => {
  let observer: FiringObserver;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    observer = installFiringIntersectionObserver();
    window.history.replaceState(null, '', '/dashboard/messages');
    (getUnreadMessagesSummary as jest.Mock).mockResolvedValue({ count: 0 });
    (ensureFreshSessionForBackgroundWork as jest.Mock).mockResolvedValue('ready');
    (updateConversationPinnedState as jest.Mock).mockImplementation(
      async (conversationId: number, isPinned: boolean) => ({
        conversation_id: conversationId,
        is_pinned: isPinned,
      }),
    );
  });

  afterEach(() => {
    observer.restore();
    jest.useRealTimers();
  });

  it('shows the first 20 conversations and asks the server for a page of 20', async () => {
    fakeServer({ messages: range(1, 45) });

    render(<ConversationsList currentUserId={1} variant="rail" />);

    expect(await screen.findByText('Osoba 1')).toBeInTheDocument();
    expect(renderedIds()).toEqual(range(1, 20).map((item) => item.id));
    expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 1, pageSize: 20 });
  });

  it('loads the next batches as the end of the list comes into view, without a limit', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');

    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(40));
    expect(pageMock).toHaveBeenLastCalledWith({ tab: 'messages', search: '', page: 2, pageSize: 20 });

    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(45));
    expect(pageMock).toHaveBeenLastCalledWith({ tab: 'messages', search: '', page: 3, pageSize: 20 });
    expect(renderedIds()).toEqual(range(1, 45).map((item) => item.id));
  });

  it('stops watching the end of the list once everything is loaded', async () => {
    fakeServer({ messages: range(1, 25) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');

    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(25));

    await waitFor(() => expect(observer.count()).toBe(0));
  });

  it('does not watch the end of the list when the first batch is everything', async () => {
    fakeServer({ messages: range(1, 7) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await flush();

    expect(observer.count()).toBe(0);
  });

  it('shows skeleton rows while the next batch is loading', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    const slow = deferred<Page>();
    pageMock.mockImplementationOnce(() => slow.promise);

    await fireSentinel(observer);

    await waitFor(() => expect(screen.getAllByTestId('conversations-load-more-row')).toHaveLength(2));
    expect(renderedIds()).toHaveLength(20);
    // Rail je kompaktný, takže riadky skeletonu majú kompaktné odsadenie.
    expect(screen.getAllByTestId('conversations-load-more-row')[0].className).toContain('px-3 py-2.5');
    // Počas načítavania sa sentinel nesleduje; po dotiahnutí sa vytvorí nový pozorovateľ.
    expect(observer.count()).toBe(0);

    await act(async () => {
      slow.resolve({ items: range(21, 40), hasMore: true });
    });
    await waitFor(() => expect(renderedIds()).toHaveLength(40));
    expect(screen.queryAllByTestId('conversations-load-more-row')).toHaveLength(0);
    await waitFor(() => expect(observer.count()).toBe(1));
  });

  it('does not request the same batch twice while it is loading', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    const slow = deferred<Page>();
    pageMock.mockClear();
    pageMock.mockImplementationOnce(() => slow.promise);

    await fireSentinel(observer, 3);

    expect(pageMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      slow.resolve({ items: range(21, 40), hasMore: true });
    });
    await waitFor(() => expect(renderedIds()).toHaveLength(40));
  });

  it('does not repeat a conversation that moved across a batch boundary', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    pageMock.mockImplementationOnce(async () => ({
      items: [conversation(20), ...range(21, 39)],
      hasMore: true,
    }));

    await fireSentinel(observer);

    await waitFor(() => expect(renderedIds()).toHaveLength(39));
    expect(renderedIds()).toEqual(range(1, 39).map((item) => item.id));
  });

  it('keeps the list sorted when a later batch holds a conversation newer than the loaded ones', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    pageMock.mockImplementationOnce(async () => ({
      items: [
        conversation(30, { last_message_at: new Date(BASE_TIME + 60_000).toISOString() }),
        ...range(21, 39).filter((item) => item.id !== 30),
      ],
      hasMore: true,
    }));

    await fireSentinel(observer);

    await waitFor(() => expect(renderedIds()).toHaveLength(39));
    expect(renderedIds()[0]).toBe(30);
  });

  it('keeps the loaded batches when the list refreshes', async () => {
    fakeServer({ messages: range(1, 100) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(40));
    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(60));
    pageMock.mockClear();

    act(() => {
      requestConversationsRefresh();
    });

    await waitFor(() =>
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 1, pageSize: 60 }),
    );
    await waitFor(() => expect(pageMock).toHaveBeenCalledTimes(1));
    expect(renderedIds()).toHaveLength(60);
  });

  it('shows changes from the server in the loaded part of the list after a refresh', async () => {
    const lists = fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(40));

    lists.messages = [
      conversation(30, { last_message_preview: 'Čerstvá správa', last_message_at: new Date(BASE_TIME + 60_000).toISOString() }),
      ...lists.messages.filter((item) => item.id !== 30),
    ];
    act(() => {
      requestConversationsRefresh();
    });

    expect(await screen.findByText('Čerstvá správa')).toBeInTheDocument();
    expect(renderedIds()[0]).toBe(30);
    expect(renderedIds()).toHaveLength(40);
  });

  it('continues after a refresh with the batch that follows the loaded ones', async () => {
    fakeServer({ messages: range(1, 100) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(40));
    act(() => {
      requestConversationsRefresh();
    });
    await waitFor(() =>
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 1, pageSize: 40 }),
    );
    await waitFor(() => expect(observer.count()).toBe(1));
    pageMock.mockClear();

    await fireSentinel(observer);

    await waitFor(() => expect(renderedIds()).toHaveLength(60));
    expect(pageMock).toHaveBeenLastCalledWith({ tab: 'messages', search: '', page: 3, pageSize: 20 });
  });

  it('pages through search results and starts over for a new search', async () => {
    jest.useFakeTimers();
    const matching = Array.from({ length: 30 }, (_, index) =>
      conversation(100 + index, { other_user: { id: 5000 + index, display_name: `Anna ${100 + index}` } }),
    );
    fakeServer({ messages: [...range(1, 25), ...matching] });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');

    fireEvent.change(screen.getByLabelText('Hľadať podľa mena...'), { target: { value: '  Anna ' } });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() =>
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: 'Anna', page: 1, pageSize: 20 }),
    );
    await waitFor(() => expect(screen.getByText('Anna 100')).toBeInTheDocument());
    expect(screen.queryByText('Osoba 1')).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Anna \d+$/)).toHaveLength(20);

    await fireSentinel(observer);

    await waitFor(() => expect(screen.getAllByText(/^Anna \d+$/)).toHaveLength(30));
    expect(pageMock).toHaveBeenLastCalledWith({ tab: 'messages', search: 'Anna', page: 2, pageSize: 20 });
  });

  it('does not touch the total unread badge while loading more', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await waitFor(() => expect(getUnreadMessagesSummary).toHaveBeenCalledTimes(1));

    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(40));

    expect(getUnreadMessagesSummary).toHaveBeenCalledTimes(1);
  });

  it('pages the requests tab separately from the messages tab', async () => {
    const requests = Array.from({ length: 25 }, (_, index) =>
      conversation(500 + index, {
        other_user: { id: 9000 + index, display_name: `Žiadateľ ${500 + index}` },
        message_request_role: 'recipient',
        request_status: 'pending',
      }),
    );
    fakeServer({ messages: range(1, 5), requests });
    render(<ConversationsList currentUserId={1} />);
    await screen.findByText('Osoba 1');
    await flush();
    expect(observer.count()).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: /Žiadosti/ }));

    await waitFor(() => expect(screen.getAllByText(/^Žiadateľ \d+$/)).toHaveLength(20));
    expect(pageMock).toHaveBeenCalledWith({ tab: 'requests', search: '', page: 1, pageSize: 20 });
    await waitFor(() => expect(observer.count()).toBe(1));

    await fireSentinel(observer);

    await waitFor(() => expect(screen.getAllByText(/^Žiadateľ \d+$/)).toHaveLength(25));
    expect(pageMock).toHaveBeenLastCalledWith({ tab: 'requests', search: '', page: 2, pageSize: 20 });
  });

  it('keeps the list and retries quietly when loading the next batch fails', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    jest.useFakeTimers();
    pageMock.mockRejectedValueOnce(new Error('network'));

    await fireSentinel(observer);
    await act(async () => {
      await Promise.resolve();
    });

    expect(renderedIds()).toHaveLength(20);
    expect(screen.queryAllByTestId('conversations-load-more-row')).toHaveLength(0);
    // Počas pauzy sa sentinel nesleduje, takže sa server nezahlcuje.
    expect(observer.count()).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    await waitFor(() => expect(observer.count()).toBe(1));
    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(40));
  });

  it('reloads the window after an unavailable conversation is removed', async () => {
    fakeServer({ messages: range(1, 100) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(40));
    pageMock.mockClear();

    act(() => {
      dispatchConversationUnavailable(3);
    });

    expect(screen.queryByText('Osoba 3')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 1, pageSize: 40 }),
    );
  });

  it('reloads the window after a conversation is pinned', async () => {
    fakeServer({ messages: range(1, 100) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await fireSentinel(observer);
    await waitFor(() => expect(renderedIds()).toHaveLength(40));
    pageMock.mockClear();

    fireEvent.click(screen.getByTestId('conversation-hover-action-30'));
    expect(await screen.findByTestId('conversation-actions-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('conversation-pin-action'));

    await waitFor(() => expect(updateConversationPinnedState).toHaveBeenCalledWith(30, true));
    // Pripnutá konverzácia sa na serveri posunie na začiatok, takže sa okno načíta znova.
    await waitFor(() =>
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 1, pageSize: 40 }),
    );
  });

  it('does not recompute the badge from a partly loaded list when a conversation disappears', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await flush();

    act(() => {
      dispatchConversationUnavailable(3);
    });

    expect(screen.queryByText('Osoba 3')).not.toBeInTheDocument();
    // Súčet zo 19 načítaných položiek by podcenil celkový počet; upraví ho obnova (súhrn zo servera).
    expect(syncMessageUnreadCountFromConversations).not.toHaveBeenCalled();
  });

  it('recomputes the badge from the list when everything is loaded and a conversation disappears', async () => {
    fakeServer({ messages: range(1, 7) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');
    await flush();

    act(() => {
      dispatchConversationUnavailable(3);
    });

    expect(syncMessageUnreadCountFromConversations).toHaveBeenCalledTimes(1);
    const remaining = (syncMessageUnreadCountFromConversations as jest.Mock).mock.calls[0][0];
    expect(remaining.map((item: ConversationListItem) => item.id)).toEqual([1, 2, 4, 5, 6, 7]);
  });

  it('does not recompute the badge from the search results when a conversation disappears', async () => {
    fakeServer({ messages: range(1, 45) });
    render(<ConversationsList currentUserId={1} variant="rail" />);
    await screen.findByText('Osoba 1');

    fireEvent.change(screen.getByLabelText('Hľadať podľa mena...'), { target: { value: 'Osoba 3' } });
    await waitFor(() =>
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: 'Osoba 3', page: 1, pageSize: 20 }),
    );
    await waitFor(() => expect(screen.queryByText('Osoba 1')).not.toBeInTheDocument());
    await flush();

    act(() => {
      dispatchConversationUnavailable(3);
    });

    expect(screen.queryByText('Osoba 3')).not.toBeInTheDocument();
    // Súčet z výsledkov hľadania je len ich časť, nie celkový počet neprečítaných.
    expect(syncMessageUnreadCountFromConversations).not.toHaveBeenCalled();
  });
});

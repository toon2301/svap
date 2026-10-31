import { act, renderHook } from '@testing-library/react';
import type { ConversationListItem } from './types';
import { listConversationsPage, type ConversationsTab } from './conversationsPagingApi';
import { useConversationsPaging } from './useConversationsPaging';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Server s `total` konverzáciami (id 1..total) stránkovaný ako Django `PageNumberPagination`. */
function fakeServer(total: number) {
  pageMock.mockImplementation(async ({ page, pageSize }: { page: number; pageSize: number }) => {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return { items: start <= total ? range(start, end) : [], hasMore: page * pageSize < total };
  });
}

type HookProps = { tab: ConversationsTab; search: string };

function setup(initial: HookProps = { tab: 'messages', search: '' }) {
  const onAppend = jest.fn();
  const view = renderHook((props: HookProps) => useConversationsPaging({ ...props, onAppend }), {
    initialProps: initial,
  });
  return { ...view, onAppend };
}

/** Načíta okno ako obnova zoznamu a zapíše ho (zodpovedá `refresh` v komponente). */
async function loadWindow(
  result: { current: ReturnType<typeof useConversationsPaging> },
  tab: ConversationsTab = 'messages',
  search = '',
) {
  let fetched!: Awaited<ReturnType<ReturnType<typeof useConversationsPaging>['fetchWindow']>>;
  await act(async () => {
    fetched = await result.current.fetchWindow(tab, search);
    fetched.commit();
  });
  return fetched;
}

describe('useConversationsPaging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('fetchWindow', () => {
    it('knows nothing about more conversations until a window is committed', () => {
      fakeServer(50);
      const { result } = setup();

      expect(result.current.hasMore).toBe(false);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.retryBlocked).toBe(false);
    });

    it('returns the first batch and reports more once committed', async () => {
      fakeServer(50);
      const { result } = setup();

      const fetched = await loadWindow(result);

      expect(fetched.items.map((item) => item.id)).toEqual(range(1, 20).map((item) => item.id));
      expect(result.current.hasMore).toBe(true);
    });

    it('does not change the paging state until the caller commits', async () => {
      fakeServer(50);
      const { result } = setup();

      await act(async () => {
        await result.current.fetchWindow('messages', '');
      });

      expect(result.current.hasMore).toBe(false);
    });

    it('reports no more when the list ends in the first batch', async () => {
      fakeServer(5);
      const { result } = setup();

      await loadWindow(result);

      expect(result.current.hasMore).toBe(false);
    });

    it('reloads every batch already loaded instead of cutting the list back to 20', async () => {
      fakeServer(100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        await result.current.loadMore();
      });
      expect(onAppend).toHaveBeenCalledTimes(2);
      pageMock.mockClear();

      const fetched = await loadWindow(result);

      expect(fetched.items).toHaveLength(60);
      expect(pageMock).toHaveBeenCalledTimes(1);
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 1, pageSize: 60 });
      expect(result.current.hasMore).toBe(true);
    });

    it('starts from the first batch again for another search', async () => {
      fakeServer(100);
      const { result } = setup();
      await loadWindow(result);
      await act(async () => {
        await result.current.loadMore();
      });
      pageMock.mockClear();

      await loadWindow(result, 'messages', 'jana');

      expect(pageMock).toHaveBeenCalledWith({
        tab: 'messages',
        search: 'jana',
        page: 1,
        pageSize: 20,
      });
    });

    it('keeps a separate window for each tab', async () => {
      fakeServer(100);
      const { result } = setup();
      await loadWindow(result, 'messages');
      await act(async () => {
        await result.current.loadMore();
      });
      pageMock.mockClear();

      await loadWindow(result, 'requests');
      expect(pageMock).toHaveBeenCalledWith({
        tab: 'requests',
        search: '',
        page: 1,
        pageSize: 20,
      });

      pageMock.mockClear();
      await loadWindow(result, 'messages');
      expect(pageMock).toHaveBeenCalledWith({
        tab: 'messages',
        search: '',
        page: 1,
        pageSize: 40,
      });
    });

    it('fetches the window again when another batch was loaded meanwhile', async () => {
      fakeServer(100);
      const { result } = setup();
      await loadWindow(result);
      pageMock.mockClear();

      const slow = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slow.promise);
      let pending!: Promise<{ items: ConversationListItem[]; commit: () => void }>;
      act(() => {
        pending = result.current.fetchWindow('messages', '');
      });
      await act(async () => {
        await result.current.loadMore();
      });
      expect(pageMock).toHaveBeenLastCalledWith({
        tab: 'messages',
        search: '',
        page: 2,
        pageSize: 20,
      });

      await act(async () => {
        slow.resolve({ items: range(1, 20), hasMore: true });
        const fetched = await pending;
        fetched.commit();
        expect(fetched.items).toHaveLength(40);
      });

      expect(pageMock).toHaveBeenLastCalledWith({
        tab: 'messages',
        search: '',
        page: 1,
        pageSize: 40,
      });
    });

    it('gives up refetching after two repeats and returns what it has', async () => {
      fakeServer(1000);
      const { result } = setup();
      await loadWindow(result);
      pageMock.mockClear();

      const windowSizes: number[] = [];
      pageMock.mockImplementation(async ({ page, pageSize }: { page: number; pageSize: number }) => {
        if (page === 1) {
          windowSizes.push(pageSize);
          // Každé načítanie okna sa „prekryje" s donačítaním ďalšej dávky.
          await act(async () => {
            await result.current.loadMore();
          });
        }
        return { items: range((page - 1) * pageSize + 1, page * pageSize), hasMore: true };
      });

      let fetched!: { items: ConversationListItem[]; commit: () => void };
      await act(async () => {
        fetched = await result.current.fetchWindow('messages', '');
      });

      // Prvé načítanie a dve opakovania so zväčšeným oknom, potom sa vráti posledný výsledok.
      expect(windowSizes).toEqual([20, 40, 60]);
      expect(fetched.items).toHaveLength(60);
    });
  });

  describe('loadMore', () => {
    it('loads the next batch of 20 and hands it to onAppend', async () => {
      fakeServer(50);
      const { result, onAppend } = setup();
      await loadWindow(result);
      pageMock.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 2, pageSize: 20 });
      expect(onAppend).toHaveBeenCalledTimes(1);
      const [tab, incoming] = onAppend.mock.calls[0];
      expect(tab).toBe('messages');
      expect(incoming.map((item: ConversationListItem) => item.id)).toEqual(
        range(21, 40).map((item) => item.id),
      );
      expect(result.current.hasMore).toBe(true);
    });

    it('keeps going batch after batch and stops at the end', async () => {
      fakeServer(45);
      const { result, onAppend } = setup();
      await loadWindow(result);

      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.hasMore).toBe(false);
      expect(onAppend).toHaveBeenCalledTimes(2);
      expect(onAppend.mock.calls[1][1]).toHaveLength(5);

      pageMock.mockClear();
      await act(async () => {
        await result.current.loadMore();
      });
      expect(pageMock).not.toHaveBeenCalled();
    });

    it('does nothing before the first window is loaded', async () => {
      fakeServer(50);
      const { result, onAppend } = setup();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(pageMock).not.toHaveBeenCalled();
      expect(onAppend).not.toHaveBeenCalled();
    });

    it('does nothing when there is nothing more to load', async () => {
      fakeServer(10);
      const { result, onAppend } = setup();
      await loadWindow(result);
      pageMock.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(pageMock).not.toHaveBeenCalled();
      expect(onAppend).not.toHaveBeenCalled();
    });

    it('ignores a second call while a batch is already loading', async () => {
      fakeServer(100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      pageMock.mockClear();
      const slow = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slow.promise);

      let first!: Promise<void>;
      act(() => {
        first = result.current.loadMore();
      });
      expect(result.current.loadingMore).toBe(true);
      await act(async () => {
        await result.current.loadMore();
      });
      expect(pageMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        slow.resolve({ items: range(21, 40), hasMore: true });
        await first;
      });
      expect(result.current.loadingMore).toBe(false);
      expect(onAppend).toHaveBeenCalledTimes(1);
    });

    it('uses the committed search for the next batch', async () => {
      fakeServer(100);
      const { result, rerender } = setup();
      rerender({ tab: 'messages', search: 'jana' });
      await loadWindow(result, 'messages', 'jana');
      pageMock.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(pageMock).toHaveBeenCalledWith({
        tab: 'messages',
        search: 'jana',
        page: 2,
        pageSize: 20,
      });
    });

    it('does not load more for a search whose first window is not loaded yet', async () => {
      fakeServer(100);
      const { result, rerender } = setup();
      await loadWindow(result, 'messages', '');
      pageMock.mockClear();

      rerender({ tab: 'messages', search: 'jana' });
      expect(result.current.hasMore).toBe(false);
      await act(async () => {
        await result.current.loadMore();
      });

      expect(pageMock).not.toHaveBeenCalled();
    });

    it('drops a batch that arrives after the search changed and its window was loaded', async () => {
      fakeServer(100);
      const { result, onAppend, rerender } = setup();
      await loadWindow(result, 'messages', '');
      pageMock.mockClear();
      const slow = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slow.promise);

      let pending!: Promise<void>;
      act(() => {
        pending = result.current.loadMore();
      });
      rerender({ tab: 'messages', search: 'jana' });
      await loadWindow(result, 'messages', 'jana');
      await act(async () => {
        slow.resolve({ items: range(21, 40), hasMore: true });
        await pending;
      });

      expect(onAppend).not.toHaveBeenCalled();
    });

    it('drops a batch that no longer follows the loaded window', async () => {
      fakeServer(100);
      const { result, onAppend } = setup();
      const staleWindow = await result.current.fetchWindow('messages', '');
      await loadWindow(result);
      await act(async () => {
        await result.current.loadMore();
      });
      expect(onAppend).toHaveBeenCalledTimes(1);
      pageMock.mockClear();
      const slow = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slow.promise);

      let pending!: Promise<void>;
      act(() => {
        pending = result.current.loadMore();
      });
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 3, pageSize: 20 });
      // Obnova skončila s oknom spred donačítania, takže zoznam je zasa na jednej dávke.
      act(() => {
        staleWindow.commit();
      });
      await act(async () => {
        slow.resolve({ items: range(41, 60), hasMore: true });
        await pending;
      });

      expect(onAppend).toHaveBeenCalledTimes(1);
    });

    it('appends to the tab it was started for', async () => {
      fakeServer(100);
      const { result, onAppend } = setup({ tab: 'requests', search: '' });
      await loadWindow(result, 'requests');

      await act(async () => {
        await result.current.loadMore();
      });

      expect(onAppend).toHaveBeenCalledWith('requests', expect.any(Array));
      expect(pageMock).toHaveBeenLastCalledWith({
        tab: 'requests',
        search: '',
        page: 2,
        pageSize: 20,
      });
    });
  });

  describe('loadMore on several tabs', () => {
    it('does not treat a batch loading on one tab as loading on the other', async () => {
      fakeServer(100);
      const { result, rerender, onAppend } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages');
      rerender({ tab: 'requests', search: '' });
      await loadWindow(result, 'requests');
      rerender({ tab: 'messages', search: '' });
      const slow = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slow.promise);

      let messagesBatch!: Promise<void>;
      act(() => {
        messagesBatch = result.current.loadMore();
      });
      expect(result.current.loadingMore).toBe(true);

      rerender({ tab: 'requests', search: '' });
      expect(result.current.loadingMore).toBe(false);
      pageMock.mockClear();
      await act(async () => {
        await result.current.loadMore();
      });
      expect(pageMock).toHaveBeenCalledWith({ tab: 'requests', search: '', page: 2, pageSize: 20 });
      expect(onAppend).toHaveBeenCalledWith('requests', expect.any(Array));

      rerender({ tab: 'messages', search: '' });
      expect(result.current.loadingMore).toBe(true);
      await act(async () => {
        slow.resolve({ items: range(21, 40), hasMore: true });
        await messagesBatch;
      });
      expect(result.current.loadingMore).toBe(false);
      expect(onAppend).toHaveBeenLastCalledWith('messages', expect.any(Array));
    });

    it('does not treat a batch loading for an old search as loading for the new one', async () => {
      fakeServer(100);
      const { result, rerender } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages', '');
      const slow = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slow.promise);
      let oldBatch!: Promise<void>;
      act(() => {
        oldBatch = result.current.loadMore();
      });
      expect(result.current.loadingMore).toBe(true);

      rerender({ tab: 'messages', search: 'jana' });
      await loadWindow(result, 'messages', 'jana');
      expect(result.current.loadingMore).toBe(false);
      pageMock.mockClear();
      await act(async () => {
        await result.current.loadMore();
      });
      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: 'jana', page: 2, pageSize: 20 });

      await act(async () => {
        slow.resolve({ items: range(21, 40), hasMore: true });
        await oldBatch;
      });
      expect(result.current.loadingMore).toBe(false);
    });

    it('does not let a late batch for an old search clear the loading flag of the newer one', async () => {
      fakeServer(100);
      const { result, rerender } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages', '');
      const slowOld = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slowOld.promise);
      let oldBatch!: Promise<void>;
      act(() => {
        oldBatch = result.current.loadMore();
      });
      rerender({ tab: 'messages', search: 'jana' });
      await loadWindow(result, 'messages', 'jana');
      const slowNew = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slowNew.promise);
      let newBatch!: Promise<void>;
      act(() => {
        newBatch = result.current.loadMore();
      });
      expect(result.current.loadingMore).toBe(true);

      await act(async () => {
        slowOld.resolve({ items: range(21, 40), hasMore: true });
        await oldBatch;
      });
      expect(result.current.loadingMore).toBe(true);

      await act(async () => {
        slowNew.resolve({ items: range(21, 40), hasMore: true });
        await newBatch;
      });
      expect(result.current.loadingMore).toBe(false);
    });
  });

  describe('isFullyLoaded', () => {
    it('is false before any window is committed', () => {
      fakeServer(5);
      const { result } = setup();

      expect(result.current.isFullyLoaded('messages', '')).toBe(false);
    });

    it('is true once a window without more conversations is committed', async () => {
      fakeServer(5);
      const { result } = setup();

      await loadWindow(result, 'messages', '');

      expect(result.current.isFullyLoaded('messages', '')).toBe(true);
    });

    it('is false while the committed window has more behind it', async () => {
      fakeServer(50);
      const { result } = setup();

      await loadWindow(result, 'messages', '');

      expect(result.current.isFullyLoaded('messages', '')).toBe(false);
    });

    it('is false for a search other than the committed one', async () => {
      fakeServer(5);
      const { result } = setup();

      await loadWindow(result, 'messages', 'jana');

      expect(result.current.isFullyLoaded('messages', '')).toBe(false);
      expect(result.current.isFullyLoaded('messages', 'jana')).toBe(true);
    });

    it('answers for the asked tab, not for the active one', async () => {
      fakeServer(5);
      const { result } = setup({ tab: 'requests', search: '' });

      await loadWindow(result, 'messages', '');

      expect(result.current.isFullyLoaded('messages', '')).toBe(true);
      expect(result.current.isFullyLoaded('requests', '')).toBe(false);
    });

    it('turns false again when a later window reports more conversations', async () => {
      fakeServer(5);
      const { result } = setup();
      await loadWindow(result, 'messages', '');
      expect(result.current.isFullyLoaded('messages', '')).toBe(true);

      fakeServer(50);
      await loadWindow(result, 'messages', '');

      expect(result.current.isFullyLoaded('messages', '')).toBe(false);
    });

    it('is false for a tab whose window was never committed even if another one is complete', async () => {
      fakeServer(5);
      const { result } = setup();
      await loadWindow(result, 'messages', '');

      expect(result.current.isFullyLoaded('requests', '')).toBe(false);
    });
  });

  describe('failed loadMore', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    async function failOnce(result: { current: ReturnType<typeof useConversationsPaging> }) {
      pageMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        await result.current.loadMore();
      });
    }

    it('blocks further attempts for five seconds and appends nothing', async () => {
      fakeServer(100);
      const { result, onAppend } = setup();
      await loadWindow(result);

      await failOnce(result);

      expect(result.current.retryBlocked).toBe(true);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.hasMore).toBe(true);
      expect(onAppend).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(4_999);
      });
      expect(result.current.retryBlocked).toBe(true);
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.retryBlocked).toBe(false);
    });

    it('doubles the pause with every consecutive failure up to a minute', async () => {
      fakeServer(100);
      const { result } = setup();
      await loadWindow(result);
      const expected = [5_000, 10_000, 20_000, 40_000, 60_000, 60_000];

      for (const delay of expected) {
        await failOnce(result);
        expect(result.current.retryBlocked).toBe(true);
        act(() => {
          jest.advanceTimersByTime(delay - 1);
        });
        expect(result.current.retryBlocked).toBe(true);
        act(() => {
          jest.advanceTimersByTime(1);
        });
        expect(result.current.retryBlocked).toBe(false);
      }
    });

    it('starts again from five seconds after a successful batch', async () => {
      fakeServer(100);
      const { result } = setup();
      await loadWindow(result);
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(10_000);
      });

      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.retryBlocked).toBe(false);

      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(result.current.retryBlocked).toBe(false);
    });

    it('can load the same batch again once the pause is over', async () => {
      fakeServer(100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      pageMock.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(pageMock).toHaveBeenCalledWith({ tab: 'messages', search: '', page: 2, pageSize: 20 });
      expect(onAppend).toHaveBeenCalledTimes(1);
    });

    it('does not carry the pause of one tab over to the other', async () => {
      fakeServer(100);
      const { result, rerender, onAppend } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages');
      rerender({ tab: 'requests', search: '' });
      await loadWindow(result, 'requests');
      rerender({ tab: 'messages', search: '' });
      await failOnce(result);
      expect(result.current.retryBlocked).toBe(true);

      rerender({ tab: 'requests', search: '' });
      expect(result.current.retryBlocked).toBe(false);
      expect(result.current.hasMore).toBe(true);
      await act(async () => {
        await result.current.loadMore();
      });
      expect(onAppend).toHaveBeenCalledWith('requests', expect.any(Array));

      rerender({ tab: 'messages', search: '' });
      expect(result.current.retryBlocked).toBe(true);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(result.current.retryBlocked).toBe(false);
    });

    it('keeps a separate backoff for each tab', async () => {
      fakeServer(100);
      const { result, rerender } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages');
      rerender({ tab: 'requests', search: '' });
      await loadWindow(result, 'requests');

      rerender({ tab: 'messages', search: '' });
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(10_000);
      });

      // Prvé zlyhanie druhej záložky čaká len základných 5 s, nie 20 s po dvoch zlyhaniach prvej.
      rerender({ tab: 'requests', search: '' });
      await failOnce(result);
      expect(result.current.retryBlocked).toBe(true);
      act(() => {
        jest.advanceTimersByTime(4_999);
      });
      expect(result.current.retryBlocked).toBe(true);
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.retryBlocked).toBe(false);

      // Tretie zlyhanie prvej záložky pokračuje v jej vlastnom počítadle: 20 s.
      rerender({ tab: 'messages', search: '' });
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(19_999);
      });
      expect(result.current.retryBlocked).toBe(true);
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.retryBlocked).toBe(false);
    });

    it('does not reset the failure counter of one tab when the other one succeeds', async () => {
      fakeServer(100);
      const { result, rerender } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages');
      rerender({ tab: 'requests', search: '' });
      await loadWindow(result, 'requests');
      rerender({ tab: 'messages', search: '' });
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });

      rerender({ tab: 'requests', search: '' });
      await act(async () => {
        await result.current.loadMore();
      });

      rerender({ tab: 'messages', search: '' });
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(9_999);
      });
      expect(result.current.retryBlocked).toBe(true);
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.retryBlocked).toBe(false);
    });

    it('lets each tab release its own pause on time', async () => {
      fakeServer(100);
      const { result, rerender } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages');
      rerender({ tab: 'requests', search: '' });
      await loadWindow(result, 'requests');

      rerender({ tab: 'messages', search: '' });
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      rerender({ tab: 'requests', search: '' });
      await failOnce(result);

      act(() => {
        jest.advanceTimersByTime(3_000);
      });
      // Po 5 s od prvého zlyhania je záložka správ voľná, žiadosti čakajú ešte 2 s.
      rerender({ tab: 'messages', search: '' });
      expect(result.current.retryBlocked).toBe(false);
      rerender({ tab: 'requests', search: '' });
      expect(result.current.retryBlocked).toBe(true);
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      expect(result.current.retryBlocked).toBe(false);
    });

    it('forgets the pause for another search', async () => {
      fakeServer(100);
      const { result, rerender } = setup({ tab: 'messages', search: 'jana' });
      await loadWindow(result, 'messages', 'jana');
      await failOnce(result);
      await failOnce(result);
      expect(result.current.retryBlocked).toBe(true);

      rerender({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages', '');
      expect(result.current.retryBlocked).toBe(false);

      // Nové hľadanie začína znova od základnej pauzy.
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(result.current.retryBlocked).toBe(false);
    });

    it('ignores the late failure of a batch started for an older search', async () => {
      fakeServer(100);
      const { result, rerender } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages', '');
      const slowOld = deferred<{ items: ConversationListItem[]; hasMore: boolean }>();
      pageMock.mockImplementationOnce(() => slowOld.promise);
      let oldBatch!: Promise<void>;
      act(() => {
        oldBatch = result.current.loadMore();
      });
      rerender({ tab: 'messages', search: 'jana' });
      await loadWindow(result, 'messages', 'jana');
      await failOnce(result);
      expect(result.current.retryBlocked).toBe(true);
      expect(jest.getTimerCount()).toBe(1);

      await act(async () => {
        slowOld.reject(new Error('network'));
        await oldBatch;
      });

      // Pauza aktuálneho hľadania ostala, nenahradila ju pauza starého.
      expect(result.current.retryBlocked).toBe(true);
      expect(jest.getTimerCount()).toBe(1);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(result.current.retryBlocked).toBe(false);
      // Počítadlo zlyhaní sa nestratilo: druhé zlyhanie čaká 10 s.
      await failOnce(result);
      act(() => {
        jest.advanceTimersByTime(9_999);
      });
      expect(result.current.retryBlocked).toBe(true);
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.retryBlocked).toBe(false);
    });

    it('keeps a single pause timer per tab when failures follow each other', async () => {
      fakeServer(100);
      const { result } = setup();
      await loadWindow(result);

      await failOnce(result);
      await failOnce(result);

      expect(jest.getTimerCount()).toBe(1);
    });

    it('drops the pending pause timer when a later batch succeeds', async () => {
      fakeServer(100);
      const { result } = setup();
      await loadWindow(result);
      await failOnce(result);
      expect(jest.getTimerCount()).toBe(1);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(jest.getTimerCount()).toBe(0);
    });

    it('clears the pause timers of both tabs on unmount', async () => {
      fakeServer(100);
      const { result, rerender, unmount } = setup({ tab: 'messages', search: '' });
      await loadWindow(result, 'messages');
      rerender({ tab: 'requests', search: '' });
      await loadWindow(result, 'requests');
      await failOnce(result);
      rerender({ tab: 'messages', search: '' });
      await failOnce(result);
      expect(jest.getTimerCount()).toBe(2);

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('clears the pause timer on unmount', async () => {
      fakeServer(100);
      const { result, unmount } = setup();
      await loadWindow(result);
      await failOnce(result);

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

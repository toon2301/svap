import { act, renderHook } from '@testing-library/react';

import { listNotificationsPage, type NotificationsPage } from '../notificationsApi';
import { deferred, fakeServer, range, serverPage } from '../notificationsFeedTestUtils';
import { useNotificationsPaging } from '../useNotificationsPaging';

jest.mock('../notificationsApi', () => ({
  __esModule: true,
  listNotificationsPage: jest.fn(),
}));

const listMock = listNotificationsPage as jest.Mock;
const ids = (items: Array<{ id: number }>) => items.map((item) => item.id);

function setup() {
  const onAppend = jest.fn();
  const view = renderHook(() => useNotificationsPaging({ onAppend }));
  return { ...view, onAppend };
}

type Hook = ReturnType<typeof useNotificationsPaging>;

type Fetched = NonNullable<Awaited<ReturnType<Hook['fetchWindow']>>>;

/** Načíta okno ako obnova zoznamu a zapíše ho (zodpovedá obnove vo feede). */
async function loadWindow(result: { current: Hook }): Promise<Fetched> {
  let fetched: Fetched | null = null;
  await act(async () => {
    fetched = await result.current.fetchWindow();
    fetched?.commit();
  });
  if (!fetched) throw new Error('the window should have been fetched');
  return fetched;
}

describe('useNotificationsPaging', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  describe('fetchWindow', () => {
    it('knows nothing about more notifications until a window is committed', () => {
      fakeServer(listMock, 50);
      const { result } = setup();

      expect(result.current.hasMore).toBe(false);
      expect(result.current.loadingMore).toBe(false);
    });

    it('returns the first batch and reports more once committed', async () => {
      fakeServer(listMock, 50);
      const { result } = setup();

      const fetched = await loadWindow(result);

      expect(ids(fetched.items)).toEqual(ids(range(1, 15)));
      expect(result.current.hasMore).toBe(true);
    });

    it('does not change the paging state until the caller commits', async () => {
      fakeServer(listMock, 50);
      const { result } = setup();

      await act(async () => {
        await result.current.fetchWindow();
      });

      expect(result.current.hasMore).toBe(false);
    });

    it('reports no more when the list ends in the first batch', async () => {
      fakeServer(listMock, 5);
      const { result } = setup();

      await loadWindow(result);

      expect(result.current.hasMore).toBe(false);
    });

    it('reloads every batch already loaded instead of cutting the list back to 15', async () => {
      fakeServer(listMock, 100);
      const { result } = setup();
      await loadWindow(result);
      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        await result.current.loadMore();
      });
      listMock.mockClear();

      const fetched = await loadWindow(result);

      expect(fetched.items).toHaveLength(45);
      expect(listMock).toHaveBeenCalledTimes(1);
      expect(listMock).toHaveBeenCalledWith(1, 45);
      expect(result.current.hasMore).toBe(true);
    });

    it('fetches the window again when another batch was loaded meanwhile', async () => {
      fakeServer(listMock, 100);
      const { result } = setup();
      await loadWindow(result);
      listMock.mockClear();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);

      let pending!: Promise<Fetched | null>;
      act(() => {
        pending = result.current.fetchWindow();
      });
      await act(async () => {
        await result.current.loadMore();
      });
      expect(listMock).toHaveBeenLastCalledWith(2, 15);

      await act(async () => {
        slow.resolve(serverPage(100, 1, 15));
        const fetched = await pending;
        fetched?.commit();
        expect(fetched?.items).toHaveLength(30);
      });

      expect(listMock).toHaveBeenLastCalledWith(1, 30);
    });

    it('returns nothing after two repeats instead of a window smaller than what is shown', async () => {
      fakeServer(listMock, 1000);
      const { result } = setup();
      await loadWindow(result);
      listMock.mockClear();

      const windowSizes: number[] = [];
      listMock.mockImplementation(async (page: number, pageSize: number) => {
        if (page === 1) {
          windowSizes.push(pageSize);
          // Každé načítanie okna sa „prekryje“ s donačítaním ďalšej dávky.
          await act(async () => {
            await result.current.loadMore();
          });
        }
        return serverPage(1000, page, pageSize);
      });

      let fetched: Fetched | null | undefined;
      await act(async () => {
        fetched = await result.current.fetchWindow();
      });

      expect(windowSizes).toEqual([15, 30, 45]);
      expect(fetched).toBeNull();
      // Tri donačítané dávky ostávajú a ďalšia sa dá dotiahnuť od 4. dávky.
      listMock.mockClear();
      await act(async () => {
        await result.current.loadMore();
      });
      expect(listMock).toHaveBeenCalledWith(5, 15);
    });
  });

  describe('loadMore', () => {
    it('loads the next batch of 15 and hands it to onAppend', async () => {
      fakeServer(listMock, 50);
      const { result, onAppend } = setup();
      await loadWindow(result);
      listMock.mockClear();

      let outcome = '';
      await act(async () => {
        outcome = await result.current.loadMore();
      });

      expect(outcome).toBe('loaded');
      expect(listMock).toHaveBeenCalledWith(2, 15);
      expect(onAppend).toHaveBeenCalledTimes(1);
      expect(ids(onAppend.mock.calls[0][0])).toEqual(ids(range(16, 30)));
      expect(result.current.hasMore).toBe(true);
    });

    it('keeps going batch after batch and stops at the end', async () => {
      fakeServer(listMock, 40);
      const { result, onAppend } = setup();
      await loadWindow(result);

      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.hasMore).toBe(false);
      expect(onAppend.mock.calls[1][0]).toHaveLength(10);
      listMock.mockClear();
      let outcome = '';
      await act(async () => {
        outcome = await result.current.loadMore();
      });
      expect(outcome).toBe('skipped');
      expect(listMock).not.toHaveBeenCalled();
    });

    it('is skipped before the first window is loaded', async () => {
      fakeServer(listMock, 50);
      const { result, onAppend } = setup();

      let outcome = '';
      await act(async () => {
        outcome = await result.current.loadMore();
      });

      expect(outcome).toBe('skipped');
      expect(listMock).not.toHaveBeenCalled();
      expect(onAppend).not.toHaveBeenCalled();
    });

    it('ignores a second call while a batch is already loading', async () => {
      fakeServer(listMock, 100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      listMock.mockClear();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);

      let first!: Promise<string>;
      act(() => {
        first = result.current.loadMore();
      });
      expect(result.current.loadingMore).toBe(true);
      let second = '';
      await act(async () => {
        second = await result.current.loadMore();
      });
      expect(second).toBe('skipped');
      expect(listMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        slow.resolve(serverPage(100, 2, 15));
        await first;
      });
      expect(result.current.loadingMore).toBe(false);
      expect(onAppend).toHaveBeenCalledTimes(1);
    });

    it('reports a failure and keeps the loaded window', async () => {
      fakeServer(listMock, 100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      listMock.mockRejectedValueOnce(new Error('network'));

      let outcome = '';
      await act(async () => {
        outcome = await result.current.loadMore();
      });

      expect(outcome).toBe('failed');
      expect(result.current.hasMore).toBe(true);
      expect(result.current.loadingMore).toBe(false);
      expect(onAppend).not.toHaveBeenCalled();
    });

    it('can load the same batch again after a failure', async () => {
      fakeServer(listMock, 100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      listMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        await result.current.loadMore();
      });
      listMock.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(listMock).toHaveBeenCalledWith(2, 15);
      expect(onAppend).toHaveBeenCalledTimes(1);
    });

    it('asks for the batch again when a refresh replaced the window while it was loading', async () => {
      fakeServer(listMock, 100);
      const { result, onAppend } = setup();
      const staleWindow = await result.current.fetchWindow();
      await loadWindow(result);
      await act(async () => {
        await result.current.loadMore();
      });
      expect(onAppend).toHaveBeenCalledTimes(1);
      listMock.mockClear();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);

      let pending!: Promise<string>;
      act(() => {
        pending = result.current.loadMore();
      });
      expect(listMock).toHaveBeenCalledWith(3, 15);
      // Obnova skončila s oknom spred donačítania, takže zoznam je zasa na jednej dávke.
      act(() => {
        staleWindow?.commit();
      });
      let outcome = '';
      await act(async () => {
        slow.resolve(serverPage(100, 3, 15));
        outcome = await pending;
      });

      // Dávka č. 3 na jednu dávku nenadväzuje, preto sa nepripojila; namiesto nej prišla č. 2.
      expect(outcome).toBe('loaded');
      expect(listMock).toHaveBeenLastCalledWith(2, 15);
      expect(onAppend).toHaveBeenCalledTimes(2);
      expect(ids(onAppend.mock.calls[1][0])).toEqual(ids(range(16, 30)));
    });

    it('does not append a batch fetched before a refresh even when the window kept its size', async () => {
      fakeServer(listMock, 100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      // Obnova zapíše okno rovnakej veľkosti (1 dávka), no s novým obsahom.
      const refreshed = await result.current.fetchWindow();
      listMock.mockClear();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);
      // Po vložení nového upozornenia sa všetko posunulo o jedno: stránka 2 začína o id skôr.
      listMock.mockImplementationOnce(async () => ({
        ...serverPage(100, 2, 15),
        results: range(15, 29),
      }));

      let pending!: Promise<string>;
      act(() => {
        pending = result.current.loadMore();
      });
      act(() => {
        refreshed?.commit();
      });
      let outcome = '';
      await act(async () => {
        slow.resolve(serverPage(100, 2, 15));
        outcome = await pending;
      });

      expect(outcome).toBe('loaded');
      expect(listMock).toHaveBeenCalledTimes(2);
      expect(onAppend).toHaveBeenCalledTimes(1);
      // Z odpovede spred obnovy (16..30) by v zozname chýbalo id 15.
      expect(ids(onAppend.mock.calls[0][0])).toEqual(ids(range(15, 29)));
    });

    it('gives up and skips the batch when refreshes keep replacing the window', async () => {
      fakeServer(listMock, 100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      const refreshed = await result.current.fetchWindow();
      listMock.mockClear();
      listMock.mockImplementation(async (page: number, pageSize: number) => {
        refreshed?.commit();
        return serverPage(100, page, pageSize);
      });

      let outcome = '';
      await act(async () => {
        outcome = await result.current.loadMore();
      });

      expect(outcome).toBe('skipped');
      expect(listMock).toHaveBeenCalledTimes(3);
      expect(onAppend).not.toHaveBeenCalled();
      expect(result.current.loadingMore).toBe(false);
    });

    it('does not ask again when the refresh found nothing more to load', async () => {
      fakeServer(listMock, 100);
      const { result, onAppend } = setup();
      await loadWindow(result);
      fakeServer(listMock, 10);
      const shortWindow = await result.current.fetchWindow();
      expect(shortWindow).not.toBeNull();
      fakeServer(listMock, 100);
      listMock.mockClear();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);

      let pending!: Promise<string>;
      act(() => {
        pending = result.current.loadMore();
      });
      act(() => {
        shortWindow?.commit();
      });
      let outcome = '';
      await act(async () => {
        slow.resolve(serverPage(100, 2, 15));
        outcome = await pending;
      });

      expect(outcome).toBe('skipped');
      expect(listMock).toHaveBeenCalledTimes(1);
      expect(onAppend).not.toHaveBeenCalled();
      expect(result.current.hasMore).toBe(false);
    });

    it('reports no more when the list shrank meanwhile and the server answers with the last page', async () => {
      fakeServer(listMock, 100);
      const { result } = setup();
      await loadWindow(result);
      // Zoznam sa medzitým skrátil: server na stránku 2 odpovie poslednou stránkou (1 z 1).
      listMock.mockResolvedValueOnce({ ...serverPage(10, 2, 15), page: 1 });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.hasMore).toBe(false);
    });
  });
});

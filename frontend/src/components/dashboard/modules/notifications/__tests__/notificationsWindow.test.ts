import { listNotificationsPage, type NotificationsPage } from '../notificationsApi';
import {
  deferred,
  fakeServer,
  notification,
  range,
  serverPage,
} from '../notificationsFeedTestUtils';
import {
  appendUniqueNotifications,
  fetchNotificationsWindow,
  NOTIFICATIONS_BATCH_SIZE,
  NOTIFICATIONS_MAX_PAGE_SIZE,
  notificationsWindowRequests,
} from '../notificationsWindow';

jest.mock('../notificationsApi', () => ({
  __esModule: true,
  listNotificationsPage: jest.fn(),
}));

const listMock = listNotificationsPage as jest.Mock;

const ids = (items: Array<{ id: number }>) => items.map((item) => item.id);

describe('notificationsWindowRequests', () => {
  it('keeps the batch size in line with the server limit', () => {
    expect(NOTIFICATIONS_BATCH_SIZE).toBe(15);
    expect(NOTIFICATIONS_MAX_PAGE_SIZE).toBe(50);
  });

  it.each([
    [1, 15],
    [2, 30],
    [3, 45],
  ])(
    'loads %i batches with one request of %i while it fits the server limit',
    (pageCount, size) => {
      expect(notificationsWindowRequests(pageCount)).toEqual([{ page: 1, pageSize: size }]);
    },
  );

  it('splits a window above the server limit into pages of 45 (three whole batches)', () => {
    expect(notificationsWindowRequests(4)).toEqual([
      { page: 1, pageSize: 45 },
      { page: 2, pageSize: 45 },
    ]);
    expect(notificationsWindowRequests(7)).toEqual([
      { page: 1, pageSize: 45 },
      { page: 2, pageSize: 45 },
      { page: 3, pageSize: 45 },
    ]);
  });

  it('does not add an empty page when the window is an exact multiple of 45', () => {
    expect(notificationsWindowRequests(6)).toEqual([
      { page: 1, pageSize: 45 },
      { page: 2, pageSize: 45 },
    ]);
  });

  it('never asks for less than one batch and rounds a fractional count down', () => {
    expect(notificationsWindowRequests(0)).toEqual([{ page: 1, pageSize: 15 }]);
    expect(notificationsWindowRequests(-2)).toEqual([{ page: 1, pageSize: 15 }]);
    expect(notificationsWindowRequests(2.9)).toEqual([{ page: 1, pageSize: 30 }]);
  });
});

describe('appendUniqueNotifications', () => {
  it('appends new notifications at the end in order', () => {
    expect(ids(appendUniqueNotifications(range(1, 3), range(4, 5)))).toEqual([1, 2, 3, 4, 5]);
  });

  it('drops notifications already in the list and keeps the first occurrence', () => {
    const current = [notification(3, { title: 'starý' })];
    const incoming = [notification(3, { title: 'nový' }), notification(4)];

    const result = appendUniqueNotifications(current, incoming);

    expect(ids(result)).toEqual([3, 4]);
    expect(result[0].title).toBe('starý');
  });

  it('drops duplicates inside the incoming batch itself', () => {
    expect(ids(appendUniqueNotifications(range(1, 1), [notification(2), notification(2)]))).toEqual(
      [1, 2],
    );
  });

  it('returns the very same array when nothing new arrives', () => {
    const current = range(1, 3);

    expect(appendUniqueNotifications(current, range(2, 3))).toBe(current);
    expect(appendUniqueNotifications(current, [])).toBe(current);
  });

  it('does not mutate its inputs', () => {
    const current = range(1, 2);
    const incoming = range(2, 3);

    appendUniqueNotifications(current, incoming);

    expect(ids(current)).toEqual([1, 2]);
    expect(ids(incoming)).toEqual([2, 3]);
  });
});

describe('fetchNotificationsWindow', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('loads the first batch and reports that more follow', async () => {
    fakeServer(listMock, 40);

    const result = await fetchNotificationsWindow(1);

    expect(ids(result.items)).toEqual(ids(range(1, 15)));
    expect(result.hasMore).toBe(true);
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith(1, 15);
  });

  it('reports no more when the whole list fits the first batch', async () => {
    fakeServer(listMock, 7);

    const result = await fetchNotificationsWindow(1);

    expect(result.items).toHaveLength(7);
    expect(result.hasMore).toBe(false);
  });

  it('reports no more for an empty list', async () => {
    fakeServer(listMock, 0);

    expect(await fetchNotificationsWindow(1)).toEqual({
      items: [],
      hasMore: false,
    });
  });

  it('reloads several batches with a single request', async () => {
    fakeServer(listMock, 100);

    const result = await fetchNotificationsWindow(3);

    expect(result.items).toHaveLength(45);
    expect(result.hasMore).toBe(true);
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith(1, 45);
  });

  it('reports the end when the window reaches the last notification exactly', async () => {
    fakeServer(listMock, 45);

    const result = await fetchNotificationsWindow(3);

    expect(result.items).toHaveLength(45);
    expect(result.hasMore).toBe(false);
  });

  it('collects a window above the server limit from pages of 45 and trims it to the window', async () => {
    fakeServer(listMock, 300);

    const result = await fetchNotificationsWindow(4);

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock).toHaveBeenNthCalledWith(1, 1, 45);
    expect(listMock).toHaveBeenNthCalledWith(2, 2, 45);
    expect(ids(result.items)).toEqual(ids(range(1, 60)));
    expect(result.hasMore).toBe(true);
  });

  it('reports the end of a big window when the list ends inside it', async () => {
    fakeServer(listMock, 70);

    const result = await fetchNotificationsWindow(6);

    expect(result.items).toHaveLength(70);
    expect(result.hasMore).toBe(false);
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it('reports more when the last page overshoots the window even though the server has no next page', async () => {
    // 90 upozornení a okno 4 dávok (60): druhá stránka je posledná, no v zozname je za oknom ešte 30.
    fakeServer(listMock, 90);

    const result = await fetchNotificationsWindow(4);

    expect(result.items).toHaveLength(60);
    expect(result.hasMore).toBe(true);
  });

  it('stops asking as soon as the server says there is no next page', async () => {
    fakeServer(listMock, 30);

    await fetchNotificationsWindow(10);

    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('does not count the last page twice when the list shrank and the server answers with it again', async () => {
    // Zoznam mal 100 upozornení (3 stránky po 45), no kým prišla druhá požiadavka, skrátil sa na 45:
    // server na stránku 2 odpovie poslednou stránkou, teda tou istou ako prvá.
    listMock
      .mockResolvedValueOnce(serverPage(100, 1, 45))
      .mockResolvedValueOnce(serverPage(45, 2, 45));

    const result = await fetchNotificationsWindow(6);

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(ids(result.items)).toEqual(ids(range(1, 45)));
    expect(result.hasMore).toBe(false);
  });

  it('lets errors through to the caller', async () => {
    listMock.mockRejectedValue(new Error('network'));

    await expect(fetchNotificationsWindow(1)).rejects.toThrow('network');
  });

  it('fails the whole window when a later page fails instead of returning part of it', async () => {
    listMock
      .mockResolvedValueOnce(serverPage(300, 1, 45))
      .mockRejectedValueOnce(new Error('network'));

    await expect(fetchNotificationsWindow(4)).rejects.toThrow('network');
  });

  it('asks for nothing else when the first page fails', async () => {
    listMock.mockRejectedValueOnce(new Error('network'));

    await expect(fetchNotificationsWindow(10)).rejects.toThrow('network');

    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('requests the pages after the first one together, not one after another', async () => {
    // 10 dávok = 150 upozornení = 4 stránky po 45.
    const pending = [2, 3, 4].map(() => deferred<NotificationsPage>());
    listMock.mockResolvedValueOnce(serverPage(300, 1, 45));
    pending.forEach((request) => listMock.mockImplementationOnce(() => request.promise));

    const result = fetchNotificationsWindow(10);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Kým nedorazila ani jedna z nich, všetky tri už boli vyžiadané.
    expect(listMock.mock.calls).toEqual([
      [1, 45],
      [2, 45],
      [3, 45],
      [4, 45],
    ]);
    // Odpovede dorazia v ľubovoľnom poradí, zoznam ostáva podľa stránok.
    pending[2].resolve(serverPage(300, 4, 45));
    pending[0].resolve(serverPage(300, 2, 45));
    pending[1].resolve(serverPage(300, 3, 45));
    const window = await result;

    expect(ids(window.items)).toEqual(ids(range(1, 150)));
    expect(window.hasMore).toBe(true);
  });

  it('does not ask for pages beyond the last one the first answer announced', async () => {
    fakeServer(listMock, 100);

    await fetchNotificationsWindow(10);

    // 100 upozornení sú 3 stránky po 45; štvrtá sa nežiada.
    expect(listMock.mock.calls.map(([page]) => page)).toEqual([1, 2, 3]);
  });

  describe('when the list shifts between the requests of a big window', () => {
    it('drops the repeated notification and keeps every notification once', async () => {
      // Medzi požiadavkami prišlo jedno nové upozornenie: druhá stránka začína posledným z prvej.
      listMock.mockResolvedValueOnce(serverPage(300, 1, 45)).mockResolvedValueOnce({
        ...serverPage(300, 2, 45),
        results: range(45, 89),
      });

      const result = await fetchNotificationsWindow(4);

      expect(ids(result.items)).toEqual(ids(range(1, 60)));
      expect(new Set(ids(result.items)).size).toBe(result.items.length);
      expect(result.hasMore).toBe(true);
    });

    it('reports the end by unique notifications, not by the repeated ones', async () => {
      listMock.mockResolvedValueOnce({ ...serverPage(105, 1, 45) }).mockResolvedValueOnce({
        ...serverPage(105, 2, 45),
        results: range(45, 90),
        totalPages: 2,
      });

      const result = await fetchNotificationsWindow(6);

      expect(result.items).toHaveLength(90);
      expect(result.hasMore).toBe(false);
    });

    it('keeps the first occurrence of a repeated notification', async () => {
      listMock
        .mockResolvedValueOnce({
          ...serverPage(300, 1, 45),
          results: [...range(1, 44), notification(45, { title: 'starší stav' })],
        })
        .mockResolvedValueOnce({
          ...serverPage(300, 2, 45),
          results: [notification(45, { title: 'novší stav' }), ...range(46, 89)],
        });

      const result = await fetchNotificationsWindow(4);

      expect(result.items.filter((item) => item.id === 45)).toHaveLength(1);
      expect(result.items.find((item) => item.id === 45)?.title).toBe('starší stav');
    });
  });
});

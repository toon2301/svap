/**
 * Pomocníci pre testy zoznamu upozornení.
 *
 * Jest ich nezbiera ako testy (nie sú v `__tests__` ani `*.test.*`); pripravujú upozornenia a falošný
 * server, ktorý stránkuje ako backend: stránka za koncom vráti POSLEDNÚ stránku, nie prázdnu.
 */

import type { NotificationsPage } from './notificationsApi';
import type { DashboardNotification } from './types';

/** Upozornenie `id`: čím vyššie id, tým staršie, takže poradie je id 1, 2, 3 … */
export function notification(
  id: number,
  overrides: Partial<DashboardNotification> = {},
): DashboardNotification {
  return {
    id,
    type: 'review_created',
    title: `Upozornenie ${id}`,
    body: `Telo ${id}`,
    data: {},
    actor: null,
    skill_request: null,
    conversation: null,
    group_invitation: null,
    target_url: `/dashboard/notifications/${id}`,
    is_read: false,
    created_at: new Date(Date.UTC(2026, 4, 1, 12, 0, 0) - id * 60_000).toISOString(),
    read_at: null,
    ...overrides,
  };
}

/** Upozornenia s id od `from` do `to` vrátane. */
export function range(from: number, to: number): DashboardNotification[] {
  return Array.from({ length: to - from + 1 }, (_, index) => notification(from + index));
}

/** Odpoveď servera pre stránku `page` zoznamu s `total` upozorneniami (id 1..total). */
export function serverPage(total: number, page: number, pageSize: number): NotificationsPage {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const effectivePage = Math.min(page, Math.max(totalPages, 1));
  const start = (effectivePage - 1) * pageSize + 1;
  const end = Math.min(effectivePage * pageSize, total);
  return {
    results: start <= end ? range(start, end) : [],
    total,
    page: effectivePage,
    pageSize,
    totalPages,
  };
}

/** Len to, čo z jest mocku potrebujeme (bez závislosti na globálnych typoch jestu v zdrojoch). */
type ListPageMock = {
  mockImplementation: (
    implementation: (page: number, pageSize: number) => Promise<NotificationsPage>,
  ) => unknown;
};

/** Naplní `listNotificationsPage` mock serverom s `total` upozorneniami. */
export function fakeServer(listMock: ListPageMock, total: number): void {
  listMock.mockImplementation(async (page: number, pageSize: number) =>
    serverPage(total, page, pageSize),
  );
}

/** Ručne ovládaný promise na skúmanie správania, kým požiadavka letí. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

import { listNotificationsPage } from './notificationsApi';
import type { DashboardNotification } from './types';

/** Koľko upozornení sa dotiahne naraz (jedna „dávka“). */
export const NOTIFICATIONS_BATCH_SIZE = 15;

/** Strop servera na veľkosť stránky (backend `NOTIFICATION_FEED_MAX_PAGE_SIZE`). */
export const NOTIFICATIONS_MAX_PAGE_SIZE = 50;

/** Najväčší násobok dávky, ktorý sa zmestí do stropu servera (45), aby hranice stránok sedeli s dávkami. */
const WINDOW_REQUEST_SIZE =
  Math.floor(NOTIFICATIONS_MAX_PAGE_SIZE / NOTIFICATIONS_BATCH_SIZE) * NOTIFICATIONS_BATCH_SIZE;

/** Jedna požiadavka na server: číslo stránky a jej veľkosť. */
export type NotificationsPageRequest = { page: number; pageSize: number };

/** Koľko upozornení má okno prvých `pageCount` dávok (aspoň jedna dávka). */
function windowSize(pageCount: number): number {
  return NOTIFICATIONS_BATCH_SIZE * Math.max(1, Math.floor(pageCount));
}

/**
 * Požiadavky, ktorými sa obnoví okno prvých `pageCount` dávok od začiatku.
 *
 * Obnova zoznamu (udalosť zo servera, opakovaný pokus) nesmie zahodiť už donačítané dávky, inak by
 * sa zoznam pod prstom skrátil na prvých 15 a scroll by skočil. Okno sa preto načíta nanovo celé:
 * jednou požiadavkou, kým sa zmestí do stropu servera, inak po stránkach po 45 (násobok dávky).
 */
export function notificationsWindowRequests(pageCount: number): NotificationsPageRequest[] {
  const size = windowSize(pageCount);
  if (size <= NOTIFICATIONS_MAX_PAGE_SIZE) return [{ page: 1, pageSize: size }];
  const requests: NotificationsPageRequest[] = [];
  for (let page = 1; (page - 1) * WINDOW_REQUEST_SIZE < size; page += 1) {
    requests.push({ page, pageSize: WINDOW_REQUEST_SIZE });
  }
  return requests;
}

/**
 * Pripojí nové upozornenia na koniec zoznamu bez duplicít (podľa ID).
 *
 * Číslované stránkovanie sa pri zmene dát na serveri posúva (príde nové upozornenie): položka z konca
 * predošlej dávky sa môže zopakovať na začiatku ďalšej. Prvý výskyt ostáva, nové sa pridajú v poradí.
 */
export function appendUniqueNotifications(
  current: DashboardNotification[],
  incoming: DashboardNotification[],
): DashboardNotification[] {
  const seen = new Set(current.map((item) => item.id));
  const fresh = incoming.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return fresh.length === 0 ? current : [...current, ...fresh];
}

/** Okno prvých `pageCount` dávok a údaj, či za ním ešte niečo je. */
export type NotificationsWindow = {
  items: DashboardNotification[];
  hasMore: boolean;
};

/**
 * Načíta okno prvých `pageCount` dávok (po 15).
 *
 * Prvá stránka sa načíta sama: povie, koľko stránok server vôbec má, takže sa nežiada nič za koncom.
 * Ostatné stránky okna idú naraz, aby obnova dlhého zoznamu netrvala toľko kôl, koľko má stránok, a
 * aby boli načítané v takmer rovnakom čase. Zlyhanie ktorejkoľvek požiadavky zlyhá celé okno (nikdy
 * sa nevráti len jeho časť).
 *
 * Výsledok sa orezá presne na `pageCount` dávok, aby ďalšia dávka (`pageCount + 1`) nadväzovala bez
 * medzery. Duplicity medzi stránkami (zoznam sa medzi požiadavkami na serveri posunul) sa zahadzujú
 * podľa ID ešte pred orezaním. Za oknom je ešte niečo, keď server priniesol viac než okno alebo keď
 * posledná odpoveď hlásila ďalšiu stránku (porovnáva sa číslo vyžiadanej stránky s počtom stránok).
 */
export async function fetchNotificationsWindow(pageCount: number): Promise<NotificationsWindow> {
  const size = windowSize(pageCount);
  const [firstRequest, ...otherRequests] = notificationsWindowRequests(pageCount);
  const first = await listNotificationsPage(firstRequest.page, firstRequest.pageSize);

  const remaining = otherRequests.filter((request) => request.page <= first.totalPages);
  const others = await Promise.all(
    remaining.map((request) => listNotificationsPage(request.page, request.pageSize)),
  );

  let collected: DashboardNotification[] = [];
  for (const page of [first, ...others]) {
    collected = appendUniqueNotifications(collected, page.results);
  }
  const lastRequest = remaining.length > 0 ? remaining[remaining.length - 1] : firstRequest;
  const lastResponse = others.length > 0 ? others[others.length - 1] : first;
  return {
    items: collected.slice(0, size),
    hasMore: collected.length > size || lastRequest.page < lastResponse.totalPages,
  };
}

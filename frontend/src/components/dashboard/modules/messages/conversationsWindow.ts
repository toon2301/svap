import type { ConversationListItem } from './types';
import {
  CONVERSATIONS_MAX_PAGE_SIZE,
  CONVERSATIONS_PAGE_SIZE,
  listConversationsPage,
  type ConversationsTab,
} from './conversationsPagingApi';

/** Jedna požiadavka na server: číslo stránky a jej veľkosť. */
export type ConversationsPageRequest = { page: number; pageSize: number };

/** Koľko konverzácií má okno prvých `pageCount` dávok (aspoň jedna dávka). */
function windowSize(pageCount: number): number {
  return CONVERSATIONS_PAGE_SIZE * Math.max(1, Math.floor(pageCount));
}

/**
 * Požiadavky, ktorými sa obnoví okno prvých `pageCount` dávok od začiatku.
 *
 * Obnova zoznamu (polling, focus, udalosť) nesmie zahodiť už donačítané dávky, inak by sa zoznam
 * pod prstom skrátil na prvých 20. Okno sa preto načíta nanovo celé: jednou požiadavkou, kým sa
 * zmestí do stropu servera, inak po stránkach po 100 (násobok dávky, takže hranice sedia).
 */
export function conversationsWindowRequests(pageCount: number): ConversationsPageRequest[] {
  const size = windowSize(pageCount);
  if (size <= CONVERSATIONS_MAX_PAGE_SIZE) return [{ page: 1, pageSize: size }];
  const requests: ConversationsPageRequest[] = [];
  for (let page = 1; (page - 1) * CONVERSATIONS_MAX_PAGE_SIZE < size; page += 1) {
    requests.push({ page, pageSize: CONVERSATIONS_MAX_PAGE_SIZE });
  }
  return requests;
}

/**
 * Pripojí nové konverzácie na koniec zoznamu bez duplicít (podľa ID).
 *
 * Číslované stránkovanie sa pri zmene dát na serveri posúva: položka z konca predošlej dávky
 * sa môže zopakovať na začiatku ďalšej. Prvý výskyt ostáva, nové sa pridajú v poradí.
 */
export function appendUniqueConversations(
  current: ConversationListItem[],
  incoming: ConversationListItem[],
): ConversationListItem[] {
  const seen = new Set(current.map((item) => item.id));
  const fresh = incoming.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return fresh.length === 0 ? current : [...current, ...fresh];
}

/** Okno prvých `pageCount` dávok a údaj, či za ním ešte niečo je. */
export type ConversationsWindow = {
  items: ConversationListItem[];
  hasMore: boolean;
};

/**
 * Načíta okno prvých `pageCount` dávok (po 20) pre danú záložku a hľadanie.
 *
 * Výsledok sa orezá presne na `pageCount` dávok, aby ďalšia dávka (`pageCount + 1`) nadväzovala
 * bez medzery a bez prekryvu. Za oknom je ešte niečo, keď server priniesol viac než okno alebo
 * keď posledná odpoveď hlásila ďalšiu stránku.
 */
export async function fetchConversationsWindow({
  tab,
  search,
  pageCount,
}: {
  tab: ConversationsTab;
  search: string;
  pageCount: number;
}): Promise<ConversationsWindow> {
  const size = windowSize(pageCount);
  const collected: ConversationListItem[] = [];
  let lastHasMore = false;
  for (const request of conversationsWindowRequests(pageCount)) {
    const page = await listConversationsPage({ tab, search, ...request });
    collected.push(...page.items);
    lastHasMore = page.hasMore;
    if (!page.hasMore) break;
  }
  return {
    items: collected.slice(0, size),
    hasMore: collected.length > size || lastHasMore,
  };
}

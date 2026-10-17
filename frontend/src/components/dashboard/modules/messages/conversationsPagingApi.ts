import { api } from '@/lib/api';
import type { ConversationListItem } from './types';

/** Záložka zoznamu: bežné konverzácie alebo prichádzajúce žiadosti o správu. */
export type ConversationsTab = 'messages' | 'requests';

/** Jedna stránka zoznamu a údaj, či server hlási ďalšiu. */
export type ConversationsPage = {
  items: ConversationListItem[];
  hasMore: boolean;
};

/** Koľko konverzácií sa dotiahne naraz pri scrolle na koniec zoznamu. */
export const CONVERSATIONS_PAGE_SIZE = 20;

/** Strop servera na veľkosť stránky (`ConversationListPagination.max_page_size`). */
export const CONVERSATIONS_MAX_PAGE_SIZE = 100;

const ENDPOINTS: Record<ConversationsTab, string> = {
  messages: '/auth/messaging/conversations/',
  requests: '/auth/messaging/conversations/requests/',
};

function normalizeSearch(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Rozbehnuté požiadavky podľa parametrov, aby rovnaká požiadavka z viacerých zoznamov letela raz. */
const pageRequestsInFlight = new Map<string, Promise<ConversationsPage>>();

function pageRequestKey(tab: ConversationsTab, search: string, page: number, pageSize: number) {
  return `${tab}|${page}|${pageSize}|${search.length}:${search}`;
}

async function fetchConversationsPage(
  tab: ConversationsTab,
  search: string,
  page: number,
  pageSize: number,
): Promise<ConversationsPage> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (search) params.search = search;

  const { data } = await api.get<
    ConversationListItem[] | { results?: ConversationListItem[]; next?: string | null }
  >(ENDPOINTS[tab], { params });

  // Nestránkovaná odpoveď (pole) znamená, že všetko prišlo naraz.
  if (Array.isArray(data)) return { items: data, hasMore: false };
  return {
    items: Array.isArray(data?.results) ? data.results : [],
    hasMore: typeof data?.next === 'string' && data.next.length > 0,
  };
}

/**
 * Jedna stránka zoznamu konverzácií alebo žiadostí.
 *
 * Server stránkuje číslovane (`page`, `page_size`) a hľadanie (`search`) uplatňuje PRED
 * stránkovaním, takže výsledky hľadania sa dajú stránkovať rovnako ako celý zoznam.
 *
 * Zoznam môže byť v stránke vykreslený viackrát naraz (napr. skrytý panel vedľa hlavného
 * zoznamu). Identická požiadavka, ktorá práve letí, sa preto zdieľa, rovnako ako
 * doteraz pri `listConversations`.
 */
export function listConversationsPage({
  tab,
  search,
  page,
  pageSize,
}: {
  tab: ConversationsTab;
  search: string;
  page: number;
  pageSize: number;
}): Promise<ConversationsPage> {
  const normalizedSearch = normalizeSearch(search);
  const key = pageRequestKey(tab, normalizedSearch, page, pageSize);
  const inFlight = pageRequestsInFlight.get(key);
  if (inFlight) return inFlight;

  const request = fetchConversationsPage(tab, normalizedSearch, page, pageSize).finally(() => {
    if (pageRequestsInFlight.get(key) === request) pageRequestsInFlight.delete(key);
  });
  pageRequestsInFlight.set(key, request);
  return request;
}

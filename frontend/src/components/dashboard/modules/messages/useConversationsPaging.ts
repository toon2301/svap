'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConversationListItem } from './types';
import {
  CONVERSATIONS_PAGE_SIZE,
  listConversationsPage,
  type ConversationsTab,
} from './conversationsPagingApi';
import { fetchConversationsWindow } from './conversationsWindow';

/** Po chybe donačítania sa ďalší pokus odloží (5 s, 10 s … najviac minúta). */
const LOAD_MORE_RETRY_BASE_MS = 5_000;
const LOAD_MORE_RETRY_MAX_MS = 60_000;
/** Koľkokrát sa okno načíta znova, keď sa medzitým donačítala ďalšia dávka. */
const WINDOW_REFETCH_LIMIT = 2;

/** Čo vieme o načítanej časti zoznamu jednej záložky. */
type LoadedWindow = {
  /** Hľadanie, pre ktoré okno platí. */
  search: string;
  /** Koľko dávok (po 20) je načítaných od začiatku. */
  pageCount: number;
  /** Je za oknom ešte niečo? */
  hasMore: boolean;
};

type UseConversationsPagingInput = {
  tab: ConversationsTab;
  /** Potvrdené hľadanie (už normalizované). */
  search: string;
  /** Pripojí dotiahnuté konverzácie do zoznamu danej záložky. */
  onAppend: (tab: ConversationsTab, incoming: ConversationListItem[]) => void;
};

type LoadedWindows = Partial<Record<ConversationsTab, LoadedWindow>>;

/** Koľko dávok je načítaných pre danú záložku a hľadanie (pri inom hľadaní sa začína od prvej). */
function pageCountFor(windows: LoadedWindows, tab: ConversationsTab, search: string): number {
  const known = windows[tab];
  return known && known.search === search ? known.pageCount : 1;
}

/** Výsledok načítania okna; zapísať ho do stavu stránkovania smie len volajúci, ktorý ho použije. */
export type FetchedConversationsWindow = {
  items: ConversationListItem[];
  commit: () => void;
};

/**
 * Stránkovanie zoznamu konverzácií (aj žiadostí): okno donačítaných dávok a ďalšie dávky pri scrolle.
 *
 * Zoznam ostáva v stave komponentu; tu je len to, čo hovorí, KOĽKO je načítané a či je čo dotiahnuť:
 *  - `fetchWindow` obnoví celé načítané okno (polling, focus, udalosť) a vráti ho spolu s funkciou
 *    `commit`, ktorou sa zapíše nový stav stránkovania, keď výsledok volajúci naozaj použije,
 *  - `loadMore` dotiahne ďalšiu dávku. Súbeh s obnovou je ošetrený: dávka, ktorá by nenadväzovala
 *    (zmenilo sa hľadanie alebo okno), sa zahodí, a obnova, pri ktorej sa medzitým donačítala
 *    ďalšia dávka, sa zopakuje s väčším oknom.
 */
export function useConversationsPaging({ tab, search, onAppend }: UseConversationsPagingInput) {
  const windowsRef = useRef<LoadedWindows>({});
  const loadingMoreRef = useRef(false);
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);
  const [, setRevision] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryBlocked, setRetryBlocked] = useState(false);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    [],
  );

  const fetchWindow = useCallback(
    async (windowTab: ConversationsTab, windowSearch: string): Promise<FetchedConversationsWindow> => {
      for (let attempt = 0; ; attempt += 1) {
        const pageCount = pageCountFor(windowsRef.current, windowTab, windowSearch);
        const result = await fetchConversationsWindow({
          tab: windowTab,
          search: windowSearch,
          pageCount,
        });
        // Počas načítania sa mohla donačítať ďalšia dávka: tento výsledok by ju zahodil.
        const latestPageCount = pageCountFor(windowsRef.current, windowTab, windowSearch);
        if (latestPageCount !== pageCount && attempt < WINDOW_REFETCH_LIMIT) continue;
        return {
          items: result.items,
          commit: () => {
            windowsRef.current[windowTab] = {
              search: windowSearch,
              pageCount,
              hasMore: result.hasMore,
            };
            bump();
          },
        };
      }
    },
    [bump],
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const loaded = windowsRef.current[tab];
    if (!loaded || loaded.search !== search || !loaded.hasMore) return;

    const startPageCount = loaded.pageCount;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await listConversationsPage({
        tab,
        search,
        page: startPageCount + 1,
        pageSize: CONVERSATIONS_PAGE_SIZE,
      });
      const current = windowsRef.current[tab];
      // Dávka musí nadväzovať na to, čo je teraz načítané; inak ju zahodíme.
      if (!current || current.search !== search || current.pageCount !== startPageCount) return;
      windowsRef.current[tab] = {
        search,
        pageCount: startPageCount + 1,
        hasMore: page.hasMore,
      };
      failuresRef.current = 0;
      onAppendRef.current(tab, page.items);
    } catch {
      // Tichý ďalší pokus s odstupom: bez nového textu a bez zahltenia servera pri trvalej chybe.
      failuresRef.current += 1;
      const delay = Math.min(
        LOAD_MORE_RETRY_BASE_MS * 2 ** (failuresRef.current - 1),
        LOAD_MORE_RETRY_MAX_MS,
      );
      setRetryBlocked(true);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        setRetryBlocked(false);
      }, delay);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      bump();
    }
  }, [bump, search, tab]);

  const known = windowsRef.current[tab];
  const hasMore = Boolean(known && known.search === search && known.hasMore);

  return { hasMore, loadingMore, retryBlocked, fetchWindow, loadMore };
}

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

/** Pauza po neúspešnom donačítaní jednej záložky; platí len pre hľadanie, pri ktorom vznikla. */
type RetryPause = {
  search: string;
  /** Koľko donačítaní po sebe zlyhalo (určuje dĺžku pauzy). */
  failures: number;
  blocked: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

type UseConversationsPagingInput = {
  tab: ConversationsTab;
  /** Potvrdené hľadanie (už normalizované). */
  search: string;
  /** Pripojí dotiahnuté konverzácie do zoznamu danej záložky. */
  onAppend: (tab: ConversationsTab, incoming: ConversationListItem[]) => void;
};

type LoadedWindows = Partial<Record<ConversationsTab, LoadedWindow>>;
type RetryPauses = Partial<Record<ConversationsTab, RetryPause>>;
/** Pre každú záložku hľadanie, pre ktoré práve letí dávka. */
type LoadingBatches = Partial<Record<ConversationsTab, string>>;

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
 *
 * Jedna inštancia obsluhuje obe záložky, preto všetko, čo patrí len jednej z nich (okno, rozbehnutá
 * dávka, pauza po chybe s vlastným časovačom a počítadlom), sa vedie zvlášť pre každú záložku.
 * Vrátené `hasMore`, `loadingMore` a `retryBlocked` platia pre aktívnu záložku a hľadanie.
 */
export function useConversationsPaging({ tab, search, onAppend }: UseConversationsPagingInput) {
  const windowsRef = useRef<LoadedWindows>({});
  const loadingRef = useRef<LoadingBatches>({});
  const retryRef = useRef<RetryPauses>({});
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;
  // Stav žije v refoch (rovnako ako okná) a `bump` vynúti prekreslenie, ktoré ho prečíta.
  const [, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(
    () => () => {
      Object.values(retryRef.current).forEach((pause) => {
        if (pause?.timer) clearTimeout(pause.timer);
      });
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
    if (loadingRef.current[tab] === search) return;
    const loaded = windowsRef.current[tab];
    if (!loaded || loaded.search !== search || !loaded.hasMore) return;

    const startPageCount = loaded.pageCount;
    loadingRef.current[tab] = search;
    bump();
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
      const previousPause = retryRef.current[tab];
      if (previousPause?.timer) clearTimeout(previousPause.timer);
      delete retryRef.current[tab];
      onAppendRef.current(tab, page.items);
    } catch {
      // Tichý ďalší pokus s odstupom: bez nového textu a bez zahltenia servera pri trvalej chybe.
      // Pauza, jej počítadlo aj časovač patria len záložke, na ktorej dávka zlyhala. Oneskorené
      // zlyhanie dávky pre staré hľadanie nesmie prepísať pauzu aktuálneho hľadania.
      if (windowsRef.current[tab]?.search !== search) return;
      const previousPause = retryRef.current[tab];
      if (previousPause?.timer) clearTimeout(previousPause.timer);
      const failures = (previousPause?.search === search ? previousPause.failures : 0) + 1;
      const pause: RetryPause = { search, failures, blocked: true, timer: null };
      pause.timer = setTimeout(
        () => {
          pause.timer = null;
          pause.blocked = false;
          bump();
        },
        Math.min(LOAD_MORE_RETRY_BASE_MS * 2 ** (failures - 1), LOAD_MORE_RETRY_MAX_MS),
      );
      retryRef.current[tab] = pause;
    } finally {
      // Zmaže sa len vlastná dávka: neskoršia odpoveď pre staré hľadanie nesmie zhasnúť novšiu.
      if (loadingRef.current[tab] === search) delete loadingRef.current[tab];
      bump();
    }
  }, [bump, search, tab]);

  /**
   * Je zoznam danej záložky pre dané hľadanie načítaný celý?
   *
   * Pravda len vtedy, keď okno pre túto záložku a hľadanie naozaj existuje a nemá za sebou nič ďalšie.
   * Chýbajúce okno ani okno pre iné hľadanie sa za „celé“ nepovažujú.
   */
  const isFullyLoaded = useCallback((forTab: ConversationsTab, forSearch: string) => {
    const loaded = windowsRef.current[forTab];
    return Boolean(loaded && loaded.search === forSearch && !loaded.hasMore);
  }, []);

  const known = windowsRef.current[tab];
  const hasMore = Boolean(known && known.search === search && known.hasMore);
  const pause = retryRef.current[tab];
  const retryBlocked = Boolean(pause && pause.search === search && pause.blocked);
  const loadingMore = loadingRef.current[tab] === search;

  return { hasMore, isFullyLoaded, loadingMore, retryBlocked, fetchWindow, loadMore };
}

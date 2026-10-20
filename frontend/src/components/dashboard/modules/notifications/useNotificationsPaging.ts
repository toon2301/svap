'use client';

import { useCallback, useRef, useState } from 'react';

import { listNotificationsPage } from './notificationsApi';
import { fetchNotificationsWindow, NOTIFICATIONS_BATCH_SIZE } from './notificationsWindow';
import type { DashboardNotification } from './types';

/** Koľkokrát sa okno načíta znova, keď sa medzitým donačítala ďalšia dávka. */
const WINDOW_REFETCH_LIMIT = 2;

/** Koľkokrát sa dávka načíta znova, keď ju obnova zoznamu medzitým urobila neaktuálnou. */
const LOAD_MORE_RETRY_LIMIT = 2;

/** Výsledok načítania okna; zapísať ho do stavu stránkovania smie len volajúci, ktorý ho použije. */
export type FetchedNotificationsWindow = {
  items: DashboardNotification[];
  commit: () => void;
};

/** Čo sa stalo s požiadavkou na ďalšiu dávku: načítala sa, nebolo čo robiť, alebo zlyhala. */
export type LoadMoreOutcome = 'loaded' | 'skipped' | 'failed';

type UseNotificationsPagingInput = {
  /** Pripojí dotiahnuté upozornenia na koniec zoznamu. */
  onAppend: (incoming: DashboardNotification[]) => void;
};

/**
 * Stránkovanie zoznamu upozornení: okno donačítaných dávok a ďalšia dávka na požiadanie.
 *
 * Zoznam ostáva v stave volajúceho; tu je len to, KOĽKO je načítané a či je čo dotiahnuť:
 *  - `fetchWindow` načíta celé už načítané okno (obnova zoznamu) a vráti ho spolu s funkciou
 *    `commit`, ktorou sa zapíše nový stav stránkovania, keď výsledok volajúci naozaj použije. Ak sa
 *    počas načítania donačítala ďalšia dávka, okno sa načíta znova s väčším rozsahom. Ak ani po
 *    opakovaniach nesedí (dávky pribúdajú stále), vráti `null`: menšie okno by zoznam skrátilo, takže
 *    sa nezapíše nič a volajúci to skúsi znova,
 *  - `loadMore` dotiahne ďalšiu dávku. Dávku, ktorú obnova zoznamu medzitým urobila neaktuálnou
 *    (zapísala nové okno), nepripojí – stránkovanie podľa čísla by v zozname nechalo diery – ale
 *    vyžiada si ju znova od aktuálneho okna.
 */
export function useNotificationsPaging({ onAppend }: UseNotificationsPagingInput) {
  const pageCountRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  // Pribúda pri každom zapísanom okne; podľa neho `loadMore` pozná, že obnova zoznam medzitým zmenila.
  const commitRevisionRef = useRef(0);
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;
  // Stav žije v refoch a `bump` vynúti prekreslenie, ktoré ho prečíta.
  const [, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const fetchWindow = useCallback(async (): Promise<FetchedNotificationsWindow | null> => {
    for (let attempt = 0; attempt <= WINDOW_REFETCH_LIMIT; attempt += 1) {
      const pageCount = pageCountRef.current;
      const result = await fetchNotificationsWindow(pageCount);
      // Počas načítania sa mohla donačítať ďalšia dávka: tento výsledok by ju zahodil.
      if (pageCountRef.current !== pageCount) continue;
      return {
        items: result.items,
        commit: () => {
          pageCountRef.current = pageCount;
          hasMoreRef.current = result.hasMore;
          commitRevisionRef.current += 1;
          bump();
        },
      };
    }
    return null;
  }, [bump]);

  const loadMore = useCallback(async (): Promise<LoadMoreOutcome> => {
    if (loadingMoreRef.current || !hasMoreRef.current) return 'skipped';

    loadingMoreRef.current = true;
    bump();
    try {
      for (let attempt = 0; ; attempt += 1) {
        const startRevision = commitRevisionRef.current;
        const nextPage = pageCountRef.current + 1;
        const page = await listNotificationsPage(nextPage, NOTIFICATIONS_BATCH_SIZE);
        if (commitRevisionRef.current !== startRevision) {
          // Obnova medzitým zapísala nové okno; táto dávka by naň nemusela nadväzovať.
          if (attempt >= LOAD_MORE_RETRY_LIMIT || !hasMoreRef.current) return 'skipped';
          continue;
        }
        pageCountRef.current = nextPage;
        // Ak sa zoznam skrátil, server odpovie poslednou stránkou a za ňou už nič nie je.
        hasMoreRef.current = nextPage < page.totalPages;
        onAppendRef.current(page.results);
        return 'loaded';
      }
    } catch {
      return 'failed';
    } finally {
      loadingMoreRef.current = false;
      bump();
    }
  }, [bump]);

  return {
    hasMore: hasMoreRef.current,
    loadingMore: loadingMoreRef.current,
    fetchWindow,
    loadMore,
  };
}

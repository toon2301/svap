'use client';

/**
 * Nástenka a jej návratová snímka: uloženie pri odchode, scroll pri návrate.
 *
 * Zoznam príspevkov obnovuje `useFeedInfiniteScroll` (dostane ich cez
 * `restore`); tu ostáva to, čo je mimo neho – reakcia na žiadosť o snímku a
 * scrollovateľný `<main>`. Ten je zdieľaný so všetkými modulmi, takže Nástenka
 * mu pri vstupe VŽDY povie, kde má stáť: pri návrate na uloženú pozíciu, inak
 * na vrch.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { FeedPost } from '@/lib/feedApi';
import { onFeedReturnCapture, saveFeedReturn } from './feedReturnState';

/**
 * Scrollovateľná plocha dashboardu.
 *
 * Feed vlastný scroller nemá – scrolluje sa `<main data-dashboard-main>`, ten
 * istý, na ktorom si po uložení profilu drží pozíciu `ProfileModule`.
 */
const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';

function dashboardMain(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
}

/** Na serveri `useLayoutEffect` nebeží – rovnaký vzor ako `useSettingsScrollReset`. */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type UseFeedReturnParams = {
  /** Aktuálny stav zoznamu – pýta sa naň až v momente odchodu. */
  getPosts: () => { posts: FeedPost[]; nextUrl: string | null };
  /** Pozícia z obnovenej snímky, alebo `null`, keď sa nič neobnovuje. */
  restoredScrollTop: number | null;
  /** Sú obnovené príspevky už v DOM? Skôr nie je kam scrollovať. */
  restoredPostsRendered: boolean;
};

export function useFeedReturn({
  getPosts,
  restoredScrollTop,
  restoredPostsRendered,
}: UseFeedReturnParams): void {
  // Cez ref, aby sa odber nepreviazal pri každom rendri – zoznam sa mení
  // často, odber má vzniknúť raz.
  const getPostsRef = useRef(getPosts);
  getPostsRef.current = getPosts;

  useEffect(
    () =>
      onFeedReturnCapture(() => {
        const { posts, nextUrl } = getPostsRef.current();
        saveFeedReturn({
          posts,
          nextUrl,
          scrollTop: dashboardMain()?.scrollTop ?? 0,
        });
      }),
    [],
  );

  // Vstup, ktorý NIE JE návrat: od vrchu.
  //
  // `<main>` sa pri prepnutí modulu nevymieňa, len jeho obsah – bez tohto si
  // drží pozíciu predošlej obrazovky. Priamy klik na Nástenku z odscrollovaného
  // profilu tak skončil kúsok pod vrchom: prehliadač starú pozíciu orezal na
  // výšku práve sa načítavajúceho feedu (hlavička + dve skeleton karty).
  //
  // Podmienka je presný doplnok obnovy nižšie: buď obnova posunie na kladnú
  // uloženú pozíciu, alebo sa ide na vrch. Snímka s pozíciou 0 obnovu
  // preskočí, takže patrí sem – inak by ostala stará pozícia.
  //
  // Layout efekt, nie bežný: beží pred vykreslením, takže posunutá Nástenka sa
  // neukáže ani na jeden snímok. Zároveň beží pred pristátím po zdieľaní
  // (`useFeedShareLanding` scrolluje až v bežnom efekte a o snímok neskôr),
  // takže doscrollovanie na nový príspevok nezruší. Len pri mounte – neskoršie
  // prekreslenie Nástenky nesmie používateľa hodiť na vrch.
  const enteredRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    if (restoredScrollTop != null && restoredScrollTop > 0) return;
    const main = dashboardMain();
    if (main) main.scrollTop = 0;
  }, [restoredScrollTop]);

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    if (restoredScrollTop == null || restoredScrollTop <= 0) return;
    if (!restoredPostsRendered) return;
    restoredRef.current = true;

    // Dva snímky: v prvom React karty commitne, až v druhom má `<main>`
    // výšku, do ktorej sa dá scrollovať. Rovnaký postup, akým si scroll po
    // uložení profilu obnovuje `ProfileModule`.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const main = dashboardMain();
        if (main) main.scrollTop = restoredScrollTop;
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [restoredPostsRendered, restoredScrollTop]);
}

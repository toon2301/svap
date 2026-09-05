'use client';

/**
 * Počet komentárov jedného príspevku – jeden stav pre všetky jeho miesta.
 *
 * Predtým si ho každé miesto držalo vo vlastnom `useState` a signál cez
 * `feedPostCountEvents` tiekol len jedným smerom: karta odoberala a nikdy
 * nevysielala, okno detailu aj mobilné vrstvy vysielali a nikdy neodoberali.
 * Nový komentár sa tak dostal na kartu, ale dve otvorené vrstvy nad tým istým
 * príspevkom sa navzájom nevideli nikdy.
 *
 * Hook robí oboje. Kľúčové je ROZLÍŠENIE dvoch ciest:
 *
 *  - `publishCommentsCount` / `changeCommentsCount` = „toto je nová pravda",
 *    zapíše sa a ROZPOŠLE ostatným.
 *  - príchodzí event = „niekto iný to už rozposlal", len sa zapíše a ďalej
 *    sa NEVYSIELA.
 *
 * Bez tohto rozlíšenia (napr. keby sa vysielalo z efektu na zmenu stavu) by si
 * dve otvorené vrstvy to isté číslo posielali dokola.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { emitFeedPostCounts, onFeedPostCounts } from './feedPostCountEvents';

export type FeedPostCommentsCount = {
  commentsCount: number;
  /** Nová pravda zo servera (načítanie, polling, celkový počet zo zoznamu). */
  publishCommentsCount: (next: number) => void;
  /** Zmena o delta (pribudol/ubudol komentár) – vrátane rozposlania. */
  changeCommentsCount: (delta: number) => void;
  /**
   * Zápis BEZ rozposlania.
   *
   * Pre prevzatie čerstvejších props (obnovenie feedu): to nie je nová
   * informácia od tohto miesta, len prevzatie toho, čo už prišlo zo servera
   * inou cestou.
   */
  setCommentsCountLocally: (next: number) => void;
};

export function useFeedPostCommentsCount(
  postId: number,
  initialCount: number,
): FeedPostCommentsCount {
  const [commentsCount, setCommentsCount] = useState(initialCount);
  // Aktuálna hodnota pre výpočet delty – dve zmeny tesne po sebe sa tak
  // nasčítajú správne aj pred prekreslením.
  const countRef = useRef(commentsCount);
  countRef.current = commentsCount;

  useEffect(
    () =>
      onFeedPostCounts((patch) => {
        if (patch.postId !== postId) return;
        if (patch.commentsCount === undefined) return;
        countRef.current = patch.commentsCount;
        setCommentsCount(patch.commentsCount);
      }),
    [postId],
  );

  const setCommentsCountLocally = useCallback((next: number) => {
    const safe = Math.max(0, next);
    countRef.current = safe;
    setCommentsCount(safe);
  }, []);

  const publishCommentsCount = useCallback(
    (next: number) => {
      const safe = Math.max(0, next);
      countRef.current = safe;
      setCommentsCount(safe);
      emitFeedPostCounts({ postId, commentsCount: safe });
    },
    [postId],
  );

  const changeCommentsCount = useCallback(
    (delta: number) => {
      publishCommentsCount(countRef.current + delta);
    },
    [publishCommentsCount],
  );

  return {
    commentsCount,
    publishCommentsCount,
    changeCommentsCount,
    setCommentsCountLocally,
  };
}

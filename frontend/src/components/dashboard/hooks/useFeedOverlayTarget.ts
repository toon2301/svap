'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  FeedPostOverlayCloseOptions,
  FeedPostOverlayTarget,
} from '../contexts/FeedPostOverlayContext';
import {
  forgetFeedOverlayHistory,
  popFeedOverlayHistory,
  pushFeedOverlayHistory,
} from '../modules/feed/feedOverlayHistory';
import { buildFeedPostPath } from '../modules/feed/feedPostRouting';

/** Cieľ okna detailu príspevku nad appkou: stav, záznam v histórii a tlačidlo späť. */
export function useFeedOverlayTarget() {
  // --- Okno detailu prispevku -------------------------------------------
  // Vrstva nad appkou: URL sa meni cez history API, teda BEZ Next navigacie,
  // takze sa nic pod oknom neodmountuje ani nestrati scroll. Otvorenie prida
  // presne jeden zaznam historie a zatvorenie ho odoberie - detaily aj s
  // odovodnenim su vo `feedOverlayHistory`.
  const [feedOverlayTarget, setFeedOverlayTarget] =
    useState<FeedPostOverlayTarget | null>(null);

  const handleFeedOverlayTargetChange = useCallback(
    (
      target: FeedPostOverlayTarget | null,
      options?: FeedPostOverlayCloseOptions,
    ) => {
      setFeedOverlayTarget(target);
      if (target) {
        pushFeedOverlayHistory(
          buildFeedPostPath(target.postId, target.highlightCommentId),
        );
        return;
      }
      // Appka práve naviguje inam a adresu si rieši sama - krok spat by tu
      // navigaciu vzapati zrusil.
      if (options?.keepHistory) {
        forgetFeedOverlayHistory();
        return;
      }
      popFeedOverlayHistory();
    },
    [],
  );

  // Tlacidlo spat v prehliadaci zavrie okno namiesto navigacie prec.
  useEffect(() => {
    if (!feedOverlayTarget || typeof window === 'undefined') return;
    const handlePopState = () => {
      // Zaznam okna prave zmizol - zatvorenie uz nema co odoberat.
      forgetFeedOverlayHistory();
      setFeedOverlayTarget(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [feedOverlayTarget]);

  return {
    feedOverlayTarget,
    setFeedOverlayTarget,
    handleFeedOverlayTargetChange,
  };
}

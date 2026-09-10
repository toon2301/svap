'use client';

/**
 * Pristátie nového príspevku vo feede – doscrollovanie a zvýraznenie.
 *
 * Feed sa registruje ako cieľ pristátia, prevezme prípadné čakajúce zdieľanie
 * (to nastane, keď sa naň navigovalo z profilu) a počúva na živý signál, keď
 * už na obrazovke bol.
 *
 * Zvýraznenie po chvíli zhasne samo: je to navedenie oka, nie stav príspevku.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  onFeedShareLanding,
  registerFeedLandingTarget,
  takePendingFeedShareLanding,
} from './feedShareLanding';

/** Ako dlho po doscrollovaní ostane príspevok zvýraznený. */
export const FEED_LANDING_HIGHLIGHT_MS = 2500;

export function useFeedShareLanding<TElement extends HTMLElement>() {
  const [landedPostId, setLandedPostId] = useState<number | null>(null);
  const elements = useRef<Map<number, TElement>>(new Map());
  const scrolledRef = useRef<number | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Karta sa hlási svojím uzlom – bez neho nie je kam doscrollovať. */
  const registerPostElement = useCallback(
    (postId: number, element: TElement | null) => {
      if (element) {
        elements.current.set(postId, element);
        return;
      }
      elements.current.delete(postId);
    },
    [],
  );

  // Feed je na obrazovke: prevezmi čakajúce pristátie a počúvaj na ďalšie.
  useEffect(() => {
    const release = registerFeedLandingTarget();
    const pending = takePendingFeedShareLanding();
    if (pending != null) setLandedPostId(pending);

    const stop = onFeedShareLanding((postId) => {
      // Prevzatie zahodí čakajúcu hodnotu, nech sa to isté pristátie
      // nezopakuje pri budúcom otvorení Nástenky.
      takePendingFeedShareLanding();
      setLandedPostId(postId);
    });

    return () => {
      stop();
      release();
    };
  }, []);

  // Doscrolluj, keď karta naozaj existuje. Beží aj po prekreslení, lebo pri
  // navigácii z profilu je príspevok v DOM až po načítaní feedu.
  useEffect(() => {
    if (landedPostId == null) return;
    const element = elements.current.get(landedPostId);
    if (!element) return;
    if (scrolledRef.current === landedPostId) return;
    scrolledRef.current = landedPostId;

    // `scrollIntoView` nemá jsdom (a staršie prehliadače ho nemajú s options),
    // takže sa volá cez kontrolu typu – rovnako ako inde v appke.
    const frame = requestAnimationFrame(() => {
      if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => {
      setLandedPostId(null);
      scrolledRef.current = null;
      fadeRef.current = null;
    }, FEED_LANDING_HIGHLIGHT_MS);

    return () => cancelAnimationFrame(frame);
  });

  useEffect(
    () => () => {
      if (fadeRef.current) clearTimeout(fadeRef.current);
    },
    [],
  );

  return { landedPostId, registerPostElement };
}

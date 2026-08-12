'use client';

/**
 * Priebežné sledovanie nových komentárov, kým je sekcia otvorená.
 *
 * Vychádza z `usePendingFeedImages` (interval + `inFlightRef` proti
 * prekrývaniu requestov), ale rieši iný scenár: tam ide o jednorazové
 * dobehnutie spracovania, tu o dlhodobé sledovanie. Preto pomalší interval
 * a dve brzdy navyše – skrytá záložka a nečinnosť.
 *
 * ZÁMERNE nie WebSocket: appka nemá koncept „izby" nad objektom a odber by
 * si vyžiadal nový autorizačný bod (kto smie sledovať ktorý príspevok).
 * Polling ide cez ten istý, už overený endpoint.
 */

import { useCallback, useEffect, useRef } from 'react';

/** Priebežné sledovanie, nie dobehnutie – pomalšie než pri fotkách (2,5 s). */
export const COMMENTS_POLL_INTERVAL_MS = 8000;
/** Po tomto čase bez interakcie sa prestane dopytovať. */
export const COMMENTS_POLL_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

/** Udalosti, ktoré považujeme za „používateľ je stále tu". */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

type UseFeedCommentsPollingOptions = {
  /** Beží len kým je sekcia otvorená (komponent namountovaný). */
  enabled: boolean;
  /** Spustí sa pri každom tiku; má vlastnú ochranu proti zastaraným odpovediam. */
  onPoll: () => Promise<void> | void;
};

export function useFeedCommentsPolling({
  enabled,
  onPoll,
}: UseFeedCommentsPollingOptions): void {
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;
  // Ďalší tik až po dobehnutí predošlého – pri pomalej sieti by sa requesty
  // inak hromadili (rovnaký vzor ako usePendingFeedImages).
  const inFlightRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  const markActive = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    // Návrat na záložku je sám o sebe interakcia – inak by sa po dlhšom
    // prepnutí inam sledovanie už neobnovilo.
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') markActive();
    };

    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, markActive, { passive: true }),
    );
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(() => {
      // Skrytá záložka: žiadne dopyty. Rovnaký mechanizmus, aký appka používa
      // pri refreshi konverzácií a notifikácií.
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastActivityRef.current >= COMMENTS_POLL_IDLE_TIMEOUT_MS) {
        return;
      }
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      void Promise.resolve(onPollRef.current())
        // Výpadok siete nie je dôvod nič hlásiť – ďalší tik to skúsi znova.
        .catch(() => undefined)
        .finally(() => {
          inFlightRef.current = false;
        });
    }, COMMENTS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((name) =>
        window.removeEventListener(name, markActive),
      );
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, markActive]);
}

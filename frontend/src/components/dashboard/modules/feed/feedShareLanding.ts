'use client';

/**
 * Kam používateľ pristane po úspešnom zdieľaní.
 *
 * Zdieľať sa dá z piatich miest (karta vo feede, okno detailu, mobilná
 * obrazovka detailu, mobilný fotoprehliadač, ponuka a portfólio na profile)
 * a z každého má skončiť rovnako: bez otvoreného detailu, na Nástenke, s novým
 * príspevkom pred očami.
 *
 * Preto tri veci pokope:
 *
 *  - `emitFeedShareLanding` je JEDEN signál „zdieľanie dobehlo" – otvorené
 *    vrstvy sa naň zatvárajú samy (každá vie o svojej histórii najlepšie) a
 *    feed si podľa neho zvýrazní nový príspevok;
 *  - `takePendingFeedShareLanding` obslúži prípad, keď Nástenka v tej chvíli
 *    NIE JE na obrazovke (zdieľanie z profilu): signál by nemal kto zachytiť,
 *    tak počká, kým sa feed namountuje;
 *  - `isFeedLandingTargetMounted` hovorí volajúcemu, či treba navigovať. Nedá
 *    sa to čítať z adresy: okno detailu sa zatvára krokom späť, ktorý dobehne
 *    až po tomto rozhodnutí, takže `location.pathname` je v tej chvíli ešte
 *    stará.
 *
 * Stav je modulový, nie v `sessionStorage`: medzi zdieľaním a pristátím nikdy
 * nie je reload, len klientska navigácia.
 */

export const FEED_SHARE_LANDING_EVENT = 'feed-share-landing';

/** Koľko feedov je práve na obrazovke (v praxi 0 alebo 1). */
let mountedTargets = 0;
/** Príspevok čakajúci na feed, ktorý sa ešte len namountuje. */
let pendingPostId: number | null = null;

/**
 * Feed sa hlási, že je na obrazovke a vie pristátie prijať.
 *
 * Vracia odhlásenie – volať pri odmountovaní.
 */
export function registerFeedLandingTarget(): () => void {
  mountedTargets += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mountedTargets = Math.max(0, mountedTargets - 1);
  };
}

/** Je Nástenka na obrazovke? Ak nie, volajúci na ňu musí navigovať. */
export function isFeedLandingTargetMounted(): boolean {
  return mountedTargets > 0;
}

/** Zdieľanie dobehlo: zavri vrstvy a zvýrazni nový príspevok. */
export function emitFeedShareLanding(postId: number): void {
  if (!Number.isSafeInteger(postId) || postId <= 0) return;
  pendingPostId = postId;
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<{ postId: number }>(FEED_SHARE_LANDING_EVENT, {
        detail: { postId },
      }),
    );
  } catch {
    // Pristátie je pohodlie – keď sa signál nepodarí poslať, príspevok je aj
    // tak na vrchu feedu, len sa naň nezvýrazní.
  }
}

export function onFeedShareLanding(
  handler: (postId: number) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ postId: number }>).detail;
    if (detail && typeof detail.postId === 'number') handler(detail.postId);
  };
  window.addEventListener(FEED_SHARE_LANDING_EVENT, listener);
  return () => window.removeEventListener(FEED_SHARE_LANDING_EVENT, listener);
}

/**
 * Prevezme čakajúce pristátie a zahodí ho.
 *
 * Zahodenie je podstatné: bez neho by sa ten istý príspevok zvýraznil znovu
 * pri každom ďalšom otvorení Nástenky.
 */
export function takePendingFeedShareLanding(): number | null {
  const postId = pendingPostId;
  pendingPostId = null;
  return postId;
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetFeedShareLanding(): void {
  mountedTargets = 0;
  pendingPostId = null;
}

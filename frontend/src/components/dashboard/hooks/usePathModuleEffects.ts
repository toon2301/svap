'use client';

import { useEffect } from 'react';
import type { FeedPostOverlayTarget } from '../contexts/FeedPostOverlayContext';
import {
  adoptFeedOverlayHistory,
  isFeedOverlayHistoryBusy,
} from '../modules/feed/feedOverlayHistory';
import { decideFeedPostEntry } from '../modules/feed/feedPostEntryDecision';

type PathModuleEffectsInput = {
  offerIdFromReviewsPath: number | null;
  portfolioItemIdFromPath: number | null;
  portfolioCreateMatch: RegExpMatchArray | null;
  feedPostIdFromPath: number | null;
  feedOverlayTarget: FeedPostOverlayTarget | null;
  setFeedOverlayTarget: (target: FeedPostOverlayTarget | null) => void;
  setActiveModule: (module: string) => void;
  isMobile: boolean;
  isViewportResolved: boolean;
};

/** Efekty podľa adresy: recenzie ponuky, detail a tvorba portfólia a priamy vstup na príspevok. */
export function usePathModuleEffects({
  offerIdFromReviewsPath,
  portfolioItemIdFromPath,
  portfolioCreateMatch,
  feedPostIdFromPath,
  feedOverlayTarget,
  setFeedOverlayTarget,
  setActiveModule,
  isMobile,
  isViewportResolved,
}: PathModuleEffectsInput) {
  useEffect(() => {
    if (offerIdFromReviewsPath != null) {
      setActiveModule('offer-reviews');
    }
  }, [offerIdFromReviewsPath, setActiveModule]);

  useEffect(() => {
    if (portfolioItemIdFromPath != null && Number.isFinite(portfolioItemIdFromPath)) {
      setActiveModule('portfolio-detail');
    }
  }, [portfolioItemIdFromPath, setActiveModule]);

  useEffect(() => {
    // Priamy vstup na /dashboard/feed/<id> (odkaz, F5, aj preklik na zdielany
    // prispevok): na desktope ma appka vzdy ukazat Nastenku a NAD nou to iste
    // okno, ake sa otvara klikom vo feede. Samotne rozhodovanie (aj s oboma
    // oneskoreniami adresy) je vo `feedPostEntryDecision`.
    const decision = decideFeedPostEntry({
      pathPostId: feedPostIdFromPath,
      overlayOpen: feedOverlayTarget !== null,
      historyBusy: isFeedOverlayHistoryBusy(),
      liveUrl:
        typeof window === 'undefined'
          ? null
          : window.location.pathname + window.location.search,
      viewportResolved: isViewportResolved,
      isMobile,
    });

    if (decision.kind === 'full-page') {
      setActiveModule('feed-post-detail');
      return;
    }
    if (decision.kind !== 'overlay') return;

    // Predvoleny modul ako pozadie: pri priamom vstupe neexistuje ziadny
    // predosly stav appky, na ktory by sa dalo vratit.
    setActiveModule('home');
    // Adresa uz na prispevok ukazuje - okno ju len prevezme, nepridava dalsi
    // zaznam do historie.
    adoptFeedOverlayHistory();
    setFeedOverlayTarget(decision.target);
  }, [
    feedPostIdFromPath,
    setActiveModule,
    feedOverlayTarget,
    setFeedOverlayTarget,
    isMobile,
    isViewportResolved,
  ]);

  useEffect(() => {
    if (portfolioCreateMatch) {
      setActiveModule('portfolio-create');
    }
  }, [portfolioCreateMatch, setActiveModule]);
}

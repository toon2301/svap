'use client';

import { useCallback } from 'react';
import { currentBrowserUrl } from '@/utils/currentBrowserUrl';
import {
  createDesktopSettingsReturnTarget,
  getDesktopSettingsSectionPath,
  withDesktopSettingsOriginHistory,
  type DesktopSettingsReturnTarget,
} from '../../../hooks/desktopSettingsNavigation';
import { requestOfferWatchMobile } from '../mobile/offerWatchMobileNavigation';

const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';

function isMobileViewport(): boolean {
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  }
  return window.innerWidth < 1024;
}

type OfferWatchResultsNavigationParams = {
  activeModule: string;
  openDesktopSettings: (returnTarget: DesktopSettingsReturnTarget | null) => void;
  setActiveRightItem: (itemId: string) => void;
};

/**
 * Otvorí správu sledovaní cez natívny tok aktuálneho rozloženia.
 *
 * Mobil použije existujúce celostránkové okno. Desktop označí pôvodný
 * history záznam, aby sa zo sekcie Nastavení vrátil na presnú URL výsledkov.
 */
export function useOfferWatchResultsNavigation({
  activeModule,
  openDesktopSettings,
  setActiveRightItem,
}: OfferWatchResultsNavigationParams): () => void {
  return useCallback(() => {
    if (typeof window === 'undefined') return;

    if (isMobileViewport()) {
      requestOfferWatchMobile();
      return;
    }

    const returnTarget = createDesktopSettingsReturnTarget(
      activeModule,
      currentBrowserUrl('/dashboard/watches'),
    );
    const settingsPath = getDesktopSettingsSectionPath('offer-watches');
    if (!returnTarget || !settingsPath) return;

    window.history.replaceState(
      withDesktopSettingsOriginHistory(window.history.state, returnTarget),
      '',
      returnTarget.url,
    );
    openDesktopSettings(returnTarget);
    setActiveRightItem('offer-watches');

    // openDesktopSettings vytvorilo cieľový záznam s návratovým markerom.
    // Sekciu meníme cez replace, aby medzikrok /settings nevytvoril prázdny Back.
    window.history.replaceState(window.history.state, '', settingsPath);
  }, [activeModule, openDesktopSettings, setActiveRightItem]);
}

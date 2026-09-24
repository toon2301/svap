'use client';

import { useCallback } from 'react';
import { currentBrowserUrl } from '@/utils/currentBrowserUrl';
import {
  createDesktopSettingsReturnTarget,
  getDesktopSettingsSectionPath,
  withDesktopSettingsOriginHistory,
  type DesktopSettingsReturnTarget,
} from '../../../hooks/desktopSettingsNavigation';

type OfferWatchResultsNavigationParams = {
  activeModule: string;
  openDesktopSettings: (returnTarget: DesktopSettingsReturnTarget | null) => void;
  setActiveRightItem: (itemId: string) => void;
};

/**
 * Pripraví otvorenie správy sledovaní s presným návratom na aktuálne výsledky.
 *
 * Samotný prechod necháva na centrálnej dashboard logike. Tento hook iba označí
 * pôvodný history záznam a po otvorení Nastavení zvolí ich správnu sekciu.
 */
export function useOfferWatchResultsNavigation({
  activeModule,
  openDesktopSettings,
  setActiveRightItem,
}: OfferWatchResultsNavigationParams): () => void {
  return useCallback(() => {
    if (typeof window === 'undefined') return;

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

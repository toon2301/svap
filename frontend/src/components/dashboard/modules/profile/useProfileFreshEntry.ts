'use client';

/**
 * Otvorenie profilu od vrchu pri NOVOM vstupe.
 *
 * Beží pri mounte aj pri zmene zobrazovaného profilu – z profilu na profil sa
 * dá prejsť klientsky (`goToUserProfile` → `pushState`), takže modul sa
 * neodmountuje a bez tohto by ostal scroll aj záložka po predošlom profile.
 */

import { useEffect, useState } from 'react';
import { takeProfileFreshEntry } from './profileFreshEntry';

/** Scrollovateľná plocha dashboardu – tá istá, akú používa feed aj profil. */
const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';

/**
 * Vracia `true`, keď ide o nový vstup – volajúci má vtedy prepnúť záložku na
 * východziu. Scroll na vrch si hook spraví sám.
 */
export function useProfileFreshEntry(profileKey?: string | number | null): boolean {
  const [isFreshEntry, setIsFreshEntry] = useState(false);

  useEffect(() => {
    if (!takeProfileFreshEntry()) {
      setIsFreshEntry(false);
      return;
    }
    setIsFreshEntry(true);
    if (typeof document === 'undefined') return;
    const main = document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
    if (main) main.scrollTop = 0;
  }, [profileKey]);

  return isFreshEntry;
}

'use client';

/**
 * Otvorenie profilu od vrchu pri NOVOM vstupe.
 *
 * Beží pri mounte aj pri zmene zobrazovaného profilu – z profilu na profil sa
 * dá prejsť klientsky (`goToUserProfile` → `pushState`), takže modul sa
 * neodmountuje a bez tohto by ostal scroll aj záložka po predošlom profile.
 */

import { useEffect, useRef, useState } from 'react';
import {
  discardProfileFreshEntryFor,
  onProfileFreshEntryMarked,
  takeProfileFreshEntry,
} from './profileFreshEntry';

/** Scrollovateľná plocha dashboardu – tá istá, akú používa feed aj profil. */
const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';

/**
 * Vracia `true`, keď ide o nový vstup do TOHTO profilu – volajúci má vtedy
 * prepnúť záložku na východziu. Scroll na vrch si hook spraví sám.
 *
 * `profileId` / `profileSlug` identifikujú zobrazený profil; príznak iného
 * profilu sa tu nespotrebuje ako nový vstup.
 */
export function useProfileFreshEntry(
  profileId: number | null | undefined,
  profileSlug?: string | null,
): boolean {
  const [isFreshEntry, setIsFreshEntry] = useState(false);

  // Aktuálna identita pre odber nižšie – odber vzniká raz.
  const profileRef = useRef({ id: profileId, slug: profileSlug });
  profileRef.current = { id: profileId, slug: profileSlug };

  useEffect(() => {
    if (!takeProfileFreshEntry({ id: profileId, slug: profileSlug })) {
      setIsFreshEntry(false);
      return;
    }
    setIsFreshEntry(true);
    if (typeof document === 'undefined') return;
    const main = document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
    if (main) main.scrollTop = 0;
  }, [profileId, profileSlug]);

  // Preklik na profil, ktorý už je na obrazovke: žiadny nový vstup, a príznak
  // nesmie ostať čakať na neskorší krok späť/dopredu.
  useEffect(
    () => onProfileFreshEntryMarked(() => discardProfileFreshEntryFor(profileRef.current)),
    [],
  );

  return isFreshEntry;
}

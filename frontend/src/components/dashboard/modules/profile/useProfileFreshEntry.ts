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
import { clearRememberedProfileScroll, startProfileScrollRestore } from './profileScrollMemory';
import { scrollDebugTag } from '../../debug/scrollDebugHooks'; // [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]

/** Scrollovateľná plocha dashboardu – tá istá, akú používa feed aj profil. */
const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';

/**
 * Vracia `true`, keď ide o nový vstup do TOHTO profilu – volajúci má vtedy
 * prepnúť záložku na východziu. Scroll na vrch si hook spraví sám.
 *
 * Pri návrate z recenzií (nie nový vstup) hook sám vráti scroll na miesto, odkiaľ sa
 * recenzie otvorili – viď `profileScrollMemory`.
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

  // Bol posledný otvorený profil nový vstup? Číta ho obnova pozície nižšie.
  const openedAsFreshEntryRef = useRef(false);
  // Zastavenie rozbehnutej obnovy pozície. Obnova patrí profilu, pre ktorý sa začala.
  const stopRestoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Modul ostáva zobrazený aj pri preklikoch na iný profil (`goToUserProfile` s ID z cache,
    // krok histórie medzi profilmi) a mení sa len profil: pozícia predošlého profilu by sa inak
    // zapísala do nového, hneď ako jeho obsah dorastie.
    stopRestoreRef.current?.();
    const isFresh = takeProfileFreshEntry({ id: profileId, slug: profileSlug });
    openedAsFreshEntryRef.current = isFresh;
    if (!isFresh) {
      setIsFreshEntry(false);
      return;
    }
    setIsFreshEntry(true);
    // Nový vstup sa otvára od vrchu a stará pozícia sa zabudne – aj pri zmene profilu, kedy sa
    // obnova pri zobrazení modulu už nespúšťa.
    clearRememberedProfileScroll();
    if (typeof document === 'undefined') return;
    const main = document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
    scrollDebugTag('fresh-entry reset'); // [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
    if (main) main.scrollTop = 0;
  }, [profileId, profileSlug]);

  // Návrat z recenzií: profil stojí nanovo a od vrchu, pozícia sa vráti po dorastení
  // obsahu. Len pri zobrazení modulu (nie pri zmene profilu) a nikdy pri novom vstupe –
  // ten pozíciu zabudol už efekt vyššie (vďaka tomu druhý beh vývojového dvojitého mountu,
  // ktorý príznak už nevidí, nemá čo obnoviť). Beží po efekte vyššie.
  useEffect(() => {
    if (openedAsFreshEntryRef.current) return;
    const stop = startProfileScrollRestore();
    stopRestoreRef.current = stop;
    return stop;
  }, []);

  // Nový vstup sa oznamuje PRED zmenou profilu a adresy (`goToUserProfile`): rozbehnutá obnova
  // sa končí hneď a pozícia sa zabudne, nech ju nezapíše nič, čo príde medzi oznámením a prekreslením.
  // Preklik na profil, ktorý už je na obrazovke: žiadny nový vstup, a príznak
  // nesmie ostať čakať na neskorší krok späť/dopredu.
  useEffect(
    () =>
      onProfileFreshEntryMarked(() => {
        stopRestoreRef.current?.();
        clearRememberedProfileScroll();
        discardProfileFreshEntryFor(profileRef.current);
      }),
    [],
  );

  return isFreshEntry;
}

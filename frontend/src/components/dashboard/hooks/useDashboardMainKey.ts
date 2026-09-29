'use client';

/**
 * Nový element `<main>` pri každej zmene modulu dashboardu.
 *
 * Namerané na iPhone cez dočasný ladiaci pásik (`?debugscroll=1`, priečinok
 * `../debug/`): dashboard má jediný scrollovateľný kontajner `<main
 * data-dashboard-main>`, ktorý pri prepnutí modulu iba vymení obsah. Pri
 * vstupe na vlastný profil z hlboko odscrollovanej Nástenky si iOS pozíciu
 * tohto elementu drží MIMO JavaScriptu – aj po skutočnom zápise (napr.
 * `main.scrollTop = 2338 → 0`) ju pri náraste obsahu vráti, bez akéhokoľvek
 * ďalšieho zápisu z JS. Profil tak niekedy ostal odscrollovaný dole a scroll
 * na zvýraznenú ponuku štartoval zospodu, alebo ponuka ostala mimo obrazovky.
 *
 * Nový DOM element žiadnu takú pamäť nemá – iOS si k nemu nemá čo vrátiť,
 * pretože ešte nikdy scrollovaný nebol. V 10 z 10 vstupov s touto opravou
 * (oproti 4 z 5 zlyhaniam bez nej, na tom istom zariadení a tej istej karte)
 * sa skok neobjavil ani raz. Vedľajší, no dôležitý efekt: každý CIEĽOVÝ modul
 * (nielen ten, z ktorého sa odchádza) tiež dostane čerstvý element, takže
 * rovnaké riziko no-op resetu zaniká aj pri prechodoch, ktoré si scroll
 * vôbec nenulujú (napr. Štatistiky, Správy, Upozornenia, Obľúbené, Žiadosti).
 *
 * `<main>` nemá vlastný React stav ani refy mimo tohto komponentu – onboarding
 * (`useOnboardingScrollLock`, `useOnboardingTargetRect`) si ho pri KAŽDEJ
 * zmene modulu aj tak prekresľuje nanovo (viditeľnosť/meranie sú viazané na
 * zhodu s `activeModule`), takže výmena elementu mu neuškodí.
 */

import { useState } from 'react';

/**
 * Vracia kľúč pre `<main key={...}>` – rovnaký, kým sa `activeModule` nezmení,
 * inak nový. Odvodené počas renderu (vzor z dokumentácie Reactu), nie efektom:
 * inak by prvý render s obsahom starého modulu ešte stihol namaľovať snímok
 * predtým, než by sa kľúč stihol zmeniť.
 */
export function useDashboardMainKey(activeModule: string): string {
  const [track, setTrack] = useState({ module: activeModule, generation: 0 });
  if (track.module !== activeModule) {
    const next = { module: activeModule, generation: track.generation + 1 };
    setTrack(next);
    return `main-${next.generation}`;
  }
  return `main-${track.generation}`;
}

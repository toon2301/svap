'use client';

/**
 * Nový element `<main>` pri každej zmene modulu dashboardu.
 *
 * Namerané na iPhone: dashboard má jediný scrollovateľný kontajner `<main
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
 * `<main>` nemá vlastný React stav ani refy mimo tohto komponentu. Kód, ktorý si
 * element zachytáva v efekte, s výmenou počíta: tutoriál posúva krok aj modul v
 * jednom kroku, takže jeho viditeľnosť sa pri výmene môže nezmeniť (ostane
 * zapnutá) a efekty viazané na viditeľnosť sa nespustia znova –
 * `useOnboardingScrollLock` preto sám sleduje výmenu `<main>` a zámok prenesie
 * na nový element; `useOnboardingTargetRect` si elementy hľadá pri každom meraní
 * nanovo a scroll zachytáva aj na `window` (capture).
 *
 * „Upraviť profil" je ten istý modul `profile` (mení sa len pravý panel), takže
 * formulár – s tlačidlom „Uložiť" úplne dole – zdieľal `<main>`, a tým aj
 * scroll, s profilom: po uložení sa profil otvoril odscrollovaný. Platí to na
 * mobile aj na desktope (formulár sa vymieňa priamo v `<main>`), preto
 * `DashboardLayout` pre úpravu profilu posiela vlastnú „obrazovku"
 * (`profile-edit`) namiesto názvu modulu.
 */

import { useState } from 'react';

/**
 * Vracia kľúč pre `<main key={...}>` – rovnaký, kým sa `screen` (modul alebo
 * samostatná obrazovka v rámci modulu) nezmení, inak nový. Odvodené počas
 * renderu (vzor z dokumentácie Reactu), nie efektom: inak by prvý render
 * s obsahom starej obrazovky ešte stihol namaľovať snímok predtým, než by sa
 * kľúč stihol zmeniť.
 *
 * `hold`: kým je zapnuté, kľúč sa nemení ani pri zmene `screen` a zmena sa nezapamätá. Použitie: mobilný zoznam
 * Nastavení je panel, ktorý sa vsúva ponad obrazovku, z ktorej sa otvoril. Pod ním musí ostať ONA, nie nový
 * prázdny `<main>`. Po zatvorení zoznamu sa `screen` porovná s obrazovkou spred podržania, takže návrat na ten istý
 * modul nevymení element, kým iná obrazovka dostane nový ako vždy.
 */
export function useDashboardMainKey(screen: string, hold = false): string {
  const [track, setTrack] = useState({ screen, generation: 0 });
  if (!hold && track.screen !== screen) {
    const next = { screen, generation: track.generation + 1 };
    setTrack(next);
    return `main-${next.generation}`;
  }
  return `main-${track.generation}`;
}

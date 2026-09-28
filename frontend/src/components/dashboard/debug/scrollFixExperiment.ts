'use client';

/**
 * [EXPERIMENT ?scrollfix=b – DOČASNÉ: po overení na iPhone ODSTRÁNIŤ alebo zmeniť na opravu]
 *
 * Experiment B: pri každej zmene modulu nový element `<main>`.
 *
 * Namerané cez ?debugscroll=1: iOS si pozíciu scrollu `<main>` drží mimo
 * JavaScriptu a po vstupe z hlboko odscrollovanej Nástenky ju vráti, keď
 * profil narastie – aj keď ju JS tesne predtým skutočne vynuloval (2338 → 0).
 * Nový element žiadnu zapamätanú pozíciu nemá.
 *
 * `?scrollfix=b` zapne, `?scrollfix=0` vypne; stav sa drží v sessionStorage,
 * lebo appka si adresu priebežne prepisuje. Bez príznaku sa nemení nič.
 */

import { useState } from 'react';

export const SCROLL_FIX_FLAG_KEY = 'svaply.scrollfix';

function sessionStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Prečíta `?scrollfix=b|0` a stav uloží; bez parametra platí uložený stav. */
export function resolveScrollFixFlag(search: string = typeof window === 'undefined' ? '' : window.location.search): boolean {
  const param = new URLSearchParams(search).get('scrollfix');
  const store = sessionStore();
  try {
    if (param === 'b') store?.setItem(SCROLL_FIX_FLAG_KEY, 'b');
    if (param === '0') store?.removeItem(SCROLL_FIX_FLAG_KEY);
  } catch {
    // Úložisko nedostupné – platí aspoň parameter.
  }
  if (param === 'b') return true;
  if (param === '0') return false;
  try {
    return store?.getItem(SCROLL_FIX_FLAG_KEY) === 'b';
  } catch {
    return false;
  }
}

/** Stav, ktorý naozaj použil `useScrollFixMainKey`; `null` = ešte nevyhodnotený. */
let resolvedScrollFix: boolean | null = null;

/**
 * Pre hlavičku ladiaceho pásika: `b` zapnutý, `-` vypnutý, `?` nevyhodnotený.
 * Hlási stav hooku, nie úložiska – bez sessionStorage zapne experiment aj
 * samotný parameter v adrese.
 */
export function scrollFixLabel(): string {
  if (resolvedScrollFix === null) return '?';
  return resolvedScrollFix ? 'b' : '-';
}

/** Len pre testy – vyčistí vyhodnotený stav medzi prípadmi. */
export function resetScrollFixForTests(): void {
  resolvedScrollFix = null;
}

/**
 * Kľúč pre `<main>`. Bez experimentu stále ten istý; s ním sa zmení pri každej
 * zmene modulu, takže React vytvorí nový element. Prvé vykreslenie má kľúč
 * rovnaký v oboch prípadoch – po načítaní stránky sa nič neremountuje.
 */
export function useScrollFixMainKey(activeModule: string): string {
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    resolvedScrollFix = resolveScrollFixFlag();
    return resolvedScrollFix;
  });
  const [track, setTrack] = useState({ module: activeModule, generation: 0 });
  if (!enabled) return 'main-0';
  if (track.module !== activeModule) {
    const next = { module: activeModule, generation: track.generation + 1 };
    // Odvodený stav z predošlého vykreslenia (vzor z dokumentácie Reactu) –
    // React vykreslenie hneď zopakuje, ešte pred commitom.
    setTrack(next);
    return `main-${next.generation}`;
  }
  return `main-${track.generation}`;
}

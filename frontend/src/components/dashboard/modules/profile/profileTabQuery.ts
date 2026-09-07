'use client';

/**
 * Aktívna záložka profilu naviazaná na adresu (`?tab=`).
 *
 * Bez toho žila záložka výhradne v `useState` konkrétneho modulu, takže F5 aj
 * krok späť ju vždy zhodili na východziu. Cesty ako `/dashboard/users/x/posts`
 * síce existujú, ale nesú len POČIATOČNÚ hodnotu – prepnutie záložky v UI
 * adresu nemenilo vôbec.
 *
 * Query parameter (a nie ďalší segment cesty) zámerne: záložka je stav
 * JEDNEJ stránky profilu, nie iná stránka. Cesta tak ostáva nedotknutá aj so
 * všetkými existujúcimi route-mi a s `?offer=`/`?highlight=`, ktoré appka na
 * profile už používa.
 *
 * Zápis ide cez `history.pushState`, nie cez router: mení sa len adresa toho,
 * čo je už na obrazovke – prekreslenie stránky by zbytočne zhodilo scroll aj
 * načítané zoznamy. Krok späť sa tým zachová a číta sa v `popstate`.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ProfileTab } from './profileTypes';

export const PROFILE_TAB_QUERY_KEY = 'tab';

const KNOWN_TABS: readonly ProfileTab[] = ['offers', 'portfolio', 'posts', 'tagged'];

/** Hodnota z adresy na záložku – neznáme sa zahodí, nie „opraví". */
export function parseProfileTab(value: string | null | undefined): ProfileTab | null {
  const candidate = String(value ?? '').trim();
  return KNOWN_TABS.includes(candidate as ProfileTab)
    ? (candidate as ProfileTab)
    : null;
}

/** Záložka z query časti adresy (`?tab=posts`), alebo `null`. */
export function readProfileTabFromSearch(search: string): ProfileTab | null {
  const query = String(search ?? '');
  return parseProfileTab(
    new URLSearchParams(query.startsWith('?') ? query.slice(1) : query).get(
      PROFILE_TAB_QUERY_KEY,
    ),
  );
}

/**
 * Tá istá adresa s prepísaným `?tab=`.
 *
 * Ostatné parametre ostávajú – na profile s nimi appka počíta (`?offer=`,
 * `?highlight=`), takže prepnutie záložky ich nesmie zmazať.
 */
export function buildProfileTabUrl(currentUrl: string, tab: ProfileTab): string {
  const [pathWithQuery = '', hash = ''] = String(currentUrl).split('#');
  const [path = '', query = ''] = pathWithQuery.split('?');
  const params = new URLSearchParams(query);
  params.set(PROFILE_TAB_QUERY_KEY, tab);
  const search = params.toString();
  return `${path}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`;
}

function currentUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function currentTab(): ProfileTab | null {
  if (typeof window === 'undefined') return null;
  return readProfileTabFromSearch(window.location.search);
}

/**
 * Stav aktívnej záložky, ktorého zdrojom pravdy je adresa.
 *
 * `fallbackTab` je to, čo platí, keď adresa `?tab=` nemá – teda hodnota
 * odvodená z cesty (`/portfolio` → `portfolio`) alebo východzia záložka.
 */
export function useProfileTabQuery(
  fallbackTab: ProfileTab,
): [ProfileTab, (tab: ProfileTab) => void] {
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    () => currentTab() ?? fallbackTab,
  );

  // Zmenil sa východzí kontext (iná cesta, iný profil) – adresa má prednosť.
  useEffect(() => {
    setActiveTab(currentTab() ?? fallbackTab);
  }, [fallbackTab]);

  // Krok späť/dopredu prepne záložku spolu s adresou.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => setActiveTab(currentTab() ?? fallbackTab);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fallbackTab]);

  const changeTab = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;
    // Stav histórie sa PONECHÁVA – nesú v ňom svoje štítky iné časti appky
    // (návrat z nastavení, mobilný panel sledovaných ponúk) a prepnutie
    // záložky im do toho nemá čo hovoriť.
    window.history.pushState(
      window.history.state,
      '',
      buildProfileTabUrl(currentUrl(), tab),
    );
  }, []);

  return [activeTab, changeTab];
}

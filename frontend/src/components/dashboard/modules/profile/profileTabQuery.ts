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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfileTab } from './profileTypes';

export type ProfileTabChangeOptions = {
  /**
   * Prepíš aktuálny záznam histórie namiesto pridania nového.
   *
   * Pre ODVODENÉ zmeny – appka si sama opravuje záložku podľa toho, kam
   * preklik smeruje. Taká zmena nie je navigácia používateľa, takže si nemá
   * brať vlastný krok späť: inak by sa Back vracal do záložky, ktorú si
   * nevybral. Priame kliky na záložky ostávajú `push`.
   */
  replace?: boolean;
};

export type ProfileTabChange = (
  tab: ProfileTab,
  options?: ProfileTabChangeOptions,
) => void;

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
  // Delí sa na PRVOM oddeľovači, nie na každom: fragment smie obsahovať ďalšie
  // `#` a hodnota v query ďalšie `?` (napr. `?redirect=/x?y=1`). `split()` by
  // takú adresu ticho skrátil – z návratovej cesty by zmizol kus parametra.
  const url = String(currentUrl);
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : url.slice(hashAt + 1);

  const queryAt = beforeHash.indexOf('?');
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const query = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1);

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
): [ProfileTab, ProfileTabChange] {
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    () => currentTab() ?? fallbackTab,
  );
  // Aktuálna hodnota pre porovnanie v `changeTab`. Cez ref, aby callback
  // nemenil identitu pri každom prepnutí záložky.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

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

  const changeTab = useCallback(
    (tab: ProfileTab, options?: ProfileTabChangeOptions) => {
      // Rovnaká záložka = nedeje sa nič. Bez tejto brzdy pridával krok do
      // histórie aj klik na UŽ AKTÍVNU záložku a aj odvodený prepis na tú istú
      // hodnotu – používateľ sa potom musel cez tie prázdne kroky preklikať.
      if (activeTabRef.current === tab) return;
      activeTabRef.current = tab;
      setActiveTab(tab);
      if (typeof window === 'undefined') return;

      const url = buildProfileTabUrl(currentUrl(), tab);
      // Stav histórie sa PONECHÁVA – nesú v ňom svoje štítky iné časti appky
      // (návrat z nastavení, mobilný panel sledovaných ponúk) a prepnutie
      // záložky im do toho nemá čo hovoriť.
      if (options?.replace) {
        window.history.replaceState(window.history.state, '', url);
        return;
      }
      window.history.pushState(window.history.state, '', url);
    },
    [],
  );

  return [activeTab, changeTab];
}

'use client';

/**
 * Ktorý modul ukázať, keď sa dashboard namountuje – podľa ADRESY, nie naslepo
 * podľa stránky.
 *
 * Appka zapisuje do histórie dvoma spôsobmi a každý vytvorí záznam iného
 * druhu:
 *
 *  - `pushState` (prepnutie modulu, preklik na profil) – Next do záznamu
 *    skopíruje strom stránky, ktorá je PRÁVE zobrazená, nie tej, ktorú adresa
 *    predstavuje;
 *  - `router.push` / `replace` (výsledok vyhľadávania, detail portfólia,
 *    notifikácie) – záznam dostane strom novej stránky.
 *
 * Krok späť cez hranicu stránky preto obnoví stránku, ktorej props nesedia s
 * adresou: záznam `/dashboard/search` vytvorený na Nástenke obnoví stránku
 * `/dashboard` s `initialRoute="home"`. Popstate listener (`syncModuleFromPath`)
 * to nezachráni – beží v odchádzajúcej inštancii, ktorá vzápätí zanikne.
 *
 * Riešenie je jedno centrálne miesto: pri mounte sa props zosúladia s adresou
 * rovnakým mapovaním, aké používa popstate. Pri tvrdom načítaní a pri bežnej
 * navigácii adresa so stránkou súhlasí, takže sa nemení nič.
 */

import { useRef, useState } from 'react';
import type { ProfileTab } from '../modules/profile/profileTypes';

/** Props dashboardu, ktoré opisujú, čo sa má zobraziť. */
export type DashboardRouteProps = {
  initialRoute?: string;
  initialViewedUserId?: number | null;
  initialHighlightedSkillId?: number | null;
  initialProfileTab?: ProfileTab;
  initialProfileSlug?: string | null;
  initialRightItem?: string | null;
  initialOfferId?: number | null;
  initialPortfolioItemId?: number | null;
  initialFeedPostId?: number | null;
};

const USERS_PATH = /^\/dashboard\/users\/([^/]+)(?:\/portfolio(?:\/(?:\d+|create))?)?\/?$/;
const PORTFOLIO_DETAIL_PATH = /^\/dashboard\/users\/[^/]+\/portfolio\/(\d+)\/?$/;
const PORTFOLIO_CREATE_PATH = /^\/dashboard\/users\/[^/]+\/portfolio\/create\/?$/;
const PORTFOLIO_LIST_PATH = /^\/dashboard\/users\/[^/]+\/portfolio\/?$/;
const USER_PROFILE_PATH = /^\/dashboard\/users\/[^/]+\/?$/;

/**
 * Modul pre adresu – mapovanie, ktoré používa aj reakcia na krok späť.
 *
 * `null` = adresu toto mapovanie nepozná a o module rozhoduje stránka.
 */
export function dashboardModuleFromPath(pathname: string): string | null {
  const p = pathname || '';
  if (/^\/dashboard\/requests\/?$/.test(p)) return 'requests';
  if (/^\/dashboard\/search\/?$/.test(p)) return 'search';
  if (/^\/dashboard\/messages(?:\/\d+)?\/?$/.test(p)) return 'messages';
  if (/^\/dashboard\/settings\/notifications\/?$/.test(p)) return 'notification-settings';
  if (/^\/dashboard\/settings\/account\/?$/.test(p)) return 'account-settings';
  if (/^\/dashboard\/settings\/blocked\/?$/.test(p)) return 'blocked-users';
  if (p === '/dashboard' || p === '/dashboard/') return 'home';
  if (/^\/dashboard\/profile\/?$/.test(p)) return 'profile';
  if (PORTFOLIO_DETAIL_PATH.test(p)) return 'portfolio-detail';
  if (PORTFOLIO_CREATE_PATH.test(p)) return 'portfolio-create';
  if (PORTFOLIO_LIST_PATH.test(p)) return 'user-profile';
  if (USER_PROFILE_PATH.test(p)) return 'user-profile';
  return null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Slug alebo číselné ID používateľa z profilovej adresy (chybné kódovanie → `null`). */
export function dashboardUserIdentifierFromPath(pathname: string): string | null {
  const match = String(pathname || '').match(USERS_PATH);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function positiveInteger(value: string | null | undefined): number | null {
  if (value == null || !String(value).trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Props, aké by pre túto adresu dala jej vlastná stránka (`app/dashboard/...`).
 * `null`, keď adresu mapovanie nepozná.
 */
function routePropsFromPath(pathname: string, search: string): DashboardRouteProps | null {
  const route = dashboardModuleFromPath(pathname);
  if (route === null) return null;

  const props: DashboardRouteProps = { initialRoute: route };
  const identifier = dashboardUserIdentifierFromPath(pathname);
  if (!identifier) return props;

  const numericId = /^\d+$/.test(identifier) ? Number(identifier) : null;
  props.initialViewedUserId = numericId;

  if (route === 'portfolio-detail' || route === 'portfolio-create') {
    props.initialProfileSlug = numericId === null ? identifier : null;
    props.initialProfileTab = 'portfolio';
    if (route === 'portfolio-detail') {
      props.initialPortfolioItemId = positiveInteger(
        pathname.match(PORTFOLIO_DETAIL_PATH)?.[1],
      );
    }
    return props;
  }

  // `user-profile`: profil aj jeho zoznam portfólia dávajú slug = identifikátor.
  props.initialProfileSlug = identifier;
  if (PORTFOLIO_LIST_PATH.test(pathname)) {
    props.initialProfileTab = 'portfolio';
  } else {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    props.initialHighlightedSkillId = positiveInteger(params.get('offer') ?? params.get('highlight'));
  }
  return props;
}

function identityOf(props: DashboardRouteProps): string {
  const slug = String(props.initialProfileSlug ?? '').trim();
  if (slug) return safeDecode(slug);
  return props.initialViewedUserId != null ? String(props.initialViewedUserId) : '';
}

/**
 * Popisujú props a adresa to isté?
 *
 * Zvýraznenie sa neporovnáva – je v query, nie v ceste, a stránka ho číta
 * sama. Ostatné polia (`null` aj chýbajúce sú to isté) áno.
 */
function describeSameRoute(a: DashboardRouteProps, b: DashboardRouteProps): boolean {
  return (
    (a.initialRoute ?? 'home') === (b.initialRoute ?? 'home') &&
    identityOf(a) === identityOf(b) &&
    (a.initialProfileTab ?? null) === (b.initialProfileTab ?? null) &&
    (a.initialRightItem ?? null) === (b.initialRightItem ?? null) &&
    (a.initialOfferId ?? null) === (b.initialOfferId ?? null) &&
    (a.initialPortfolioItemId ?? null) === (b.initialPortfolioItemId ?? null) &&
    (a.initialFeedPostId ?? null) === (b.initialFeedPostId ?? null)
  );
}

/**
 * Props pre namountovaný dashboard: stránkové, ak súhlasia s adresou, inak
 * odvodené z adresy.
 */
export function resolveDashboardRouteProps(
  pageProps: DashboardRouteProps,
  pathname: string | null | undefined,
  search = '',
): DashboardRouteProps {
  if (!pathname) return pageProps;
  const fromPath = routePropsFromPath(pathname, search);
  if (fromPath === null || describeSameRoute(pageProps, fromPath)) return pageProps;
  return fromPath;
}

function sameProps(a: DashboardRouteProps, b: DashboardRouteProps): boolean {
  return (
    a.initialRoute === b.initialRoute &&
    a.initialViewedUserId === b.initialViewedUserId &&
    a.initialHighlightedSkillId === b.initialHighlightedSkillId &&
    a.initialProfileTab === b.initialProfileTab &&
    a.initialProfileSlug === b.initialProfileSlug &&
    a.initialRightItem === b.initialRightItem &&
    a.initialOfferId === b.initialOfferId &&
    a.initialPortfolioItemId === b.initialPortfolioItemId &&
    a.initialFeedPostId === b.initialFeedPostId
  );
}

/**
 * Zosúladenie props s adresou – LEN pri mounte.
 *
 * `pathname` musí prísť z routera (`usePathname`), nie z `window.location`:
 * pri `router.push` sa nová stránka vykreslí skôr, než Next zapíše adresu do
 * prehliadača, takže `window.location` by v tej chvíli ukazovala ešte na
 * predošlú stránku. Router má adresu aj strom zmenené naraz.
 *
 * Po mounte sa adresa už nečíta: mení ju každé prepnutie modulu (`pushState`)
 * a props majú ostať také, s akými sa inštancia namountovala – rovnako ako pri
 * tvrdom načítaní. Keď stránka pošle NOVÉ props (navigácia v rámci tej istej
 * stránky), platia odvtedy len tie.
 */
export function useDashboardMountRoute(
  pageProps: DashboardRouteProps,
  pathname: string | null | undefined,
  search = '',
): DashboardRouteProps {
  const [mount] = useState(() => ({
    pageProps: { ...pageProps },
    resolved: resolveDashboardRouteProps(pageProps, pathname, search),
  }));
  const followPageProps = useRef(false);
  if (!followPageProps.current && !sameProps(mount.pageProps, pageProps)) {
    followPageProps.current = true;
  }
  return followPageProps.current ? pageProps : mount.resolved;
}

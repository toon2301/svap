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
import {
  dashboardModuleFromPath,
  dashboardUserIdentifierFromPath,
  matchDashboardRoute,
  type DashboardRouteProps,
} from './dashboardRoutes';

export { dashboardModuleFromPath, dashboardUserIdentifierFromPath };
export type { DashboardRouteProps };

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
  const fromPath = matchDashboardRoute(pathname, search);
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

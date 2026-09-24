'use client';

/**
 * Čo ktorá `/dashboard` adresa znamená – JEDEN zoznam pre celú appku.
 *
 * Znalosť „adresa → modul" bola rozdrobená: vlastný reťazec pri kroku späť
 * (`syncModuleFromPath`), ďalší pri mounte a k tomu props 30+ stránok v
 * `app/dashboard`. Zakaždým poznal každý kus len časť, takže pri Obľúbených,
 * Upozorneniach, Nastaveniach, Jazyku, Type účtu, Súkromí, Zručnostiach,
 * Štatistikách a úprave profilu sa po kroku späť zobrazil modul predošlej
 * obrazovky.
 *
 * Tabuľka nie je nový model navigácie: každá položka dáva PRESNE tie props,
 * aké skladá zodpovedajúca stránka v `app/dashboard`. Stránky sú jediný úplný
 * zoznam adries, ktoré sa dajú otvoriť odkazom alebo F5, takže sú aj správnym
 * zdrojom pravdy. Strážny test nad súbormi stránok drží tabuľku úplnú.
 *
 * Tabuľka hovorí, ČO adresa znamená. Markery v `history.state` (pôvod
 * desktopových Nastavení, pôvod detailu portfólia) hovoria, ODKIAĽ sa
 * používateľ vrátil – to je iná otázka a tabuľka ju nenahrádza.
 */

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

type DashboardRoute = {
  /**
   * Priečinok stránky v `app/dashboard` (`''` = samotný `/dashboard`).
   * Drží väzbu na stránku, ktorú položka zrkadlí – overuje ju strážny test.
   */
  page: string;
  pattern: RegExp;
  /** Ukážková adresa pre obojsmerný test a pre strážny test stránok. */
  example: string;
  props: (params: string[], search: URLSearchParams) => DashboardRouteProps;
  /**
   * Adresa z parametrov – pre zapisovačov histórie.
   *
   * Len pri trasách s parametrom: bez neho je adresou sekcie samotný
   * `example`. Statický test zapisovačov drží obe strany na tomto zozname.
   */
  build?: (params: string[]) => string;
};

function positiveInteger(value: string | null | undefined): number | null {
  if (value == null || !String(value).trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Identifikátor z adresy profilu; chybné kódovanie → `null`. */
function decodeIdentifier(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/** Presne to, čo z `[userId]` skladajú stránky profilu. */
function profileIdentity(identifier: string): DashboardRouteProps {
  return {
    initialViewedUserId: /^\d+$/.test(identifier) ? Number(identifier) : null,
    initialProfileSlug: identifier,
  };
}

/** Portfólio si slug pri číselnom vlastníkovi zámerne nedrží (viď jeho stránky). */
function portfolioIdentity(identifier: string): DashboardRouteProps {
  const numeric = /^\d+$/.test(identifier);
  return {
    initialViewedUserId: numeric ? Number(identifier) : null,
    initialProfileSlug: numeric ? null : identifier,
    initialProfileTab: 'portfolio',
  };
}

function simple(page: string, path: string, route: string): DashboardRoute {
  return {
    page,
    pattern: new RegExp(`^${path.replace(/\//g, '\\/')}\\/?$`),
    example: path,
    props: () => ({ initialRoute: route }),
  };
}

/** Profilová podstránka s pravou sekciou (`/edit`, `/account`, `/language`, `/privacy`). */
function profileSection(page: string, segment: string, rightItem: string): DashboardRoute {
  return {
    page: `users/[userId]/${page}`,
    pattern: new RegExp(`^\\/dashboard\\/users\\/([^/]+)\\/${segment}\\/?$`),
    example: `/dashboard/users/jana/${segment}`,
    props: ([identifier]) => ({
      initialRoute: 'profile',
      ...profileIdentity(identifier),
      initialRightItem: rightItem,
    }),
  };
}

/** Profil so záložkou danou cestou (`/posts`, `/skills`, `/portfolio`). */
function profileTabRoute(page: string, segment: string, tab: ProfileTab): DashboardRoute {
  return {
    page: `users/[userId]/${page}`,
    pattern: new RegExp(`^\\/dashboard\\/users\\/([^/]+)\\/${segment}\\/?$`),
    example: `/dashboard/users/jana/${segment}`,
    props: ([identifier]) => ({
      initialRoute: 'user-profile',
      ...profileIdentity(identifier),
      initialProfileTab: tab,
    }),
  };
}

/**
 * Poradie je dôležité: konkrétnejšie cesty pred všeobecnejšími
 * (`/portfolio/5` pred `/portfolio`, tie pred samotným profilom).
 */
export const DASHBOARD_ROUTES: readonly DashboardRoute[] = [
  {
    page: '',
    pattern: /^\/dashboard\/?$/,
    example: '/dashboard',
    props: () => ({ initialRoute: 'home' }),
  },
  simple('home', '/dashboard/home', 'home'),
  simple('search', '/dashboard/search', 'search'),
  simple('requests', '/dashboard/requests', 'requests'),
  {
    // Starý tvar `/dashboard/messages/<id>` vedie na tú istú stránku
    // (presmerovanie na `?conversationId=` je v `next.config.js`).
    page: 'messages',
    pattern: /^\/dashboard\/messages(?:\/\d+)?\/?$/,
    example: '/dashboard/messages',
    props: () => ({ initialRoute: 'messages' }),
  },
  simple('notifications', '/dashboard/notifications', 'notifications'),
  simple('watches', '/dashboard/watches', 'watches'),
  simple('favorites', '/dashboard/favorites', 'favorites'),
  simple('statistics', '/dashboard/statistics', 'statistics'),
  simple('settings/notifications', '/dashboard/settings/notifications', 'notification-settings'),
  simple('settings/account', '/dashboard/settings/account', 'account-settings'),
  simple('settings/blocked', '/dashboard/settings/blocked', 'blocked-users'),
  {
    page: 'settings/watches',
    pattern: /^\/dashboard\/settings\/watches\/?$/,
    example: '/dashboard/settings/watches',
    props: () => ({ initialRoute: 'settings', initialRightItem: 'offer-watches' }),
  },
  simple('settings', '/dashboard/settings', 'settings'),
  simple('language', '/dashboard/language', 'language'),
  simple('privacy', '/dashboard/privacy', 'privacy'),
  simple('account-type', '/dashboard/account-type', 'account-type'),
  simple('profile', '/dashboard/profile', 'profile'),
  simple('skills/offer', '/dashboard/skills/offer', 'skills-offer'),
  simple('skills/search', '/dashboard/skills/search', 'skills-search'),
  simple('skills', '/dashboard/skills', 'skills'),
  {
    page: 'feed/[postId]',
    pattern: /^\/dashboard\/feed\/(\d+)\/?$/,
    example: '/dashboard/feed/7',
    build: ([postId]) => `/dashboard/feed/${postId}`,
    props: ([postId]) => ({
      initialRoute: 'feed-post-detail',
      initialFeedPostId: positiveInteger(postId),
    }),
  },
  {
    page: 'offers/[offerId]/reviews',
    pattern: /^\/dashboard\/offers\/(\d+)\/reviews\/?$/,
    example: '/dashboard/offers/3/reviews',
    props: ([offerId]) => ({
      initialRoute: 'offer-reviews',
      initialOfferId: positiveInteger(offerId),
    }),
  },
  {
    page: 'users/[userId]/portfolio/[portfolioId]',
    pattern: /^\/dashboard\/users\/([^/]+)\/portfolio\/(\d+)\/?$/,
    example: '/dashboard/users/jana/portfolio/5',
    props: ([identifier, itemId]) => ({
      initialRoute: 'portfolio-detail',
      ...portfolioIdentity(identifier),
      initialPortfolioItemId: positiveInteger(itemId),
    }),
  },
  {
    page: 'users/[userId]/portfolio/create',
    pattern: /^\/dashboard\/users\/([^/]+)\/portfolio\/create\/?$/,
    example: '/dashboard/users/jana/portfolio/create',
    props: ([identifier]) => ({
      initialRoute: 'portfolio-create',
      ...portfolioIdentity(identifier),
    }),
  },
  profileTabRoute('portfolio', 'portfolio', 'portfolio'),
  profileTabRoute('posts', 'posts', 'posts'),
  profileTabRoute('skills', 'skills', 'offers'),
  profileSection('edit', 'edit', 'edit-profile'),
  profileSection('account', 'account', 'account-type'),
  profileSection('language', 'language', 'language'),
  profileSection('privacy', 'privacy', 'privacy'),
  {
    page: 'users/[userId]',
    pattern: /^\/dashboard\/users\/([^/]+)\/?$/,
    example: '/dashboard/users/jana',
    // Kódovanie je protikus `decodeIdentifier` pri čítaní. Na dnešné adresy
    // nemá vplyv: slug je zo servera vždy `[a-z0-9.-]` a ID je číslo, takže
    // zapisovačom, ktoré kódovali, aj tým, čo nie, vychádza tá istá adresa.
    build: ([identifier]) => `/dashboard/users/${encodeURIComponent(identifier)}`,
    props: ([identifier], search) => ({
      initialRoute: 'user-profile',
      ...profileIdentity(identifier),
      initialHighlightedSkillId: positiveInteger(
        search.get('offer') ?? search.get('highlight'),
      ),
    }),
  },
];

function searchParamsOf(search: string): URLSearchParams {
  const value = String(search ?? '');
  return new URLSearchParams(value.startsWith('?') ? value.slice(1) : value);
}

/**
 * Props, aké by pre túto adresu dala jej vlastná stránka.
 * `null` = adresu tabuľka nepozná (o module rozhoduje stránka).
 */
export function matchDashboardRoute(
  pathname: string,
  search = '',
): DashboardRouteProps | null {
  const path = String(pathname || '');
  for (const route of DASHBOARD_ROUTES) {
    const match = path.match(route.pattern);
    if (!match) continue;
    const params = match.slice(1).map((value) => decodeIdentifier(value));
    // Chybne zakódovaný identifikátor: adresu radšej nechaj stránke.
    if (params.some((value) => value === null)) return null;
    return route.props(params as string[], searchParamsOf(search));
  }
  return null;
}

/** Modul pre adresu – to isté, čo `matchDashboardRoute`, len samotný modul. */
export function dashboardModuleFromPath(pathname: string): string | null {
  return matchDashboardRoute(pathname)?.initialRoute ?? null;
}

const NO_SEARCH = new URLSearchParams();

/**
 * Adresa, ktorú má zapisovač histórie zapísať pre danú sekciu dashboardu.
 *
 * Opak `matchDashboardRoute`: hľadá položku, ktorej adresa znamená PRESNE
 * tento modul (a prípadne túto pravú sekciu) a nič viac – teda stránku, ktorá
 * sekciu predstavuje celú. Trasy s parametrom sa takto skladať nedajú (adresa
 * profilu potrebuje identifikátor), tie majú vlastnú staviteľku.
 *
 * `null` = tabuľka pre takú sekciu adresu nemá; volajúci vtedy adresu NEMÁ
 * písať – zapísať uhádnutú by bola horšia chyba než nezapísať nič.
 */
export function dashboardSectionPath(
  moduleId: string,
  rightItem: string | null = null,
): string | null {
  for (const route of DASHBOARD_ROUTES) {
    if (route.page.includes('[')) continue;
    const props = route.props([], NO_SEARCH);
    if ((props.initialRoute ?? null) !== moduleId) continue;
    if ((props.initialRightItem ?? null) !== rightItem) continue;
    return route.example;
  }
  return null;
}

function builtPath(page: string, params: string[]): string | null {
  const route = DASHBOARD_ROUTES.find((candidate) => candidate.page === page);
  return route?.build?.(params) ?? null;
}

/** Adresa profilu podľa slugu alebo číselného ID. */
export function dashboardProfilePath(identifier: string): string | null {
  return builtPath('users/[userId]', [identifier]);
}

/** Adresa detailu príspevku (permalink). */
export function dashboardFeedPostPath(postId: string | number): string | null {
  return builtPath('feed/[postId]', [String(postId)]);
}

/**
 * Adresa Nástenky – východisko celej appky.
 *
 * Volajúci ju dostávajú ako hotový reťazec: prihlásenie ani návrat na Nástenku
 * nemá čo riešiť „a čo keď ju tabuľka nepozná". Že ju pozná, drží test.
 */
export const DASHBOARD_HOME_PATH = dashboardSectionPath('home') ?? '/dashboard';

/**
 * Sú to tie isté adresy dashboardu?
 *
 * Koncové lomítko je platný tvar tej istej cesty – `skipTrailingSlashRedirect`
 * ju nechá tak a vzory v tejto tabuľke ju tiež prijímajú (`\/?$`). Porovnanie
 * ciest ho preto musí zniesť, inak si appka pri `/dashboard/settings/` myslí,
 * že stojí inde.
 */
export function isSameDashboardPath(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null || b == null) return false;
  const normalize = (value: string) => value.replace(/\/+$/, '') || '/';
  return normalize(a) === normalize(b);
}

/** Slug alebo číselné ID používateľa z profilovej adresy. */
export function dashboardUserIdentifierFromPath(pathname: string): string | null {
  const match = String(pathname || '').match(
    /^\/dashboard\/users\/([^/]+)(?:\/[^/]+(?:\/[^/]+)?)?\/?$/,
  );
  return match ? decodeIdentifier(match[1]) : null;
}

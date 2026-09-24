/**
 * Zosúladenie props dashboardu s adresou pri mounte.
 *
 * Dve veci, na ktorých stojí bezpečnosť tejto opravy:
 *  - mapovanie adresy je PRESNE to, ktoré dovtedy používal popstate,
 *  - pre KAŽDÚ stránku dashboardu a jej vlastnú adresu sa nemení nič – mení sa
 *    len remount po kroku späť, kde strom stránky s adresou nesedí.
 */

import { renderHook } from '@testing-library/react';
import {
  dashboardModuleFromPath,
  dashboardUserIdentifierFromPath,
  resolveDashboardRouteProps,
  useDashboardMountRoute,
  type DashboardRouteProps,
} from './dashboardMountRoute';

/**
 * Adresa → modul. Zoznam zámerne opisuje aj adresy, ktoré staršie mapovanie
 * nepoznalo (12 z mapovania) – práve na nich sa po kroku späť zobrazoval modul
 * predošlej obrazovky.
 */
const EXPECTED_MODULES: Array<[string, string | null]> = [
  ['/dashboard', 'home'],
  ['/dashboard/', 'home'],
  ['/dashboard/home', 'home'],
  ['/dashboard/search', 'search'],
  ['/dashboard/search/', 'search'],
  ['/dashboard/requests', 'requests'],
  ['/dashboard/messages', 'messages'],
  ['/dashboard/messages/12', 'messages'],
  ['/dashboard/messages/x', null],
  ['/dashboard/profile', 'profile'],
  // Dvanásť adries, ktoré mapovanie doteraz nepoznalo.
  ['/dashboard/favorites', 'favorites'],
  ['/dashboard/notifications', 'notifications'],
  ['/dashboard/watches', 'watches'],
  ['/dashboard/settings', 'settings'],
  ['/dashboard/settings/watches', 'settings'],
  ['/dashboard/language', 'language'],
  ['/dashboard/account-type', 'account-type'],
  ['/dashboard/privacy', 'privacy'],
  ['/dashboard/skills', 'skills'],
  ['/dashboard/skills/offer', 'skills-offer'],
  ['/dashboard/skills/search', 'skills-search'],
  ['/dashboard/statistics', 'statistics'],
  ['/dashboard/users/jana/edit', 'profile'],
  // Zvyšok tabuľky.
  ['/dashboard/settings/notifications', 'notification-settings'],
  ['/dashboard/settings/account', 'account-settings'],
  ['/dashboard/settings/blocked', 'blocked-users'],
  ['/dashboard/users/jana', 'user-profile'],
  ['/dashboard/users/jana/', 'user-profile'],
  ['/dashboard/users/42', 'user-profile'],
  ['/dashboard/users/jana/portfolio', 'user-profile'],
  ['/dashboard/users/jana/portfolio/5', 'portfolio-detail'],
  ['/dashboard/users/jana/portfolio/create', 'portfolio-create'],
  ['/dashboard/users/jana/posts', 'user-profile'],
  ['/dashboard/users/jana/skills', 'user-profile'],
  ['/dashboard/users/jana/account', 'profile'],
  ['/dashboard/users/jana/language', 'profile'],
  ['/dashboard/users/jana/privacy', 'profile'],
  ['/dashboard/feed/7', 'feed-post-detail'],
  ['/dashboard/offers/3/reviews', 'offer-reviews'],
  // Adresy mimo dashboardu a neznáme podstránky ostávajú na stránke.
  ['/dashboard/skills/describe', null],
  ['/dashboard/users/jana/portfolio/5/gallery', null],
  ['/search', null],
  ['/', null],
  ['', null],
];

describe('mapovanie adresy', () => {
  it.each(EXPECTED_MODULES)('maps %s', (path, expected) => {
    expect(dashboardModuleFromPath(path)).toBe(expected);
  });

  it('reads the user identifier from every profile address', () => {
    expect(dashboardUserIdentifierFromPath('/dashboard/users/jana')).toBe('jana');
    expect(dashboardUserIdentifierFromPath('/dashboard/users/42/portfolio/5')).toBe('42');
    expect(dashboardUserIdentifierFromPath('/dashboard/users/jana/posts')).toBe('jana');
    expect(dashboardUserIdentifierFromPath('/dashboard/users/%E0%A4%A')).toBeNull();
    expect(dashboardUserIdentifierFromPath('/dashboard/search')).toBeNull();
  });
});

/** Props presne tak, ako ich skladajú stránky v `app/dashboard`. */
function usersPage(identifier: string, extra: DashboardRouteProps = {}): DashboardRouteProps {
  return {
    initialRoute: 'user-profile',
    initialViewedUserId: /^\d+$/.test(identifier) ? Number(identifier) : null,
    initialProfileSlug: identifier,
    ...extra,
  };
}

function portfolioPage(route: string, identifier: string, extra: DashboardRouteProps = {}) {
  const numeric = /^\d+$/.test(identifier);
  return {
    initialRoute: route,
    initialViewedUserId: numeric ? Number(identifier) : null,
    initialProfileSlug: numeric ? null : identifier,
    initialProfileTab: 'portfolio' as const,
    ...extra,
  };
}

const OWN_PAGES: Array<[string, string, string, DashboardRouteProps]> = [
  ['/dashboard', '/dashboard', '', { initialRoute: 'home' }],
  ['/dashboard/home', '/dashboard/home', '', { initialRoute: 'home' }],
  ['search', '/dashboard/search', '', { initialRoute: 'search' }],
  ['profile', '/dashboard/profile', '', { initialRoute: 'profile' }],
  ['requests', '/dashboard/requests', '', { initialRoute: 'requests' }],
  ['messages', '/dashboard/messages', '?conversationId=4', { initialRoute: 'messages' }],
  ['settings', '/dashboard/settings', '', { initialRoute: 'settings' }],
  ['settings/notifications', '/dashboard/settings/notifications', '', { initialRoute: 'notification-settings' }],
  ['settings/account', '/dashboard/settings/account', '', { initialRoute: 'account-settings' }],
  ['settings/blocked', '/dashboard/settings/blocked', '', { initialRoute: 'blocked-users' }],
  ['settings/watches', '/dashboard/settings/watches', '', { initialRoute: 'settings', initialRightItem: 'offer-watches' }],
  ['favorites', '/dashboard/favorites', '', { initialRoute: 'favorites' }],
  ['watches', '/dashboard/watches', '', { initialRoute: 'watches' }],
  ['feed/[postId]', '/dashboard/feed/7', '?comment=3', { initialRoute: 'feed-post-detail', initialFeedPostId: 7 }],
  ['offers/[id]/reviews', '/dashboard/offers/3/reviews', '?review_id=5', { initialRoute: 'offer-reviews', initialOfferId: 3 }],
  ['users/[slug]', '/dashboard/users/jana', '', usersPage('jana')],
  ['users/[slug] + highlight', '/dashboard/users/jana', '?offer=12#karta', usersPage('jana', { initialHighlightedSkillId: 12 })],
  ['users/[id]', '/dashboard/users/42', '', usersPage('42')],
  ['users/[slug]/portfolio', '/dashboard/users/jana/portfolio', '', { ...usersPage('jana'), initialProfileTab: 'portfolio' }],
  ['users/[slug]/posts', '/dashboard/users/jana/posts', '', { ...usersPage('jana'), initialProfileTab: 'posts' }],
  ['users/[slug]/edit', '/dashboard/users/me/edit', '', { initialRoute: 'profile', initialViewedUserId: null, initialProfileSlug: 'me', initialRightItem: 'edit-profile' }],
  ['portfolio/[id]', '/dashboard/users/jana/portfolio/5', '', portfolioPage('portfolio-detail', 'jana', { initialPortfolioItemId: 5 })],
  ['portfolio/[id] číselný vlastník', '/dashboard/users/42/portfolio/5', '', portfolioPage('portfolio-detail', '42', { initialPortfolioItemId: 5 })],
  ['portfolio/create', '/dashboard/users/jana/portfolio/create', '', portfolioPage('portfolio-create', 'jana')],
];

describe('tvrdé načítanie a bežná navigácia – bez zmeny', () => {
  it.each(OWN_PAGES)('keeps the page props of %s on its own address', (_name, path, search, props) => {
    expect(resolveDashboardRouteProps(props, path, search)).toBe(props);
  });
});

describe('krok späť cez hranicu stránky', () => {
  const DASHBOARD_PAGE: DashboardRouteProps = { initialRoute: 'home' };

  it('restores the own profile entry created on the feed page', () => {
    expect(resolveDashboardRouteProps(DASHBOARD_PAGE, '/dashboard/users/me')).toEqual({
      initialRoute: 'user-profile',
      initialViewedUserId: null,
      initialProfileSlug: 'me',
      initialHighlightedSkillId: null,
    });
  });

  it('restores the search entry created on the feed page', () => {
    expect(resolveDashboardRouteProps(DASHBOARD_PAGE, '/dashboard/search')).toEqual({
      initialRoute: 'search',
    });
  });

  it('restores the feed entry created on a profile page', () => {
    expect(resolveDashboardRouteProps(usersPage('jana'), '/dashboard')).toEqual({
      initialRoute: 'home',
    });
  });

  it('takes the identity from the address, not from the restored page', () => {
    expect(resolveDashboardRouteProps(usersPage('jana'), '/dashboard/users/me', '?highlight=9')).toEqual({
      initialRoute: 'user-profile',
      initialViewedUserId: null,
      initialProfileSlug: 'me',
      initialHighlightedSkillId: 9,
    });
  });

  it('drops page-only props that the address does not carry', () => {
    const editPage: DashboardRouteProps = {
      initialRoute: 'profile',
      initialProfileSlug: 'me',
      initialRightItem: 'edit-profile',
    };
    expect(resolveDashboardRouteProps(editPage, '/dashboard/users/me').initialRightItem).toBeUndefined();
  });

  it('restores a portfolio item entry', () => {
    expect(resolveDashboardRouteProps(DASHBOARD_PAGE, '/dashboard/users/jana/portfolio/5')).toEqual(
      portfolioPage('portfolio-detail', 'jana', { initialPortfolioItemId: 5 }),
    );
  });

  it('leaves addresses the table does not know to the page', () => {
    const props = usersPage('jana');
    expect(resolveDashboardRouteProps(props, '/dashboard/skills/describe')).toBe(props);
    expect(resolveDashboardRouteProps(props, '/search')).toBe(props);
  });

  it('restores the twelve addresses the mapping used to miss', () => {
    const page = { initialRoute: 'home' };
    expect(resolveDashboardRouteProps(page, '/dashboard/favorites')).toEqual({ initialRoute: 'favorites' });
    expect(resolveDashboardRouteProps(page, '/dashboard/notifications')).toEqual({ initialRoute: 'notifications' });
    expect(resolveDashboardRouteProps(page, '/dashboard/settings')).toEqual({ initialRoute: 'settings' });
    expect(resolveDashboardRouteProps(page, '/dashboard/settings/watches')).toEqual({
      initialRoute: 'settings',
      initialRightItem: 'offer-watches',
    });
    expect(resolveDashboardRouteProps(page, '/dashboard/language')).toEqual({ initialRoute: 'language' });
    expect(resolveDashboardRouteProps(page, '/dashboard/account-type')).toEqual({ initialRoute: 'account-type' });
    expect(resolveDashboardRouteProps(page, '/dashboard/privacy')).toEqual({ initialRoute: 'privacy' });
    expect(resolveDashboardRouteProps(page, '/dashboard/skills')).toEqual({ initialRoute: 'skills' });
    expect(resolveDashboardRouteProps(page, '/dashboard/skills/offer')).toEqual({ initialRoute: 'skills-offer' });
    expect(resolveDashboardRouteProps(page, '/dashboard/skills/search')).toEqual({ initialRoute: 'skills-search' });
    expect(resolveDashboardRouteProps(page, '/dashboard/statistics')).toEqual({ initialRoute: 'statistics' });
    expect(resolveDashboardRouteProps(page, '/dashboard/users/me/edit')).toEqual({
      initialRoute: 'profile',
      initialViewedUserId: null,
      initialProfileSlug: 'me',
      initialRightItem: 'edit-profile',
    });
  });
});

describe('useDashboardMountRoute', () => {
  function render(props: DashboardRouteProps, pathname: string) {
    return renderHook(
      ({ p, path }: { p: DashboardRouteProps; path: string }) => useDashboardMountRoute(p, path),
      { initialProps: { p: props, path: pathname } },
    );
  }

  it('reads the address only once – module switches do not change the props', () => {
    const page = { initialRoute: 'home' };
    const { result, rerender } = render(page, '/dashboard');

    // Preklik na autora: pushState zmení adresu, stránka ostáva.
    rerender({ p: { initialRoute: 'home' }, path: '/dashboard/users/jana' });

    expect(result.current.initialRoute).toBe('home');
    expect(result.current.initialProfileSlug).toBeUndefined();
  });

  it('follows new page props after a navigation within the same page', () => {
    const { result, rerender } = render(usersPage('jana'), '/dashboard/users/me');
    expect(result.current.initialProfileSlug).toBe('me');

    // router.push na iný profil – tá istá stránka, nové params.
    rerender({ p: usersPage('peter'), path: '/dashboard/users/peter' });
    expect(result.current.initialProfileSlug).toBe('peter');

    // …a keď sa stránka vráti k pôvodným props, platia tie, nie mount.
    rerender({ p: usersPage('jana'), path: '/dashboard/users/jana' });
    expect(result.current.initialProfileSlug).toBe('jana');
  });
});

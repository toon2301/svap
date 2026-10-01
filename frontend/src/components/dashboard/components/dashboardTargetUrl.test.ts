/** Čítanie cieľovej adresy v dashboarde: modul, profil a ID zvýraznenej karty. */

import {
  getDashboardHighlightIdFromTarget,
  getDashboardModuleFromTarget,
  getDashboardUserIdentifierFromTarget,
  parseDashboardHighlightId,
} from './dashboardTargetUrl';

const MODULES_BY_TARGET: Array<[string, string]> = [
  ['/dashboard', 'home'],
  ['/dashboard/', 'home'],
  ['/dashboard/requests', 'requests'],
  ['/dashboard/requests/', 'requests'],
  ['/dashboard/messages', 'messages'],
  ['/dashboard/messages/12', 'messages'],
  ['/dashboard/messages/12/', 'messages'],
  ['/dashboard/offers/3/reviews', 'offer-reviews'],
  ['/dashboard/offers/3/reviews/', 'offer-reviews'],
  ['/dashboard/settings/notifications', 'notification-settings'],
  ['/dashboard/settings/account', 'account-settings'],
  ['/dashboard/settings/blocked', 'blocked-users'],
  ['/dashboard/notifications', 'notifications'],
  ['/dashboard/favorites', 'favorites'],
  ['/dashboard/search', 'search'],
  ['/dashboard/settings', 'settings'],
  ['/dashboard/language', 'language'],
  ['/dashboard/account-type', 'account-type'],
  ['/dashboard/privacy', 'privacy'],
  ['/dashboard/skills/offer', 'skills-offer'],
  ['/dashboard/skills/search', 'skills-search'],
  ['/dashboard/skills', 'skills'],
  ['/dashboard/profile', 'profile'],
  ['/dashboard/users/jana/portfolio/5', 'portfolio-detail'],
  ['/dashboard/users/jana/portfolio/create', 'portfolio-create'],
  ['/dashboard/users/jana/portfolio', 'user-profile'],
  ['/dashboard/users/jana', 'user-profile'],
  ['/dashboard/users/jana/', 'user-profile'],
  ['/dashboard/users/42', 'user-profile'],
];

// Adresy v rámci dashboardu, ktoré táto tabuľka nepozná (modul sa z nich nezistí).
const UNMAPPED_TARGETS = [
  '/dashboard/home',
  '/dashboard/unknown',
  '/dashboard/requests/extra',
  '/dashboard/messages/abc',
  '/dashboard/messages/12/extra',
  '/dashboard/offers/3',
  '/dashboard/offers/abc/reviews',
  '/dashboard/settings/watches',
  '/dashboard/skills/describe',
  '/dashboard/feed/7',
  '/dashboard/users',
  '/dashboard/users/',
  '/dashboard/users/jana/posts',
  '/dashboard/users/jana/portfolio/5/gallery',
];

// Len adresy začínajúce `/dashboard` alebo `/dashboard/` sa vôbec posudzujú.
const TARGETS_OUTSIDE_DASHBOARD = [
  '',
  '/',
  '/search',
  '/dashboardx',
  '/dashboard-x',
  'dashboard/requests',
  'https://example.com/dashboard/requests',
  '//example.com/dashboard/requests',
];

describe('modul z cieľovej adresy', () => {
  it.each(MODULES_BY_TARGET)('%s → %s', (target, expected) => {
    expect(getDashboardModuleFromTarget(target)).toBe(expected);
  });

  it('query a hash modul nemenia', () => {
    expect(getDashboardModuleFromTarget('/dashboard/requests?tab=received#top')).toBe('requests');
    expect(getDashboardModuleFromTarget('/dashboard/users/jana?offer=5#detail')).toBe('user-profile');
    expect(getDashboardModuleFromTarget('/dashboard/?from=push')).toBe('home');
  });

  it('segmenty `.` a `..` sa pred porovnaním zrátajú', () => {
    expect(getDashboardModuleFromTarget('/dashboard/./requests')).toBe('requests');
    expect(getDashboardModuleFromTarget('/dashboard/../search')).toBeNull();
  });

  it.each(UNMAPPED_TARGETS)('adresu %s tabuľka nepozná', (target) => {
    expect(getDashboardModuleFromTarget(target)).toBeNull();
  });

  it.each(TARGETS_OUTSIDE_DASHBOARD)('adresu mimo dashboardu %j odmietne', (target) => {
    expect(getDashboardModuleFromTarget(target)).toBeNull();
  });

  it('keď `URL` zlyhá, vráti null a nevyhodí chybu', () => {
    // Pre adresy, ktoré prejdú strážou, `URL` v praxi nezlyháva – zlyhanie sa preto len nasimuluje.
    const urlSpy = jest.spyOn(globalThis, 'URL').mockImplementation(() => {
      throw new TypeError('Invalid URL');
    });
    try {
      expect(getDashboardModuleFromTarget('/dashboard/requests')).toBeNull();
    } finally {
      urlSpy.mockRestore();
    }
  });
});

describe('identifikátor profilu z cieľovej adresy', () => {
  it.each([
    ['/dashboard/users/jana', 'jana'],
    ['/dashboard/users/jana/', 'jana'],
    ['/dashboard/users/42', '42'],
    ['/dashboard/users/jana?offer=5', 'jana'],
    ['/dashboard/users/jana#top', 'jana'],
    ['/dashboard/users/jana/portfolio', 'jana'],
    ['/dashboard/users/jana/portfolio/5', 'jana'],
    ['/dashboard/users/jana/portfolio/create', 'jana'],
    ['/dashboard/users/jan%20novak', 'jan novak'],
  ])('%s → %s', (target, expected) => {
    expect(getDashboardUserIdentifierFromTarget(target)).toBe(expected);
  });

  it.each([
    '/dashboard/search',
    '/dashboard/profile',
    '/dashboard/users',
    '/dashboard/users/',
    '/dashboard/users/%E0%A4%A',
  ])('z adresy %s sa identifikátor nezistí', (target) => {
    expect(getDashboardUserIdentifierFromTarget(target)).toBeNull();
  });

  it('neplatná adresa nevyhodí chybu', () => {
    expect(getDashboardUserIdentifierFromTarget('http://[')).toBeNull();
  });
});

describe('ID zvýraznenej karty', () => {
  describe('parseDashboardHighlightId', () => {
    it.each([
      [1, 1],
      [5, 5],
      ['7', 7],
      [' 7 ', 7],
      ['42', 42],
    ])('platné ID %p → %p', (value, expected) => {
      expect(parseDashboardHighlightId(value)).toBe(expected);
    });

    it.each([0, -3, 1.5, NaN, Infinity, '', '   ', 'abc', '0', '-2', '1.5', null, undefined])(
      'neplatné ID %p → null',
      (value) => {
        expect(parseDashboardHighlightId(value)).toBeNull();
      },
    );
  });

  describe('getDashboardHighlightIdFromTarget', () => {
    it.each([
      ['/dashboard/profile?offer=5', 5],
      ['/dashboard/profile?highlight=7', 7],
      ['/dashboard/users/jana?offer=5&highlight=7', 5],
      ['/dashboard/users/jana?highlight=7&offer=5', 5],
      ['/dashboard/profile?foo=1&offer=9&bar=2', 9],
      ['/dashboard/profile?offer=5#detail', 5],
    ])('%s → %s', (target, expected) => {
      expect(getDashboardHighlightIdFromTarget(target)).toBe(expected);
    });

    it.each([
      '/dashboard/profile',
      '/dashboard/profile?other=5',
      '/dashboard/profile?offer=',
      '/dashboard/profile?offer=abc',
      '/dashboard/profile?highlight=0',
      '/dashboard/profile?highlight=-3',
      '/dashboard/profile?highlight=1.5',
    ])('z adresy %s sa ID nezistí', (target) => {
      expect(getDashboardHighlightIdFromTarget(target)).toBeNull();
    });

    // `offer ?? highlight`: prítomný (aj neplatný) `offer` rozhoduje, na `highlight` sa neprechádza.
    it('neplatný `offer` nepustí `highlight`', () => {
      expect(getDashboardHighlightIdFromTarget('/dashboard/profile?offer=abc&highlight=7')).toBeNull();
      expect(getDashboardHighlightIdFromTarget('/dashboard/profile?offer=&highlight=7')).toBeNull();
    });

    it('neplatná adresa nevyhodí chybu', () => {
      expect(getDashboardHighlightIdFromTarget('http://[')).toBeNull();
    });
  });
});

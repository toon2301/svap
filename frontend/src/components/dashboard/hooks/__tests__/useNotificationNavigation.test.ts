/**
 * Prechod na cieľovú adresu z notifikácie (a z tlačidla späť v recenziách).
 *
 * Hook dáva `DashboardContent` jeden handler `handleNotificationNavigate(targetUrl)`:
 * adresy mimo dashboardu ignoruje, príspevok na desktope otvorí v okne nad appkou, ostatné
 * nastaví modul, zobrazeného používateľa, cieľ žiadostí a zvýraznenú kartu, zavrie panely
 * a nakoniec navigovať cez router. Poradie volaní je súčasť správania, preto sa všetko
 * zapisuje do jedného záznamu `calls`.
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import type { RequestsRouteIntent } from '../../modules/requests/requestsRouting';
import { useNotificationNavigation } from '../useNotificationNavigation';

const NOW = 1_700_000_000_000;

/** Všetko, čo hook zavolá alebo zapíše, sa ukladá sem v poradí volaní. */
let calls: string[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

type HookInput = Parameters<typeof useNotificationNavigation>[0];
type Mounted = RenderHookResult<ReturnType<typeof useNotificationNavigation>, HookInput>;

const spy = (name: string, impl?: (...args: unknown[]) => unknown) =>
  jest.fn((...args: unknown[]) => {
    record(name, ...args);
    return impl?.(...args);
  });

let base: HookInput;

const makeBase = (): HookInput => ({
  router: { push: spy('router.push') },
  isMobile: false,
  highlighting: { setHighlightedSkillId: spy('setHighlightedSkillId') },
  handleFeedOverlayTargetChange: spy('handleFeedOverlayTargetChange'),
  setActiveModule: spy('setActiveModule'),
  setActiveRightItem: spy('setActiveRightItem'),
  setIsMobileMenuOpen: spy('setIsMobileMenuOpen'),
  setIsNotificationsPanelOpen: spy('setIsNotificationsPanelOpen'),
  setIsRightSidebarOpen: spy('setIsRightSidebarOpen'),
  setIsSearchOpen: spy('setIsSearchOpen'),
  setViewedUserId: spy('setViewedUserId'),
  setViewedUserSlug: spy('setViewedUserSlug'),
  setViewedUserSummary: spy('setViewedUserSummary'),
  setRequestsRouteIntent: spy('setRequestsRouteIntent'),
});

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const makeInput = (overrides: Partial<HookInput> = {}): HookInput => ({ ...base, ...overrides });

const mountHook = (overrides: Partial<HookInput> = {}): Mounted =>
  renderHook((props: HookInput) => useNotificationNavigation(props), {
    initialProps: makeInput(overrides),
  });

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

const navigate = (mounted: Mounted, targetUrl: string) =>
  act(() => {
    mounted.result.current.handleNotificationNavigate(targetUrl);
  });

/** Zmontuje hook, zavolá handler s adresou a vráti namontovaný hook. */
const run = (targetUrl: string, overrides: Partial<HookInput> = {}): Mounted => {
  const mounted = mountHook(overrides);
  navigate(mounted, targetUrl);
  return mounted;
};

/** Funkcia, ktorou hook upravil cieľ žiadostí (prvé volanie `setRequestsRouteIntent`). */
const intentUpdater = () =>
  (base.setRequestsRouteIntent as unknown as { mock: { calls: unknown[][] } }).mock
    .calls[0][0] as (current: RequestsRouteIntent | null) => RequestsRouteIntent | null;

const realSetItem = Storage.prototype.setItem;

type StorageKind = 'local' | 'session';

/** Zapisuje do `calls` každý zápis do úložiska; vybrané úložiská po zápise zlyhajú. */
const installStorageSpy = (failing: StorageKind[] = []) => {
  jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function (this: Storage, key: string, value: string) {
      const kind: StorageKind = this === window.localStorage ? 'local' : 'session';
      record(kind === 'local' ? 'localStorage.setItem' : 'sessionStorage.setItem', key, value);
      if (failing.includes(kind)) throw new Error('quota');
      realSetItem.call(this, key, value);
    });
};

const SET_MODULE = (moduleId: string) => entry('setActiveModule', moduleId);
const STORE_MODULE = (moduleId: string) => entry('localStorage.setItem', 'activeModule', moduleId);
const CLEAR_INTENT = entry('setRequestsRouteIntent', null);
const UPDATE_INTENT = entry('setRequestsRouteIntent', () => undefined);
const CLEAR_VIEWED_USER = [
  entry('setViewedUserId', null),
  entry('setViewedUserSlug', null),
  entry('setViewedUserSummary', null),
];
const HIGHLIGHT = (id: number) => [
  entry('setHighlightedSkillId', id),
  entry('sessionStorage.setItem', 'highlightedSkillId', String(id)),
  entry('sessionStorage.setItem', 'highlightedSkillTime', String(NOW)),
];
const CLOSE_PANELS = [
  entry('setIsNotificationsPanelOpen', false),
  entry('setIsSearchOpen', false),
  entry('setIsRightSidebarOpen', false),
  entry('setActiveRightItem', ''),
  entry('setIsMobileMenuOpen', false),
];
const PUSH = (targetUrl: string) => entry('router.push', targetUrl);

/** Zvyšok cesty, ktorý je pri každej bežnej navigácii rovnaký: zavretie panelov a router. */
const FINISH = (targetUrl: string) => [...CLOSE_PANELS, PUSH(targetUrl)];

beforeEach(() => {
  calls = [];
  base = makeBase();
  localStorage.clear();
  sessionStorage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  installStorageSpy();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('východiskový stav', () => {
  it('vráti jediný handler', () => {
    const mounted = mountHook();
    expect(Object.keys(mounted.result.current)).toEqual(['handleNotificationNavigate']);
    expect(typeof mounted.result.current.handleNotificationNavigate).toBe('function');
  });

  it('pri vytvorení nič nezavolá ani nezapíše', () => {
    mountHook();
    expect(calls).toEqual([]);
  });
});

describe('adresy mimo dashboardu sa ignorujú', () => {
  it.each([
    '',
    '/',
    '/login',
    '/dashboardX',
    '/dashboard-evil/profile',
    'dashboard/requests',
    '//dashboard/requests',
    'https://example.com/dashboard/requests',
    'javascript:alert(1)',
    '/Dashboard/profile',
    ' /dashboard/profile',
    '/other/dashboard/profile',
    // Kontrola pustí len presne '/dashboard' alebo '/dashboard/…'.
    '/dashboard?from=push',
    '/dashboard#top',
  ])('%p nič nezavolá, nezapíše ani nenaviguje', (targetUrl) => {
    run(targetUrl);
    expect(calls).toEqual([]);
  });

  it('desktop aj mobil ignorujú rovnako, aj adresu príspevku mimo dashboardu', () => {
    run('/feed/42', { isMobile: false });
    run('/feed/42', { isMobile: true });
    expect(calls).toEqual([]);
  });
});

describe('príspevok z notifikácie (/dashboard/feed/<id>)', () => {
  it('desktop: otvorí okno nad appkou, zavrie panely a nenaviguje', () => {
    run('/dashboard/feed/42');
    expect(calls).toEqual([
      entry('setIsNotificationsPanelOpen', false),
      entry('setIsSearchOpen', false),
      entry('setIsMobileMenuOpen', false),
      entry('handleFeedOverlayTargetChange', { postId: 42, highlightCommentId: null }),
    ]);
  });

  it('desktop s komentárom: okno dostane aj komentár na zvýraznenie', () => {
    run('/dashboard/feed/42?comment=7');
    expect(calls).toEqual([
      entry('setIsNotificationsPanelOpen', false),
      entry('setIsSearchOpen', false),
      entry('setIsMobileMenuOpen', false),
      entry('handleFeedOverlayTargetChange', { postId: 42, highlightCommentId: 7 }),
    ]);
  });

  it('desktop: adresa s lomkou na konci je tiež príspevok', () => {
    run('/dashboard/feed/42/');
    expect(base.handleFeedOverlayTargetChange).toHaveBeenCalledTimes(1);
    expect(base.handleFeedOverlayTargetChange).toHaveBeenCalledWith({
      postId: 42,
      highlightCommentId: null,
    });
    expect(base.router.push).not.toHaveBeenCalled();
  });

  it('desktop: okno nemení modul, úložisko, zobrazeného používateľa ani cieľ žiadostí', () => {
    run('/dashboard/feed/42?comment=7');
    expect(base.setActiveModule).not.toHaveBeenCalled();
    expect(base.setViewedUserId).not.toHaveBeenCalled();
    expect(base.setViewedUserSlug).not.toHaveBeenCalled();
    expect(base.setViewedUserSummary).not.toHaveBeenCalled();
    expect(base.setRequestsRouteIntent).not.toHaveBeenCalled();
    expect(base.highlighting.setHighlightedSkillId).not.toHaveBeenCalled();
    expect(base.setIsRightSidebarOpen).not.toHaveBeenCalled();
    expect(base.setActiveRightItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('mobil: okno sa neotvorí, naviguje sa na celoobrazovkovú stránku', () => {
    run('/dashboard/feed/42?comment=7', { isMobile: true });
    expect(calls).toEqual([CLEAR_INTENT, ...FINISH('/dashboard/feed/42?comment=7')]);
    expect(base.handleFeedOverlayTargetChange).not.toHaveBeenCalled();
  });

  it.each([
    '/dashboard/feed/0',
    '/dashboard/feed/abc',
    '/dashboard/feed/42/comments',
    '/dashboard/feed/',
    '/dashboard/feed',
    '/dashboard/feed/-5',
    '/dashboard/feed/1.5',
    '/dashboard/feed/99999999999999999999',
  ])('%s nie je príspevok pre okno: aj na desktope sa naviguje bežnou cestou', (targetUrl) => {
    run(targetUrl);
    expect(calls).toEqual([CLEAR_INTENT, ...FINISH(targetUrl)]);
    expect(base.handleFeedOverlayTargetChange).not.toHaveBeenCalled();
  });

  it.each([
    ['komentár 0', '/dashboard/feed/42?comment=0', null],
    ['komentár nie je číslo', '/dashboard/feed/42?comment=abc', null],
    ['záporný komentár', '/dashboard/feed/42?comment=-3', null],
    ['komentár 1 (najmenší platný)', '/dashboard/feed/42?comment=1', 1],
    ['iný parameter ako comment', '/dashboard/feed/42?highlight=7', null],
  ])('desktop, %s: okno dostane správny komentár', (_label, targetUrl, comment) => {
    run(targetUrl);
    expect(base.handleFeedOverlayTargetChange).toHaveBeenCalledTimes(1);
    expect(base.handleFeedOverlayTargetChange).toHaveBeenCalledWith({
      postId: 42,
      highlightCommentId: comment,
    });
  });
});

describe('cieľový modul podľa adresy', () => {
  const PLAIN_MODULES: Array<[string, string]> = [
    ['/dashboard', 'home'],
    ['/dashboard/', 'home'],
    ['/dashboard/messages', 'messages'],
    ['/dashboard/messages/12', 'messages'],
    ['/dashboard/offers/5/reviews', 'offer-reviews'],
    ['/dashboard/settings/notifications', 'notification-settings'],
    ['/dashboard/settings/account', 'account-settings'],
    ['/dashboard/settings/blocked', 'blocked-users'],
    ['/dashboard/notifications', 'notifications'],
    ['/dashboard/favorites', 'favorites'],
    ['/dashboard/favorites?x=1#top', 'favorites'],
    ['/dashboard/search', 'search'],
    ['/dashboard/settings', 'settings'],
    ['/dashboard/language', 'language'],
    ['/dashboard/account-type', 'account-type'],
    ['/dashboard/privacy', 'privacy'],
    ['/dashboard/skills/offer', 'skills-offer'],
    ['/dashboard/skills/search', 'skills-search'],
    ['/dashboard/skills', 'skills'],
    ['/dashboard/profile', 'profile'],
    ['/dashboard/users/anna/portfolio/create', 'portfolio-create'],
  ];

  it.each(PLAIN_MODULES)('%s → %s: modul, cieľ žiadostí, zobrazený používateľ, panely, router', (targetUrl, moduleId) => {
    run(targetUrl);
    expect(calls).toEqual([
      SET_MODULE(moduleId),
      STORE_MODULE(moduleId),
      CLEAR_INTENT,
      ...CLEAR_VIEWED_USER,
      ...FINISH(targetUrl),
    ]);
    expect(localStorage.getItem('activeModule')).toBe(moduleId);
  });

  it('neznáma adresa v dashboarde: modul ani používateľ sa nemenia, panely sa zavrú a naviguje sa', () => {
    run('/dashboard/unknown-section');
    expect(calls).toEqual([CLEAR_INTENT, ...FINISH('/dashboard/unknown-section')]);
    expect(localStorage.length).toBe(0);
  });

  it('router dostane pôvodný reťazec adresy bez úprav (query aj hash)', () => {
    run('/dashboard/search?q=a%20b&x=1#top');
    expect(base.router.push).toHaveBeenCalledTimes(1);
    expect(base.router.push).toHaveBeenCalledWith('/dashboard/search?q=a%20b&x=1#top');
  });

  it('handler sa dá zavolať viackrát za sebou, každé volanie je samostatné', () => {
    const mounted = mountHook();
    navigate(mounted, '/dashboard/favorites');
    navigate(mounted, '/dashboard/settings');
    expect(calls).toEqual([
      SET_MODULE('favorites'),
      STORE_MODULE('favorites'),
      CLEAR_INTENT,
      ...CLEAR_VIEWED_USER,
      ...FINISH('/dashboard/favorites'),
      SET_MODULE('settings'),
      STORE_MODULE('settings'),
      CLEAR_INTENT,
      ...CLEAR_VIEWED_USER,
      ...FINISH('/dashboard/settings'),
    ]);
  });
});

describe('žiadosti (requests)', () => {
  const REQUESTS: Array<[string, { statusTab: string; tab: string }]> = [
    ['/dashboard/requests', { statusTab: 'pending', tab: 'received' }],
    ['/dashboard/requests/', { statusTab: 'pending', tab: 'received' }],
    ['/dashboard/requests#top', { statusTab: 'pending', tab: 'received' }],
    ['/dashboard/requests?status=active&tab=sent', { statusTab: 'active', tab: 'sent' }],
    ['/dashboard/requests?status=completed', { statusTab: 'completed', tab: 'received' }],
    ['/dashboard/requests?status=cancelled&tab=sent#top', { statusTab: 'cancelled', tab: 'sent' }],
    ['/dashboard/requests?tab=sent', { statusTab: 'pending', tab: 'sent' }],
    ['/dashboard/requests?status=bogus&tab=bogus', { statusTab: 'pending', tab: 'received' }],
  ];

  it.each(REQUESTS)('%s: modul, cieľ žiadostí (funkcia), zobrazený používateľ, panely, router', (targetUrl) => {
    run(targetUrl);
    expect(calls).toEqual([
      SET_MODULE('requests'),
      STORE_MODULE('requests'),
      UPDATE_INTENT,
      ...CLEAR_VIEWED_USER,
      ...FINISH(targetUrl),
    ]);
  });

  it.each(REQUESTS)('%s: prvý cieľ dostane kľúč 1 a hodnoty z adresy', (targetUrl, selection) => {
    run(targetUrl);
    expect(intentUpdater()(null)).toEqual({ ...selection, key: 1 });
  });

  it.each(REQUESTS)('%s: ďalší cieľ zvýši kľúč o 1 a hodnoty berie z adresy, nie z predošlého cieľa', (targetUrl, selection) => {
    run(targetUrl);
    expect(intentUpdater()({ statusTab: 'completed', tab: 'sent', key: 4 })).toEqual({
      ...selection,
      key: 5,
    });
  });

  it('kľúč nového cieľa nezávisí od iných polí predošlého cieľa', () => {
    run('/dashboard/requests?status=active');
    expect(intentUpdater()({ statusTab: 'pending', tab: 'received', key: 0 })).toEqual({
      statusTab: 'active',
      tab: 'received',
      key: 1,
    });
  });

  it('modul sa rozpozná, ale adresa nie je tvaru žiadostí: cieľ žiadostí sa nemení', () => {
    // `new URL` zahodí `./`, takže modul vyjde `requests`, no samotný rozbor adresy ju odmietne.
    run('/dashboard/./requests');
    expect(calls).toEqual([
      SET_MODULE('requests'),
      STORE_MODULE('requests'),
      ...CLEAR_VIEWED_USER,
      ...FINISH('/dashboard/./requests'),
    ]);
    expect(base.setRequestsRouteIntent).not.toHaveBeenCalled();
  });

  it('prechod na iný modul cieľ žiadostí zahodí (null namiesto funkcie)', () => {
    run('/dashboard/favorites');
    expect(base.setRequestsRouteIntent).toHaveBeenCalledTimes(1);
    expect(base.setRequestsRouteIntent).toHaveBeenCalledWith(null);
  });
});

describe('zobrazený používateľ', () => {
  it('číselný identifikátor: nastaví id, zruší slug a zahodí zhrnutie', () => {
    run('/dashboard/users/42');
    expect(calls).toEqual([
      SET_MODULE('user-profile'),
      STORE_MODULE('user-profile'),
      CLEAR_INTENT,
      entry('setViewedUserSummary', null),
      entry('setViewedUserId', 42),
      entry('setViewedUserSlug', null),
      ...FINISH('/dashboard/users/42'),
    ]);
  });

  it('číselný identifikátor s nulami na začiatku sa prevedie na číslo', () => {
    run('/dashboard/users/007');
    expect(base.setViewedUserId).toHaveBeenCalledTimes(1);
    expect(base.setViewedUserId).toHaveBeenCalledWith(7);
    expect(base.setViewedUserSlug).toHaveBeenCalledWith(null);
  });

  it('slug: nastaví slug, zruší id a zahodí zhrnutie', () => {
    run('/dashboard/users/anna');
    expect(calls).toEqual([
      SET_MODULE('user-profile'),
      STORE_MODULE('user-profile'),
      CLEAR_INTENT,
      entry('setViewedUserSummary', null),
      entry('setViewedUserId', null),
      entry('setViewedUserSlug', 'anna'),
      ...FINISH('/dashboard/users/anna'),
    ]);
  });

  it.each(['42abc', '4-2', 'a42', '1e3', '٤٢'])('identifikátor %p nie je číselný: berie sa ako slug', (identifier) => {
    run(`/dashboard/users/${identifier}`);
    expect(base.setViewedUserId).toHaveBeenCalledWith(null);
    expect(base.setViewedUserSlug).toHaveBeenCalledWith(identifier);
  });

  it('zakódovaný slug sa pred nastavením dekóduje', () => {
    run('/dashboard/users/j%C3%A1n');
    expect(base.setViewedUserSlug).toHaveBeenCalledWith('ján');
    expect(base.setViewedUserId).toHaveBeenCalledWith(null);
  });

  it('chybné kódovanie v adrese: id ani slug sa nenastavia, zhrnutie sa zahodí', () => {
    run('/dashboard/users/%E0%A4%A');
    expect(calls).toEqual([
      SET_MODULE('user-profile'),
      STORE_MODULE('user-profile'),
      CLEAR_INTENT,
      entry('setViewedUserSummary', null),
      ...FINISH('/dashboard/users/%E0%A4%A'),
    ]);
  });

  it('zoznam portfólia je tiež profil používateľa', () => {
    run('/dashboard/users/anna/portfolio');
    expect(calls).toEqual([
      SET_MODULE('user-profile'),
      STORE_MODULE('user-profile'),
      CLEAR_INTENT,
      entry('setViewedUserSummary', null),
      entry('setViewedUserId', null),
      entry('setViewedUserSlug', 'anna'),
      ...FINISH('/dashboard/users/anna/portfolio'),
    ]);
  });

  it('detail portfólia prevezme vlastníka z adresy (slug)', () => {
    run('/dashboard/users/anna/portfolio/3');
    expect(calls).toEqual([
      SET_MODULE('portfolio-detail'),
      STORE_MODULE('portfolio-detail'),
      CLEAR_INTENT,
      entry('setViewedUserSummary', null),
      entry('setViewedUserId', null),
      entry('setViewedUserSlug', 'anna'),
      ...FINISH('/dashboard/users/anna/portfolio/3'),
    ]);
  });

  it('detail portfólia prevezme vlastníka z adresy (číselné id)', () => {
    run('/dashboard/users/5/portfolio/3');
    expect(calls).toEqual([
      SET_MODULE('portfolio-detail'),
      STORE_MODULE('portfolio-detail'),
      CLEAR_INTENT,
      entry('setViewedUserSummary', null),
      entry('setViewedUserId', 5),
      entry('setViewedUserSlug', null),
      ...FINISH('/dashboard/users/5/portfolio/3'),
    ]);
  });

  it('vlastný profil a ostatné moduly zahodia zobrazeného používateľa aj zhrnutie', () => {
    run('/dashboard/profile');
    expect(calls).toEqual([
      SET_MODULE('profile'),
      STORE_MODULE('profile'),
      CLEAR_INTENT,
      ...CLEAR_VIEWED_USER,
      ...FINISH('/dashboard/profile'),
    ]);
  });
});

describe('zvýraznenie karty z notifikácie', () => {
  it('vlastný profil: karta z parametra offer sa zvýrazní a zapamätá', () => {
    run('/dashboard/profile?offer=5');
    expect(calls).toEqual([
      SET_MODULE('profile'),
      STORE_MODULE('profile'),
      CLEAR_INTENT,
      ...CLEAR_VIEWED_USER,
      ...HIGHLIGHT(5),
      ...FINISH('/dashboard/profile?offer=5'),
    ]);
    expect(sessionStorage.getItem('highlightedSkillId')).toBe('5');
    expect(sessionStorage.getItem('highlightedSkillTime')).toBe(String(NOW));
  });

  it('cudzí profil: karta z parametra highlight sa zvýrazní a zapamätá', () => {
    run('/dashboard/users/anna?highlight=7');
    expect(calls).toEqual([
      SET_MODULE('user-profile'),
      STORE_MODULE('user-profile'),
      CLEAR_INTENT,
      entry('setViewedUserSummary', null),
      entry('setViewedUserId', null),
      entry('setViewedUserSlug', 'anna'),
      ...HIGHLIGHT(7),
      ...FINISH('/dashboard/users/anna?highlight=7'),
    ]);
  });

  it('parameter offer má prednosť pred parametrom highlight', () => {
    run('/dashboard/profile?offer=5&highlight=9');
    expect(base.highlighting.setHighlightedSkillId).toHaveBeenCalledTimes(1);
    expect(base.highlighting.setHighlightedSkillId).toHaveBeenCalledWith(5);
  });

  it('parameter highlight sa použije, keď offer chýba', () => {
    run('/dashboard/profile?highlight=9');
    expect(base.highlighting.setHighlightedSkillId).toHaveBeenCalledWith(9);
  });

  it.each([
    ['najmenšie platné id', '1', 1],
    ['bežné id', '42', 42],
    ['veľké id', '123456789', 123456789],
  ])('%s sa zvýrazní', (_label, raw, id) => {
    run(`/dashboard/profile?offer=${raw}`);
    expect(calls).toEqual(expect.arrayContaining(HIGHLIGHT(id)));
  });

  it.each(['abc', '0', '-3', '1.5', '', ' ', '1e2x'])('neplatné id %p sa nezvýrazní ani nezapamätá', (raw) => {
    run(`/dashboard/profile?offer=${raw}`);
    expect(calls).toEqual([
      SET_MODULE('profile'),
      STORE_MODULE('profile'),
      CLEAR_INTENT,
      ...CLEAR_VIEWED_USER,
      ...FINISH(`/dashboard/profile?offer=${raw}`),
    ]);
    expect(sessionStorage.length).toBe(0);
  });

  it.each([
    '/dashboard/requests?offer=5',
    '/dashboard/favorites?highlight=5',
    '/dashboard/users/anna/portfolio/3?highlight=5',
    '/dashboard/users/anna/portfolio/create?offer=5',
    '/dashboard/unknown-section?offer=5',
  ])('mimo profilu (%s) sa parameter ignoruje', (targetUrl) => {
    run(targetUrl);
    expect(base.highlighting.setHighlightedSkillId).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });

  it('zvýraznenie sa nastaví PRED zavretím panelov a navigáciou', () => {
    run('/dashboard/profile?offer=5');
    const at = (name: string) => calls.findIndex((c) => c.startsWith(name));
    expect(at('setHighlightedSkillId')).toBeGreaterThan(-1);
    expect(at('setHighlightedSkillId')).toBeLessThan(at('setIsNotificationsPanelOpen'));
    expect(at('router.push')).toBe(calls.length - 1);
  });
});

describe('zatvorenie panelov', () => {
  it('bežná navigácia zavrie panel upozornení, vyhľadávanie, pravý panel aj mobilné menu a vyčistí pravú položku', () => {
    run('/dashboard/favorites');
    expect(calls.slice(-6)).toEqual([...CLOSE_PANELS, PUSH('/dashboard/favorites')]);
  });

  it('router sa volá vždy ako posledný krok', () => {
    run('/dashboard/requests?tab=sent');
    expect(calls[calls.length - 1]).toBe(PUSH('/dashboard/requests?tab=sent'));
    expect(base.router.push).toHaveBeenCalledTimes(1);
  });

  it('okno príspevku na desktope nezavrie pravý panel (to rieši vrstva nad appkou)', () => {
    run('/dashboard/feed/42');
    expect(base.setIsRightSidebarOpen).not.toHaveBeenCalled();
    expect(base.setActiveRightItem).not.toHaveBeenCalled();
  });
});

describe('úložisko prehliadača nie je dostupné', () => {
  it('chyba localStorage: modul sa nastaví a navigácia pokračuje', () => {
    installStorageSpy(['local']);
    run('/dashboard/requests?tab=sent');
    expect(calls).toEqual([
      SET_MODULE('requests'),
      STORE_MODULE('requests'),
      UPDATE_INTENT,
      ...CLEAR_VIEWED_USER,
      ...FINISH('/dashboard/requests?tab=sent'),
    ]);
  });

  it('chyba sessionStorage: karta sa zvýrazní, druhý zápis sa nezačne a navigácia pokračuje', () => {
    installStorageSpy(['session']);
    run('/dashboard/profile?offer=5');
    expect(calls).toEqual([
      SET_MODULE('profile'),
      STORE_MODULE('profile'),
      CLEAR_INTENT,
      ...CLEAR_VIEWED_USER,
      entry('setHighlightedSkillId', 5),
      entry('sessionStorage.setItem', 'highlightedSkillId', '5'),
      ...FINISH('/dashboard/profile?offer=5'),
    ]);
  });

  it('chyba oboch úložísk: stav appky sa nastaví a navigácia pokračuje', () => {
    installStorageSpy(['local', 'session']);
    run('/dashboard/users/anna?highlight=7');
    expect(calls).toEqual([
      SET_MODULE('user-profile'),
      STORE_MODULE('user-profile'),
      CLEAR_INTENT,
      entry('setViewedUserSummary', null),
      entry('setViewedUserId', null),
      entry('setViewedUserSlug', 'anna'),
      entry('setHighlightedSkillId', 7),
      entry('sessionStorage.setItem', 'highlightedSkillId', '7'),
      ...FINISH('/dashboard/users/anna?highlight=7'),
    ]);
  });

  it('okno príspevku na desktope úložisko nepotrebuje', () => {
    installStorageSpy(['local', 'session']);
    run('/dashboard/feed/42');
    expect(base.handleFeedOverlayTargetChange).toHaveBeenCalledTimes(1);
  });
});

describe('identita handlera', () => {
  const INPUT_KEYS: Array<keyof HookInput> = [
    'router',
    'isMobile',
    'highlighting',
    'handleFeedOverlayTargetChange',
    'setActiveModule',
    'setActiveRightItem',
    'setIsMobileMenuOpen',
    'setIsNotificationsPanelOpen',
    'setIsRightSidebarOpen',
    'setIsSearchOpen',
    'setViewedUserId',
    'setViewedUserSlug',
    'setViewedUserSummary',
    'setRequestsRouteIntent',
  ];

  const replacementFor = (key: keyof HookInput): Partial<HookInput> => {
    if (key === 'router') return { router: { push: spy('router#2.push') } };
    if (key === 'isMobile') return { isMobile: !base.isMobile };
    if (key === 'highlighting') {
      return { highlighting: { setHighlightedSkillId: spy('highlighting#2.setHighlightedSkillId') } };
    }
    return { [key]: spy(`${key}#2`) } as unknown as Partial<HookInput>;
  };

  it('vstupy má hook práve tieto (žiadny nechýba v zozname testu)', () => {
    expect([...INPUT_KEYS].sort()).toEqual(Object.keys(base).sort());
  });

  it('bez zmeny vstupov ostáva handler ten istý', () => {
    const mounted = mountHook();
    const first = mounted.result.current.handleNotificationNavigate;
    update(mounted, {});
    update(mounted, {});
    expect(mounted.result.current.handleNotificationNavigate).toBe(first);
  });

  it.each(INPUT_KEYS)('zmena vstupu %s vytvorí nový handler', (key) => {
    const mounted = mountHook();
    const first = mounted.result.current.handleNotificationNavigate;
    update(mounted, replacementFor(key));
    expect(mounted.result.current.handleNotificationNavigate).not.toBe(first);
  });

  it('po zmene isMobile nový handler zvolí inú cestu pre príspevok', () => {
    const mounted = mountHook({ isMobile: false });
    update(mounted, { isMobile: true });
    navigate(mounted, '/dashboard/feed/42');
    expect(calls).toEqual([CLEAR_INTENT, ...FINISH('/dashboard/feed/42')]);
  });

  it('po zmene routeru nový handler naviguje cez nový router', () => {
    const mounted = mountHook();
    update(mounted, { router: { push: spy('router#2.push') } });
    navigate(mounted, '/dashboard/favorites');
    expect(calls[calls.length - 1]).toBe(entry('router#2.push', '/dashboard/favorites'));
    expect(base.router.push).not.toHaveBeenCalled();
  });

  it('nový objekt highlighting s tou istou funkciou tiež vytvorí nový handler (v závislostiach je celý objekt)', () => {
    const mounted = mountHook();
    const first = mounted.result.current.handleNotificationNavigate;
    update(mounted, { highlighting: { setHighlightedSkillId: base.highlighting.setHighlightedSkillId } });
    expect(mounted.result.current.handleNotificationNavigate).not.toBe(first);
  });

  it('po zmene highlighting nový handler zvýrazňuje cez nový objekt', () => {
    const mounted = mountHook();
    update(mounted, { highlighting: { setHighlightedSkillId: spy('highlighting#2.set') } });
    navigate(mounted, '/dashboard/profile?offer=5');
    expect(calls).toContain(entry('highlighting#2.set', 5));
    expect(base.highlighting.setHighlightedSkillId).not.toHaveBeenCalled();
  });
});

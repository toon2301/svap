/**
 * Globálne udalosti okna pre profil: `goToUserProfile` (cudzí profil podľa ID alebo slugu, voliteľne so
 * zvýraznenou ponukou), `goToMyProfile` (vlastný profil) a udalosti detailu ponuky na mobile
 * (`profile:offer-detail-open` a `profile:offer-detail-close`).
 *
 * Hook má tri efekty v pevnom poradí: cudzí profil, vlastný profil a detail ponuky. Pomocné moduly profilu
 * sú tu nahradené záznamníkmi; skladanie adries a rozbor zvýraznenia ostávajú skutočné (dajú sa prepísať
 * na jedno volanie). Nastavovače sú záznamníky a poradie volaní je súčasť správania, preto sa všetko
 * zapisuje do jedného záznamu `calls`. Skutočný dashboard je pokrytý v
 * `DashboardContent.profileEvents.test.tsx` a `DashboardContent.renderShell.test.tsx`.
 */

import { renderHook, type RenderHookResult } from '@testing-library/react';
import {
  PROFILE_OFFER_DETAIL_CLOSE_EVENT,
  PROFILE_OFFER_DETAIL_OPEN_EVENT,
} from '../../modules/profile/profileOfferDetailEvents';
import { useProfileWindowEvents } from '../useProfileWindowEvents';

const mockMarkProfileFreshEntry = jest.fn();
const mockTargetFromIdentifier = jest.fn();
jest.mock('../../modules/profile/profileFreshEntry', () => ({
  ...jest.requireActual('../../modules/profile/profileFreshEntry'),
  markProfileFreshEntry: (...args: unknown[]) => mockMarkProfileFreshEntry(...args),
  profileEntryTargetFromIdentifier: (...args: unknown[]) => mockTargetFromIdentifier(...args),
}));

const mockGetUserIdBySlug = jest.fn();
jest.mock('../../modules/profile/profileUserCache', () => ({
  ...jest.requireActual('../../modules/profile/profileUserCache'),
  getUserIdBySlug: (...args: unknown[]) => mockGetUserIdBySlug(...args),
}));

const mockWithProfileOriginEntry = jest.fn();
jest.mock('../../modules/profile/profileOriginHistory', () => ({
  ...jest.requireActual('../../modules/profile/profileOriginHistory'),
  withProfileOriginEntry: (...args: unknown[]) => mockWithProfileOriginEntry(...args),
}));

const mockProfilePath = jest.fn();
const mockSectionPath = jest.fn();
jest.mock('../../components/dashboardRoutes', () => ({
  ...jest.requireActual('../../components/dashboardRoutes'),
  dashboardProfilePath: (...args: unknown[]) => mockProfilePath(...args),
  dashboardSectionPath: (...args: unknown[]) => mockSectionPath(...args),
}));

const mockParseHighlightId = jest.fn();
jest.mock('../../components/dashboardTargetUrl', () => ({
  ...jest.requireActual('../../components/dashboardTargetUrl'),
  parseDashboardHighlightId: (...args: unknown[]) => mockParseHighlightId(...args),
}));

const NOW = 1700000000000;
const ORIGIN_STATE = { origin: 'test-state' };
const OPEN = PROFILE_OFFER_DETAIL_OPEN_EVENT;
const CLOSE = PROFILE_OFFER_DETAIL_CLOSE_EVENT;
const USER_EVENT = 'goToUserProfile';
const MY_EVENT = 'goToMyProfile';
/** Poslucháče v poradí, v akom ich hook registruje. */
const EVENT_TYPES = [USER_EVENT, MY_EVENT, OPEN, CLOSE];

/** Všetko, čo hook zavolá, zapíše alebo zaregistruje, sa ukladá sem v poradí volaní. */
let calls: string[] = [];
/** Poslucháče, ktoré hook pridal a odobral (na porovnanie, že odoberá presne tie isté). */
let added: Array<{ type: string; listener: unknown }> = [];
let removed: Array<{ type: string; listener: unknown }> = [];
/** Slugy, ku ktorým cache pozná ID. */
let cachedIds: Record<string, number | undefined> = {};
/** Kľúče, pri ktorých zápis do sessionStorage po zázname zlyhá. */
let failingKeys = new Set<string>();

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

const listen = (...types: string[]) => types.map((type) => entry('addEventListener', type));
const unlisten = (...types: string[]) => types.map((type) => entry('removeEventListener', type));

type HookInput = Parameters<typeof useProfileWindowEvents>[0];
type Mounted = RenderHookResult<void, HookInput>;

const spy = (name: string) => jest.fn((...args: unknown[]) => record(name, ...args));

let base: HookInput;

const makeBase = (): HookInput => ({
  user: { id: 1, slug: 'testuser' },
  userProfile: {
    setViewedUserId: spy('setViewedUserId'),
    setViewedUserSlug: spy('setViewedUserSlug'),
    setViewedUserSummary: spy('setViewedUserSummary'),
  },
  highlighting: { setHighlightedSkillId: spy('setHighlightedSkillId') },
  setActiveModule: spy('setActiveModule'),
  setIsRightSidebarOpen: spy('setIsRightSidebarOpen'),
  setActiveRightItem: spy('setActiveRightItem'),
  setIsMobileMenuOpen: spy('setIsMobileMenuOpen'),
  setIsSearchOpen: spy('setIsSearchOpen'),
  setIsNotificationsPanelOpen: spy('setIsNotificationsPanelOpen'),
  setIsMobileOfferDetailOpen: spy('setIsMobileOfferDetailOpen'),
});

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const makeInput = (overrides: Partial<HookInput> = {}): HookInput => ({ ...base, ...overrides });

const renderTheHook = (overrides: Partial<HookInput> = {}): Mounted =>
  renderHook((props: HookInput) => useProfileWindowEvents(props), { initialProps: makeInput(overrides) });

/** Hook namontovaný a poslucháče zaregistrované; záznam volaní začína až od prvej udalosti. */
const mountHook = (overrides: Partial<HookInput> = {}): Mounted => {
  const mounted = renderTheHook(overrides);
  calls = [];
  return mounted;
};

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

const sendUser = (detail?: unknown) =>
  window.dispatchEvent(new CustomEvent(USER_EVENT, { detail }));
const sendMy = (detail?: unknown) =>
  window.dispatchEvent(new CustomEvent(MY_EVENT, { detail }));

const realSetItem = Storage.prototype.setItem;

/** Zapisuje do `calls` každý zápis do úložiska; pri kľúčoch z `failingKeys` po zázname zlyhá. */
const installStorageSpy = () => {
  jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function (this: Storage, key: string, value: string) {
      record(this === window.sessionStorage ? 'sessionStorage.setItem' : 'localStorage.setItem', key, value);
      if (failingKeys.has(key)) throw new Error('quota');
      realSetItem.call(this, key, value);
    });
};

const profilePathReturns = (value: string | null) =>
  mockProfilePath.mockImplementation((identifier: string) => {
    record('dashboardProfilePath', identifier);
    return value;
  });
const sectionPathReturns = (value: string | null) =>
  mockSectionPath.mockImplementation((moduleId: string) => {
    record('dashboardSectionPath', moduleId);
    return value;
  });

/** Modul, pravý panel a jeho položka, mobilné menu, hľadanie a upozornenia – v poradí volaní. */
const OPEN_MODULE = (moduleId: string) => [
  entry('setActiveModule', moduleId),
  entry('setIsRightSidebarOpen', false),
  entry('setActiveRightItem', ''),
  entry('setIsMobileMenuOpen', false),
  entry('setIsSearchOpen', false),
  entry('setIsNotificationsPanelOpen', false),
];

/** Zvýraznenie: stav, potom čas a ID do sessionStorage; bez zvýraznenia sa stav len vynuluje. */
const HIGHLIGHT = (id: number | null) =>
  id === null
    ? [entry('setHighlightedSkillId', null)]
    : [
        entry('setHighlightedSkillId', id),
        entry('sessionStorage.setItem', 'highlightedSkillId', String(id)),
        entry('sessionStorage.setItem', 'highlightedSkillTime', String(NOW)),
      ];

/** Záznam histórie s adresou profilu. */
const PUSH = (url: string) => [
  entry('withProfileOriginEntry', null),
  entry('history.pushState', ORIGIN_STATE, '', url),
];

/** Začiatok `goToUserProfile`: označenie vstupu, rozbor zvýraznenia, modul a zatvorenie panelov. */
const USER_HEAD = (identifier: string, target: unknown, rawHighlight?: unknown) => [
  entry('profileEntryTargetFromIdentifier', identifier),
  entry('markProfileFreshEntry', target),
  entry('parseDashboardHighlightId', rawHighlight),
  ...OPEN_MODULE('user-profile'),
];
const BY_ID = (id: number) => [entry('setViewedUserId', id), entry('setViewedUserSlug', null)];
const BY_SLUG = (slug: string, ...cached: number[]) => [
  entry('setViewedUserSlug', slug),
  entry('setViewedUserId', null),
  entry('getUserIdBySlug', slug),
  ...cached.map((id) => entry('setViewedUserId', id)),
];
const FORGET_SUMMARY = [entry('setViewedUserSummary', null)];
const USER_TAIL = (identifier: string, highlightId: number | null, url: string) => [
  ...HIGHLIGHT(highlightId),
  entry('dashboardProfilePath', identifier),
  ...PUSH(url),
];

/** `goToMyProfile`: rozbor zvýraznenia, označenie vstupu, modul, zatvorenie panelov a zabudnutý cudzí profil. */
const MY_HEAD = (rawHighlight?: unknown, target: unknown = { id: 1, slug: 'testuser' }) => [
  entry('parseDashboardHighlightId', rawHighlight),
  entry('markProfileFreshEntry', target),
  ...OPEN_MODULE('profile'),
  entry('setViewedUserId', null),
  entry('setViewedUserSlug', null),
  entry('setViewedUserSummary', null),
];
const MY_TAIL = (highlightId: number | null, url: string) => [
  ...HIGHLIGHT(highlightId),
  entry('dashboardSectionPath', 'profile'),
  ...PUSH(url),
];

const SETTER_KEYS = [
  'setActiveModule',
  'setIsRightSidebarOpen',
  'setActiveRightItem',
  'setIsMobileMenuOpen',
  'setIsSearchOpen',
  'setIsNotificationsPanelOpen',
  'setIsMobileOfferDetailOpen',
] as const;

beforeEach(() => {
  calls = [];
  added = [];
  removed = [];
  cachedIds = {};
  failingKeys = new Set();
  base = makeBase();
  localStorage.clear();
  sessionStorage.clear();
  installStorageSpy();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  jest.spyOn(window.history, 'pushState').mockImplementation((state, unused, url) => {
    record('history.pushState', state, unused, url);
  });

  const actualFresh = jest.requireActual('../../modules/profile/profileFreshEntry');
  mockTargetFromIdentifier.mockReset().mockImplementation((identifier: string) => {
    record('profileEntryTargetFromIdentifier', identifier);
    return actualFresh.profileEntryTargetFromIdentifier(identifier);
  });
  mockMarkProfileFreshEntry.mockReset().mockImplementation((target: unknown) => {
    record('markProfileFreshEntry', target);
  });
  mockGetUserIdBySlug.mockReset().mockImplementation((slug: string) => {
    record('getUserIdBySlug', slug);
    return cachedIds[slug];
  });
  mockWithProfileOriginEntry.mockReset().mockImplementation((state: unknown) => {
    record('withProfileOriginEntry', state);
    return ORIGIN_STATE;
  });
  const actualRoutes = jest.requireActual('../../components/dashboardRoutes');
  mockProfilePath.mockReset().mockImplementation((identifier: string) => {
    record('dashboardProfilePath', identifier);
    return actualRoutes.dashboardProfilePath(identifier);
  });
  mockSectionPath.mockReset().mockImplementation((moduleId: string) => {
    record('dashboardSectionPath', moduleId);
    return actualRoutes.dashboardSectionPath(moduleId);
  });
  const actualTarget = jest.requireActual('../../components/dashboardTargetUrl');
  mockParseHighlightId.mockReset().mockImplementation((value: unknown) => {
    record('parseDashboardHighlightId', value);
    return actualTarget.parseDashboardHighlightId(value);
  });

  const realAdd = window.addEventListener.bind(window);
  const realRemove = window.removeEventListener.bind(window);
  jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (EVENT_TYPES.includes(type)) {
      record('addEventListener', type);
      added.push({ type, listener });
    }
    realAdd(type, listener, options);
  });
  jest.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
    if (EVENT_TYPES.includes(type)) {
      record('removeEventListener', type);
      removed.push({ type, listener });
    }
    realRemove(type, listener, options);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('poslucháče na okne', () => {
  it('nič nevracia', () => {
    const mounted = renderTheHook();
    expect(mounted.result.current).toBeUndefined();
  });

  it('pri vytvorení zaregistruje štyri poslucháče v poradí efektov a nič iné nezavolá', () => {
    renderTheHook();
    expect(calls).toEqual(listen(...EVENT_TYPES));
    expect(added.map(({ type }) => type)).toEqual(EVENT_TYPES);
  });

  it('pri odmontovaní odoberie presne tie isté poslucháče v rovnakom poradí', () => {
    const mounted = mountHook();
    mounted.unmount();
    expect(calls).toEqual(unlisten(...EVENT_TYPES));
    expect(removed).toHaveLength(4);
    expect(removed).toEqual(added);
  });

  it('po odmontovaní už žiadna udalosť nič nezmení', () => {
    const mounted = mountHook();
    mounted.unmount();
    calls = [];

    sendUser({ identifier: '42', highlightId: 5 });
    sendMy({ highlightId: 5 });
    window.dispatchEvent(new CustomEvent(OPEN));
    window.dispatchEvent(new CustomEvent(CLOSE));

    expect(calls).toEqual([]);
  });

  it('nezmenené vstupy pri ďalšom renderi poslucháčov nechajú tak', () => {
    const mounted = mountHook();
    update(mounted, {});
    expect(calls).toEqual([]);
  });

  it('bez udalosti nič nenastaví ani nezapíše', () => {
    mountHook();
    expect(calls).toEqual([]);
    expect(base.setActiveModule).not.toHaveBeenCalled();
    expect(mockMarkProfileFreshEntry).not.toHaveBeenCalled();
  });
});

describe('goToUserProfile: ignorované udalosti', () => {
  it.each([
    ['bez detailu', new Event(USER_EVENT)],
    ['s detailom null', new CustomEvent(USER_EVENT, { detail: null })],
    ['s prázdnym detailom', new CustomEvent(USER_EVENT, { detail: {} })],
    ['s medzerovým identifikátorom', new CustomEvent(USER_EVENT, { detail: { identifier: '   ' } })],
    ['s prázdnym identifikátorom', new CustomEvent(USER_EVENT, { detail: { identifier: '' } })],
    ['s identifikátorom null', new CustomEvent(USER_EVENT, { detail: { identifier: null } })],
    ['s identifikátorom 0', new CustomEvent(USER_EVENT, { detail: { identifier: 0 } })],
    ['len so zvýraznením', new CustomEvent(USER_EVENT, { detail: { highlightId: 5, offerId: 9 } })],
  ])('udalosť %s nič nezavolá ani nezapíše a nevyhodí chybu', (_title, event) => {
    // Chyba v obsluhe udalosti sa v jsdom ohlási ako udalosť `error` na okne.
    const errors: unknown[] = [];
    const onError = (errorEvent: ErrorEvent) => {
      errors.push(errorEvent.error);
      errorEvent.preventDefault();
    };
    window.addEventListener('error', onError);
    mountHook();

    window.dispatchEvent(event);
    window.removeEventListener('error', onError);

    expect(errors).toEqual([]);
    expect(calls).toEqual([]);
    expect(window.history.pushState).not.toHaveBeenCalled();
  });
});

describe('goToUserProfile: koho sa profil otvára', () => {
  it('číselný identifikátor: profil podľa ID, slug preč, súhrn preč, nový záznam histórie', () => {
    mountHook();

    sendUser({ identifier: '42' });

    expect(calls).toEqual([
      ...USER_HEAD('42', { id: 42 }),
      ...BY_ID(42),
      ...FORGET_SUMMARY,
      ...USER_TAIL('42', null, '/dashboard/users/42'),
    ]);
  });

  it('slug: profil podľa slugu, ID sa najprv vynuluje a potom skúsi z cache', () => {
    mountHook();

    sendUser({ identifier: 'jana-novak' });

    expect(calls).toEqual([
      ...USER_HEAD('jana-novak', { slug: 'jana-novak' }),
      ...BY_SLUG('jana-novak'),
      ...FORGET_SUMMARY,
      ...USER_TAIL('jana-novak', null, '/dashboard/users/jana-novak'),
    ]);
  });

  it('slug so známym ID z cache dostane ID hneď, ešte pred zahodením súhrnu', () => {
    cachedIds = { 'jana-cache': 77 };
    mountHook();

    sendUser({ identifier: 'jana-cache' });

    expect(calls).toEqual([
      ...USER_HEAD('jana-cache', { slug: 'jana-cache' }),
      ...BY_SLUG('jana-cache', 77),
      ...FORGET_SUMMARY,
      ...USER_TAIL('jana-cache', null, '/dashboard/users/jana-cache'),
    ]);
  });

  it.each([[0], [undefined]])('ID %p z cache sa nepoužije', (cached) => {
    cachedIds = { jana: cached };
    mountHook();

    sendUser({ identifier: 'jana' });

    expect(calls).toEqual([
      ...USER_HEAD('jana', { slug: 'jana' }),
      ...BY_SLUG('jana'),
      ...FORGET_SUMMARY,
      ...USER_TAIL('jana', null, '/dashboard/users/jana'),
    ]);
  });

  it('medzery okolo identifikátora sa orežú pred každým použitím', () => {
    mountHook();

    sendUser({ identifier: '  jana-novak  ' });

    expect(calls).toEqual([
      ...USER_HEAD('jana-novak', { slug: 'jana-novak' }),
      ...BY_SLUG('jana-novak'),
      ...FORGET_SUMMARY,
      ...USER_TAIL('jana-novak', null, '/dashboard/users/jana-novak'),
    ]);
  });

  it.each([
    ['42', 42],
    ['0', 0],
    ['007', 7],
    ['  42  ', 42],
  ])('identifikátor %p je číslo %p', (identifier, id) => {
    mountHook();

    sendUser({ identifier });

    const trimmed = identifier.trim();
    expect(calls).toEqual([
      ...USER_HEAD(trimmed, { id }),
      ...BY_ID(id),
      ...FORGET_SUMMARY,
      ...USER_TAIL(trimmed, null, `/dashboard/users/${trimmed}`),
    ]);
  });

  it.each([['4 2'], ['42a'], ['-5'], ['4.2'], ['x42']])('identifikátor %p je slug', (identifier) => {
    mountHook();

    sendUser({ identifier });

    expect(calls).toContain(entry('setViewedUserSlug', identifier));
    expect(calls).toContain(entry('getUserIdBySlug', identifier));
    expect(calls).not.toContain(entry('setViewedUserSlug', null));
  });

  it('identifikátor s netriednymi znakmi ide do staviteľky adresy nezakódovaný', () => {
    mountHook();

    sendUser({ identifier: 'ján ová' });

    expect(calls).toContain(entry('dashboardProfilePath', 'ján ová'));
    expect(calls.slice(-1)).toEqual([
      entry('history.pushState', ORIGIN_STATE, '', '/dashboard/users/j%C3%A1n%20ov%C3%A1'),
    ]);
  });

  it('cieľ nového vstupu sa odovzdá tak, ako ho vrátilo mapovanie (ten istý objekt)', () => {
    const target = { id: 4242 };
    mockTargetFromIdentifier.mockImplementation(() => target);
    mountHook();

    sendUser({ identifier: '42' });

    expect(mockMarkProfileFreshEntry).toHaveBeenCalledTimes(1);
    expect(mockMarkProfileFreshEntry.mock.calls[0][0]).toBe(target);
  });

  it('vstup sa označí ešte pred zmenou čohokoľvek v appke', () => {
    mountHook();

    sendUser({ identifier: '42' });

    expect(calls.indexOf(entry('markProfileFreshEntry', { id: 42 }))).toBeLessThan(
      calls.indexOf(entry('setActiveModule', 'user-profile')),
    );
  });
});

describe('goToUserProfile: zvýraznená ponuka', () => {
  it.each([
    ['číslo highlightId', { highlightId: 5 }, 5, 5, '?highlight=5'],
    ['reťazec highlightId', { highlightId: '7' }, '7', 7, '?highlight=7'],
    ['offerId', { offerId: 9 }, 9, 9, '?offer=9'],
    ['offerId má prednosť pred highlightId', { offerId: 9, highlightId: 5 }, 9, 9, '?offer=9'],
    ['reťazec offerId', { offerId: '11' }, '11', 11, '?offer=11'],
    ['offerId null prepustí highlightId', { offerId: null, highlightId: 5 }, 5, 5, '?highlight=5'],
  ] as Array<[string, Record<string, unknown>, unknown, number, string]>)(
    '%s',
    (_title, extra, rawHighlight, id, query) => {
      mountHook();

      sendUser({ identifier: 'jana-novak', ...extra });

      expect(calls).toEqual([
        ...USER_HEAD('jana-novak', { slug: 'jana-novak' }, rawHighlight),
        ...BY_SLUG('jana-novak'),
        ...FORGET_SUMMARY,
        ...USER_TAIL('jana-novak', id, `/dashboard/users/jana-novak${query}`),
      ]);
    },
  );

  it.each([
    ['text', { highlightId: 'abc' }, 'abc'],
    ['desatinné číslo', { highlightId: 1.5 }, 1.5],
    ['nula', { highlightId: 0 }, 0],
    ['záporné číslo', { highlightId: -3 }, -3],
    ['prázdny reťazec', { highlightId: '  ' }, '  '],
    ['null', { highlightId: null }, null],
    ['bez zvýraznenia', {}, undefined],
    ['offerId nula prebije platné highlightId', { offerId: 0, highlightId: 4 }, 0],
  ] as Array<[string, Record<string, unknown>, unknown]>)(
    'neplatné zvýraznenie (%s) nepridá parameter, nič nezapíše a predošlé zruší',
    (_title, extra, rawHighlight) => {
      mountHook();

      sendUser({ identifier: 'jana-novak', ...extra });

      expect(calls).toEqual([
        ...USER_HEAD('jana-novak', { slug: 'jana-novak' }, rawHighlight),
        ...BY_SLUG('jana-novak'),
        ...FORGET_SUMMARY,
        ...USER_TAIL('jana-novak', null, '/dashboard/users/jana-novak'),
      ]);
    },
  );

  it('rozbor zvýraznenia rozhoduje: ID z neho sa použije všade', () => {
    mockParseHighlightId.mockImplementation((value: unknown) => {
      record('parseDashboardHighlightId', value);
      return 99;
    });
    mountHook();

    sendUser({ identifier: 'jana', highlightId: 5 });

    expect(calls).toEqual([
      ...USER_HEAD('jana', { slug: 'jana' }, 5),
      ...BY_SLUG('jana'),
      ...FORGET_SUMMARY,
      ...USER_TAIL('jana', 99, '/dashboard/users/jana?highlight=99'),
    ]);
  });

  it('nezapísateľné úložisko udalosť nezruší: ID zlyhá, čas sa už nepíše, história sa pridá', () => {
    failingKeys = new Set(['highlightedSkillId']);
    mountHook();

    sendUser({ identifier: 'jana', highlightId: 5 });

    expect(calls).toEqual([
      ...USER_HEAD('jana', { slug: 'jana' }, 5),
      ...BY_SLUG('jana'),
      ...FORGET_SUMMARY,
      entry('setHighlightedSkillId', 5),
      entry('sessionStorage.setItem', 'highlightedSkillId', '5'),
      entry('dashboardProfilePath', 'jana'),
      ...PUSH('/dashboard/users/jana?highlight=5'),
    ]);
  });

  it('nezapísateľný čas zvýraznenia udalosť nezruší', () => {
    failingKeys = new Set(['highlightedSkillTime']);
    mountHook();

    sendUser({ identifier: 'jana', highlightId: 5 });

    expect(calls).toEqual([
      ...USER_HEAD('jana', { slug: 'jana' }, 5),
      ...BY_SLUG('jana'),
      ...FORGET_SUMMARY,
      ...USER_TAIL('jana', 5, '/dashboard/users/jana?highlight=5'),
    ]);
  });
});

describe('goToUserProfile: adresa a história', () => {
  it('adresu skladá staviteľka profilu a dotaz sa pripojí za ňu', () => {
    profilePathReturns('/inde/jana');
    mountHook();

    sendUser({ identifier: 'jana', highlightId: 5 });

    expect(calls.slice(-3)).toEqual([
      entry('dashboardProfilePath', 'jana'),
      entry('withProfileOriginEntry', null),
      entry('history.pushState', ORIGIN_STATE, '', '/inde/jana?highlight=5'),
    ]);
  });

  it.each([[null], ['']])('keď staviteľka adresu nevráti (%p), história sa nezmení', (path) => {
    profilePathReturns(path);
    mountHook();

    sendUser({ identifier: 'jana', highlightId: 5 });

    expect(calls).toEqual([
      ...USER_HEAD('jana', { slug: 'jana' }, 5),
      ...BY_SLUG('jana'),
      ...FORGET_SUMMARY,
      ...HIGHLIGHT(5),
      entry('dashboardProfilePath', 'jana'),
    ]);
    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(mockWithProfileOriginEntry).not.toHaveBeenCalled();
  });

  it('stav záznamu histórie je to, čo vráti withProfileOriginEntry (ten istý objekt)', () => {
    mountHook();

    sendUser({ identifier: 'jana' });

    const pushState = window.history.pushState as unknown as { mock: { calls: unknown[][] } };
    expect(pushState.mock.calls).toHaveLength(1);
    expect(pushState.mock.calls[0][0]).toBe(ORIGIN_STATE);
    expect(pushState.mock.calls[0][1]).toBe('');
  });

  it('opakovaná udalosť spraví to isté znova', () => {
    mountHook();
    sendUser({ identifier: '42' });
    const first = [...calls];
    calls = [];

    sendUser({ identifier: '42' });

    expect(calls).toEqual(first);
  });
});

describe('goToMyProfile: vlastný profil', () => {
  it('bez detailu: modul profil, cudzí profil preč, nový záznam histórie', () => {
    mountHook();

    sendMy();

    expect(calls).toEqual([...MY_HEAD(undefined), ...MY_TAIL(null, '/dashboard/profile')]);
  });

  it('s prázdnym detailom je to isté', () => {
    mountHook();

    sendMy({});

    expect(calls).toEqual([...MY_HEAD(undefined), ...MY_TAIL(null, '/dashboard/profile')]);
  });

  it('vstup sa označí podľa prihláseného používateľa (ID aj slug)', () => {
    mountHook({ user: { id: 7, slug: 'moj-slug' } });

    sendMy();

    expect(calls).toEqual([
      ...MY_HEAD(undefined, { id: 7, slug: 'moj-slug' }),
      ...MY_TAIL(null, '/dashboard/profile'),
    ]);
  });

  it('bez prihláseného používateľa sa vstup označí bez ID aj slugu a udalosť prebehne', () => {
    mountHook({ user: null });

    sendMy();

    expect(mockMarkProfileFreshEntry).toHaveBeenCalledWith({ id: undefined, slug: undefined });
    expect(calls).toEqual([...MY_HEAD(undefined, {}), ...MY_TAIL(null, '/dashboard/profile')]);
  });

  it('po zmene používateľa označí vstup novými údajmi', () => {
    const mounted = mountHook();
    update(mounted, { user: { id: 2, slug: 'novy-slug' } });
    calls = [];

    sendMy();

    expect(calls[1]).toBe(entry('markProfileFreshEntry', { id: 2, slug: 'novy-slug' }));
  });

  it('rozbor zvýraznenia dostane len highlightId, offerId sa nepoužíva', () => {
    mountHook();

    sendMy({ offerId: 9 });

    expect(calls).toEqual([...MY_HEAD(undefined), ...MY_TAIL(null, '/dashboard/profile')]);
  });

  it('vstup sa označí až po rozbore zvýraznenia a pred zmenou modulu', () => {
    mountHook();

    sendMy({ highlightId: 5 });

    expect(calls.slice(0, 3)).toEqual([
      entry('parseDashboardHighlightId', 5),
      entry('markProfileFreshEntry', { id: 1, slug: 'testuser' }),
      entry('setActiveModule', 'profile'),
    ]);
  });
});

describe('goToMyProfile: zvýraznená ponuka', () => {
  it.each([
    ['číslo', { highlightId: 5 }, 5, 5],
    ['reťazec', { highlightId: '8' }, '8', 8],
  ] as Array<[string, Record<string, unknown>, unknown, number]>)(
    'platné zvýraznenie (%s) pridá parameter a zapíše ho',
    (_title, detail, rawHighlight, id) => {
      mountHook();

      sendMy(detail);

      expect(calls).toEqual([
        ...MY_HEAD(rawHighlight),
        ...MY_TAIL(id, `/dashboard/profile?highlight=${id}`),
      ]);
    },
  );

  it.each([
    ['text', { highlightId: 'abc' }, 'abc'],
    ['desatinné číslo', { highlightId: 2.5 }, 2.5],
    ['nula', { highlightId: 0 }, 0],
    ['záporné číslo', { highlightId: -1 }, -1],
    ['null', { highlightId: null }, null],
  ] as Array<[string, Record<string, unknown>, unknown]>)(
    'neplatné zvýraznenie (%s) nepridá parameter, nič nezapíše a predošlé zruší',
    (_title, detail, rawHighlight) => {
      mountHook();

      sendMy(detail);

      expect(calls).toEqual([...MY_HEAD(rawHighlight), ...MY_TAIL(null, '/dashboard/profile')]);
    },
  );

  it('rozbor zvýraznenia rozhoduje: ID z neho sa použije všade', () => {
    mockParseHighlightId.mockImplementation((value: unknown) => {
      record('parseDashboardHighlightId', value);
      return 99;
    });
    mountHook();

    sendMy({ highlightId: 5 });

    expect(calls).toEqual([...MY_HEAD(5), ...MY_TAIL(99, '/dashboard/profile?highlight=99')]);
  });

  it('nezapísateľné úložisko udalosť nezruší: ID zlyhá, čas sa už nepíše, história sa pridá', () => {
    failingKeys = new Set(['highlightedSkillId']);
    mountHook();

    sendMy({ highlightId: 5 });

    expect(calls).toEqual([
      ...MY_HEAD(5),
      entry('setHighlightedSkillId', 5),
      entry('sessionStorage.setItem', 'highlightedSkillId', '5'),
      entry('dashboardSectionPath', 'profile'),
      ...PUSH('/dashboard/profile?highlight=5'),
    ]);
  });

  it('nezapísateľný čas zvýraznenia udalosť nezruší', () => {
    failingKeys = new Set(['highlightedSkillTime']);
    mountHook();

    sendMy({ highlightId: 5 });

    expect(calls).toEqual([...MY_HEAD(5), ...MY_TAIL(5, '/dashboard/profile?highlight=5')]);
  });
});

describe('goToMyProfile: adresa, história a chyby nastavovačov', () => {
  it('adresu vlastného profilu dáva dashboardSectionPath a dotaz sa pripojí za ňu', () => {
    sectionPathReturns('/moj/profil');
    mountHook();

    sendMy({ highlightId: 5 });

    expect(calls.slice(-3)).toEqual([
      entry('dashboardSectionPath', 'profile'),
      entry('withProfileOriginEntry', null),
      entry('history.pushState', ORIGIN_STATE, '', '/moj/profil?highlight=5'),
    ]);
  });

  it.each([[null], ['']])('keď tabuľka adresu nepozná (%p), história sa nezmení', (path) => {
    sectionPathReturns(path);
    mountHook();

    sendMy({ highlightId: 5 });

    expect(calls).toEqual([...MY_HEAD(5), ...HIGHLIGHT(5), entry('dashboardSectionPath', 'profile')]);
    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(mockWithProfileOriginEntry).not.toHaveBeenCalled();
  });

  it('chyba pri vynulovaní ID cudzieho profilu zruší zvyšok vynulovania, ale nie udalosť', () => {
    const throwing = spy('setViewedUserId');
    throwing.mockImplementation(() => {
      record('setViewedUserId', null);
      throw new Error('boom');
    });
    mountHook({ userProfile: { ...base.userProfile, setViewedUserId: throwing } });

    sendMy({ highlightId: 5 });

    expect(calls).toEqual([
      entry('parseDashboardHighlightId', 5),
      entry('markProfileFreshEntry', { id: 1, slug: 'testuser' }),
      ...OPEN_MODULE('profile'),
      entry('setViewedUserId', null),
      ...MY_TAIL(5, '/dashboard/profile?highlight=5'),
    ]);
  });

  it('chyba pri vynulovaní slugu zruší už len vynulovanie súhrnu', () => {
    const throwing = spy('setViewedUserSlug');
    throwing.mockImplementation(() => {
      record('setViewedUserSlug', null);
      throw new Error('boom');
    });
    mountHook({ userProfile: { ...base.userProfile, setViewedUserSlug: throwing } });

    sendMy();

    expect(calls).toEqual([
      entry('parseDashboardHighlightId', undefined),
      entry('markProfileFreshEntry', { id: 1, slug: 'testuser' }),
      ...OPEN_MODULE('profile'),
      entry('setViewedUserId', null),
      entry('setViewedUserSlug', null),
      ...MY_TAIL(null, '/dashboard/profile'),
    ]);
  });
});

describe('detail ponuky na mobile', () => {
  it('udalosť otvorenia zapne príznak a nič iné nezavolá', () => {
    mountHook();

    window.dispatchEvent(new CustomEvent(OPEN));

    expect(calls).toEqual([entry('setIsMobileOfferDetailOpen', true)]);
  });

  it('udalosť zatvorenia vypne príznak a nič iné nezavolá', () => {
    mountHook();

    window.dispatchEvent(new CustomEvent(CLOSE));

    expect(calls).toEqual([entry('setIsMobileOfferDetailOpen', false)]);
  });

  it('každá udalosť zapíše znova, aj opakovane', () => {
    mountHook();

    window.dispatchEvent(new CustomEvent(OPEN));
    window.dispatchEvent(new CustomEvent(OPEN));
    window.dispatchEvent(new CustomEvent(CLOSE));
    window.dispatchEvent(new CustomEvent(CLOSE));

    expect(calls).toEqual([
      entry('setIsMobileOfferDetailOpen', true),
      entry('setIsMobileOfferDetailOpen', true),
      entry('setIsMobileOfferDetailOpen', false),
      entry('setIsMobileOfferDetailOpen', false),
    ]);
  });

  it('udalosti profilu detail ponuky nezmenia a naopak', () => {
    mountHook();

    sendMy();
    expect(calls).not.toContain(entry('setIsMobileOfferDetailOpen', true));
    expect(calls).not.toContain(entry('setIsMobileOfferDetailOpen', false));
    calls = [];

    window.dispatchEvent(new CustomEvent(OPEN));
    expect(calls).toEqual([entry('setIsMobileOfferDetailOpen', true)]);
  });

  it('po zmene nastavovača volá udalosť nový a starý nie', () => {
    const mounted = mountHook();
    const newer = spy('novší setIsMobileOfferDetailOpen');
    update(mounted, { setIsMobileOfferDetailOpen: newer });
    calls = [];

    window.dispatchEvent(new CustomEvent(OPEN));
    window.dispatchEvent(new CustomEvent(CLOSE));

    expect(calls).toEqual([
      entry('novší setIsMobileOfferDetailOpen', true),
      entry('novší setIsMobileOfferDetailOpen', false),
    ]);
    expect(base.setIsMobileOfferDetailOpen).not.toHaveBeenCalled();
  });
});

describe('kedy sa ktorý poslucháč zaregistruje znova', () => {
  const USER = [USER_EVENT];
  const MY = [MY_EVENT];
  const OFFER = [OPEN, CLOSE];
  const same = (): HookInput['user'] => ({ id: 1, slug: 'testuser' });

  /** Zmena vstupu a efekty (podľa poslucháčov), ktoré sa kvôli nej odpoja a pripoja nanovo. */
  const DEPENDENCIES: Array<[string, keyof HookInput, () => Partial<HookInput>, string[][]]> = [
    ['nový objekt používateľa s tým istým ID a slugom', 'user', () => ({ user: same() }), []],
    ['iné ID používateľa', 'user', () => ({ user: { id: 2, slug: 'testuser' } }), [MY]],
    ['iný slug používateľa', 'user', () => ({ user: { id: 1, slug: 'iny-slug' } }), [MY]],
    ['používateľ zmizne', 'user', () => ({ user: null }), [MY]],
    ['nový objekt profilu', 'userProfile', () => ({ userProfile: { ...base.userProfile } }), [USER, MY]],
    ['nový objekt zvýraznenia', 'highlighting', () => ({ highlighting: { ...base.highlighting } }), [USER, MY]],
    ['setActiveModule', 'setActiveModule', () => ({ setActiveModule: spy('x') }), [USER, MY]],
    ['setIsRightSidebarOpen', 'setIsRightSidebarOpen', () => ({ setIsRightSidebarOpen: spy('x') }), [USER, MY]],
    ['setActiveRightItem', 'setActiveRightItem', () => ({ setActiveRightItem: spy('x') }), [USER, MY]],
    ['setIsMobileMenuOpen', 'setIsMobileMenuOpen', () => ({ setIsMobileMenuOpen: spy('x') }), [USER, MY]],
    ['setIsSearchOpen', 'setIsSearchOpen', () => ({ setIsSearchOpen: spy('x') }), [USER, MY]],
    [
      'setIsNotificationsPanelOpen',
      'setIsNotificationsPanelOpen',
      () => ({ setIsNotificationsPanelOpen: spy('x') }),
      [USER, MY],
    ],
    // Zámerná odchýlka od pôvodného `[]` v komponente: nastavovač je teraz vstup hooku, a tak je v poli.
    // Pri nezmenenom nastavovači (stav z useState) sa správanie nemení; pri zmenenom sa pripojí nanovo.
    [
      'setIsMobileOfferDetailOpen',
      'setIsMobileOfferDetailOpen',
      () => ({ setIsMobileOfferDetailOpen: spy('x') }),
      [OFFER],
    ],
  ];

  it.each(DEPENDENCIES)('zmena: %s', (_label, _key, overrides, effects) => {
    const mounted = mountHook();

    update(mounted, overrides());

    const types = effects.flat();
    expect(calls).toEqual(types.length === 0 ? [] : [...unlisten(...types), ...listen(...types)]);
  });

  it('tabuľka zmien pokrýva každý vstup hooku', () => {
    const covered = new Set(DEPENDENCIES.map(([, key]) => key));
    expect([...covered].sort()).toEqual(Object.keys(makeBase()).sort());
  });
});

describe('najnovšie vstupy', () => {
  it('po zmene vstupov volajú udalosti nové nastavovače a staré nie', () => {
    const mounted = mountHook();
    const names = [
      'setViewedUserId',
      'setViewedUserSlug',
      'setViewedUserSummary',
      'setHighlightedSkillId',
      ...SETTER_KEYS,
    ];
    const next = (name: string) => spy(`novší ${name}`);
    update(mounted, {
      user: { id: 2, slug: 'novy' },
      userProfile: {
        setViewedUserId: next('setViewedUserId'),
        setViewedUserSlug: next('setViewedUserSlug'),
        setViewedUserSummary: next('setViewedUserSummary'),
      },
      highlighting: { setHighlightedSkillId: next('setHighlightedSkillId') },
      setActiveModule: next('setActiveModule'),
      setIsRightSidebarOpen: next('setIsRightSidebarOpen'),
      setActiveRightItem: next('setActiveRightItem'),
      setIsMobileMenuOpen: next('setIsMobileMenuOpen'),
      setIsSearchOpen: next('setIsSearchOpen'),
      setIsNotificationsPanelOpen: next('setIsNotificationsPanelOpen'),
      setIsMobileOfferDetailOpen: next('setIsMobileOfferDetailOpen'),
    });
    calls = [];

    sendUser({ identifier: 'jana', highlightId: 3 });
    sendMy({ highlightId: 4 });
    window.dispatchEvent(new CustomEvent(OPEN));

    names.forEach((name) => {
      expect(calls.some((line) => line.startsWith(`novší ${name}(`))).toBe(true);
    });
    expect(calls.some((line) => /^(set[A-Za-z]+)\(/.test(line))).toBe(false);
    SETTER_KEYS.forEach((key) => expect(base[key]).not.toHaveBeenCalled());
    expect(base.userProfile.setViewedUserId).not.toHaveBeenCalled();
    expect(base.userProfile.setViewedUserSlug).not.toHaveBeenCalled();
    expect(base.userProfile.setViewedUserSummary).not.toHaveBeenCalled();
    expect(base.highlighting.setHighlightedSkillId).not.toHaveBeenCalled();
  });
});

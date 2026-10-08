/**
 * Tlačidlo späť a dopredu v prehliadači: modul a zobrazený používateľ sa zosúladia s adresou.
 *
 * Hook počúva na `popstate`. Z adresy odvodí modul rovnakým mapovaním ako pri mounte
 * (`dashboardModuleFromPath`), nastaví ho aj s uložením do localStorage, podľa modulu zapíše alebo
 * zahodí zobrazeného používateľa a zavrie pravý panel aj mobilné menu. Mapovanie adries je tu
 * skutočné (dá sa prepísať na jedno volanie), nastavovače sú záznamníky a poradie volaní je súčasť
 * správania, preto sa všetko zapisuje do jedného záznamu `calls`. Skutočný dashboard je pokrytý
 * v `DashboardContent.popstateSync.test.tsx`.
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { usePopstateModuleSync } from '../usePopstateModuleSync';

const mockModuleFromPath = jest.fn();
jest.mock('../../components/dashboardMountRoute', () => ({
  ...jest.requireActual('../../components/dashboardMountRoute'),
  dashboardModuleFromPath: (...args: unknown[]) => mockModuleFromPath(...args),
}));

const mockIdentifierFromTarget = jest.fn();
jest.mock('../../components/dashboardTargetUrl', () => ({
  ...jest.requireActual('../../components/dashboardTargetUrl'),
  getDashboardUserIdentifierFromTarget: (...args: unknown[]) => mockIdentifierFromTarget(...args),
}));

/** Všetko, čo hook zavolá, zapíše alebo zaregistruje, sa ukladá sem v poradí volaní. */
let calls: string[] = [];
/** Poslucháče, ktoré hook pridal a odobral (na porovnanie, že odoberá presne ten istý). */
let added: unknown[] = [];
let removed: unknown[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

const LISTEN = entry('addEventListener', 'popstate');
const UNLISTEN = entry('removeEventListener', 'popstate');

type HookInput = Parameters<typeof usePopstateModuleSync>[0];
type Mounted = RenderHookResult<void, HookInput>;

const spy = (name: string) => jest.fn((...args: unknown[]) => record(name, ...args));

let base: HookInput;

const makeBase = (): HookInput => ({
  isMobile: false,
  setActiveModule: spy('setActiveModule'),
  setIsRightSidebarOpen: spy('setIsRightSidebarOpen'),
  setActiveRightItem: spy('setActiveRightItem'),
  setIsMobileMenuOpen: spy('setIsMobileMenuOpen'),
  setViewedUserId: spy('setViewedUserId'),
  setViewedUserSlug: spy('setViewedUserSlug'),
  setViewedUserSummary: spy('setViewedUserSummary'),
});

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const makeInput = (overrides: Partial<HookInput> = {}): HookInput => ({ ...base, ...overrides });

/** Hook namontovaný a poslucháč zaregistrovaný; záznam volaní začína až od prvej udalosti. */
const mountHook = (overrides: Partial<HookInput> = {}): Mounted => {
  const mounted = renderHook((props: HookInput) => usePopstateModuleSync(props), {
    initialProps: makeInput(overrides),
  });
  calls = [];
  return mounted;
};

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

const goTo = (url: string) => window.history.replaceState(null, '', url);

/** Tlačidlo späť: adresa sa zmení a prehliadač vyšle `popstate`. */
const pressBack = (url?: string) => {
  if (url !== undefined) goTo(url);
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
};

const realSetItem = Storage.prototype.setItem;
let storageFails = false;

/** Zapisuje do `calls` každý zápis do localStorage; pri `storageFails` po zápise zlyhá. */
const installStorageSpy = () => {
  jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function (this: Storage, key: string, value: string) {
      record('localStorage.setItem', key, value);
      if (storageFails) throw new Error('quota');
      realSetItem.call(this, key, value);
    });
};

const SET_MODULE = (moduleId: string) => [
  entry('setActiveModule', moduleId),
  entry('localStorage.setItem', 'activeModule', moduleId),
];
const FORGET_USER = [
  entry('setViewedUserId', null),
  entry('setViewedUserSlug', null),
  entry('setViewedUserSummary', null),
];
const CLOSE_PANELS = [
  entry('setIsRightSidebarOpen', false),
  entry('setActiveRightItem', ''),
  entry('setIsMobileMenuOpen', false),
];

/** Modul bez zobrazeného používateľa: modul, uloženie, zabudnutie používateľa, zatvorenie panelov. */
const PLAIN = (moduleId: string) => [...SET_MODULE(moduleId), ...FORGET_USER, ...CLOSE_PANELS];

/** Modul s profilom: modul, uloženie, zhrnutie preč, zápis používateľa, zatvorenie panelov. */
const PROFILE = (moduleId: string, ...userCalls: string[]) => [
  ...SET_MODULE(moduleId),
  entry('setViewedUserSummary', null),
  ...userCalls,
  ...CLOSE_PANELS,
];

const INPUT_KEYS = Object.keys(makeBase()) as Array<keyof HookInput>;

beforeEach(() => {
  calls = [];
  added = [];
  removed = [];
  storageFails = false;
  base = makeBase();
  localStorage.clear();
  goTo('/dashboard');
  installStorageSpy();

  const actualRoute = jest.requireActual('../../components/dashboardMountRoute');
  mockModuleFromPath.mockReset().mockImplementation(actualRoute.dashboardModuleFromPath);
  const actualTarget = jest.requireActual('../../components/dashboardTargetUrl');
  mockIdentifierFromTarget
    .mockReset()
    .mockImplementation(actualTarget.getDashboardUserIdentifierFromTarget);

  const realAdd = window.addEventListener.bind(window);
  const realRemove = window.removeEventListener.bind(window);
  jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type === 'popstate') {
      record('addEventListener', type);
      added.push(listener);
    }
    realAdd(type, listener, options);
  });
  jest.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
    if (type === 'popstate') {
      record('removeEventListener', type);
      removed.push(listener);
    }
    realRemove(type, listener, options);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('poslucháč popstate', () => {
  it('pri vytvorení zaregistruje jeden poslucháč a nič iné nezavolá', () => {
    renderHook(() => usePopstateModuleSync(makeInput()));
    expect(calls).toEqual([LISTEN]);
    expect(added).toHaveLength(1);
    expect(typeof added[0]).toBe('function');
  });

  it('bez udalosti nič nenastaví ani nezapíše', () => {
    mountHook();
    goTo('/dashboard/search');
    expect(calls).toEqual([]);
  });

  it('pri odmontovaní odoberie presne ten istý poslucháč', () => {
    const mounted = renderHook(() => usePopstateModuleSync(makeInput()));
    mounted.unmount();
    expect(calls).toEqual([LISTEN, UNLISTEN]);
    expect(removed).toHaveLength(1);
    expect(removed[0]).toBe(added[0]);
  });

  it('po odmontovaní sa udalosť ignoruje', () => {
    const mounted = renderHook(() => usePopstateModuleSync(makeInput()));
    mounted.unmount();
    calls = [];
    pressBack('/dashboard/search');
    expect(calls).toEqual([]);
  });

  it('opakovaná udalosť spraví to isté znova a vždy číta aktuálnu adresu', () => {
    mountHook();
    pressBack('/dashboard/search');
    pressBack('/dashboard/requests');
    expect(calls).toEqual([...PLAIN('search'), ...PLAIN('requests')]);
  });

  it('nezmenené vstupy poslucháča nechajú tak', () => {
    const mounted = mountHook();
    update(mounted, {});
    expect(calls).toEqual([]);
  });

  it.each(INPUT_KEYS)('zmena vstupu %s poslucháča zaregistruje nanovo', (key) => {
    const mounted = mountHook();
    update(mounted, key === 'isMobile' ? { isMobile: true } : ({ [key]: spy('nová') } as Partial<HookInput>));
    expect(calls).toEqual([UNLISTEN, LISTEN]);
    expect(removed[removed.length - 1]).not.toBe(added[added.length - 1]);
  });

  it('po zmene vstupov volá nové nastavovače a staré nie', () => {
    const mounted = mountHook();
    const newerModule = spy('novší setActiveModule');
    const newerSlug = spy('novší setViewedUserSlug');
    update(mounted, { setActiveModule: newerModule, setViewedUserSlug: newerSlug });
    calls = [];

    pressBack('/dashboard/search');

    expect(calls).toEqual([
      entry('novší setActiveModule', 'search'),
      entry('localStorage.setItem', 'activeModule', 'search'),
      entry('setViewedUserId', null),
      entry('novší setViewedUserSlug', null),
      entry('setViewedUserSummary', null),
      ...CLOSE_PANELS,
    ]);
    expect(base.setActiveModule).not.toHaveBeenCalled();
    expect(base.setViewedUserSlug).not.toHaveBeenCalled();
  });
});

describe('modul podľa adresy', () => {
  it.each([
    ['/dashboard', 'home'],
    ['/dashboard/home', 'home'],
    ['/dashboard/search', 'search'],
    ['/dashboard/requests', 'requests'],
    ['/dashboard/messages', 'messages'],
    ['/dashboard/notifications', 'notifications'],
    ['/dashboard/favorites', 'favorites'],
    ['/dashboard/settings', 'settings'],
    ['/dashboard/settings/account', 'account-settings'],
    ['/dashboard/language', 'language'],
    ['/dashboard/profile', 'profile'],
    ['/dashboard/skills/offer', 'skills-offer'],
    ['/dashboard/offers/3/reviews', 'offer-reviews'],
    ['/dashboard/users/jana/portfolio/create', 'portfolio-create'],
  ])('adresa %s nastaví modul %s a zabudne zobrazeného používateľa', (url, moduleId) => {
    mountHook();

    pressBack(url);

    expect(calls).toEqual(PLAIN(moduleId));
  });

  it('modul sa uloží do localStorage', () => {
    mountHook();
    pressBack('/dashboard/requests');
    expect(localStorage.getItem('activeModule')).toBe('requests');
  });

  it('rozhoduje len cesta, dotaz a hash sa ignorujú', () => {
    mountHook();

    pressBack('/dashboard/search?q=abc&tab=1#vysledky');

    expect(calls).toEqual(PLAIN('search'));
    expect(mockModuleFromPath).toHaveBeenCalledTimes(1);
    expect(mockModuleFromPath).toHaveBeenCalledWith('/dashboard/search');
  });

  it.each([['/dashboard/neznama-sekcia'], ['/inde'], ['/'], ['/dashboard/users/%E0%A4%A']])(
    'adresa %s modul nemení a nič nezapíše',
    (url) => {
      mountHook();

      pressBack(url);

      expect(calls).toEqual([]);
      expect(localStorage.getItem('activeModule')).toBeNull();
    },
  );

  it('keď mapovanie modul nepozná (null), nič sa nenastaví', () => {
    mountHook();
    mockModuleFromPath.mockReturnValue(null);

    pressBack('/dashboard/search');

    expect(calls).toEqual([]);
  });

  it('modul z mapovania sa použije tak, ako prišiel', () => {
    mountHook();
    mockModuleFromPath.mockReturnValue('vymyslený-modul');

    pressBack('/dashboard/search');

    expect(calls).toEqual(PLAIN('vymyslený-modul'));
  });

  it('mapovanie dostane cestu z aktuálnej adresy pri každej udalosti', () => {
    mountHook();
    pressBack('/dashboard/search');
    pressBack('/dashboard/profile?x=1');
    expect(mockModuleFromPath.mock.calls).toEqual([['/dashboard/search'], ['/dashboard/profile']]);
  });
});

describe('príspevok v adrese', () => {
  it('na desktope je adresa príspevku Nástenka (okno otvára iný efekt)', () => {
    mountHook({ isMobile: false });

    pressBack('/dashboard/feed/7');

    expect(calls).toEqual(PLAIN('home'));
    expect(localStorage.getItem('activeModule')).toBe('home');
  });

  it('na mobile je adresa príspevku celá stránka príspevku', () => {
    mountHook({ isMobile: true });

    pressBack('/dashboard/feed/7');

    expect(calls).toEqual(PLAIN('feed-post-detail'));
    expect(localStorage.getItem('activeModule')).toBe('feed-post-detail');
  });

  it.each([[true], [false]])('mapovanie ostatných adries nezávisí od mobilu (isMobile: %p)', (isMobile) => {
    mountHook({ isMobile });

    pressBack('/dashboard/search');

    expect(calls).toEqual(PLAIN('search'));
  });

  it('po zmene z desktopu na mobil sa adresa príspevku vyhodnotí inak', () => {
    const mounted = mountHook({ isMobile: false });
    update(mounted, { isMobile: true });
    calls = [];

    pressBack('/dashboard/feed/7');

    expect(calls).toEqual(PLAIN('feed-post-detail'));
  });

  it('adresa príspevku so zlým tvarom modul nenastaví', () => {
    mountHook({ isMobile: false });
    pressBack('/dashboard/feed/abc');
    expect(calls).toEqual([]);
  });
});

describe('cudzí profil a detail portfólia', () => {
  it('cudzí profil podľa slugu: zhrnutie preč, id preč, slug nastavený', () => {
    mountHook();

    pressBack('/dashboard/users/jana');

    expect(calls).toEqual(
      PROFILE('user-profile', entry('setViewedUserId', null), entry('setViewedUserSlug', 'jana')),
    );
  });

  it('cudzí profil podľa čísla: zhrnutie preč, id nastavené, slug preč', () => {
    mountHook();

    pressBack('/dashboard/users/42');

    expect(calls).toEqual(
      PROFILE('user-profile', entry('setViewedUserId', 42), entry('setViewedUserSlug', null)),
    );
  });

  it('detail portfólia sa riadi vlastníkom z adresy (slug)', () => {
    mountHook();

    pressBack('/dashboard/users/jana/portfolio/5');

    expect(calls).toEqual(
      PROFILE('portfolio-detail', entry('setViewedUserId', null), entry('setViewedUserSlug', 'jana')),
    );
  });

  it('detail portfólia sa riadi vlastníkom z adresy (číslo)', () => {
    mountHook();

    pressBack('/dashboard/users/42/portfolio/5');

    expect(calls).toEqual(
      PROFILE('portfolio-detail', entry('setViewedUserId', 42), entry('setViewedUserSlug', null)),
    );
  });

  it('slug sa dekóduje', () => {
    mountHook();

    pressBack('/dashboard/users/an%20na');

    expect(calls).toEqual(
      PROFILE('user-profile', entry('setViewedUserId', null), entry('setViewedUserSlug', 'an na')),
    );
  });

  it.each([
    ['007', entry('setViewedUserId', 7), entry('setViewedUserSlug', null)],
    ['12abc', entry('setViewedUserId', null), entry('setViewedUserSlug', '12abc')],
    ['abc12', entry('setViewedUserId', null), entry('setViewedUserSlug', 'abc12')],
    ['1.5', entry('setViewedUserId', null), entry('setViewedUserSlug', '1.5')],
  ])('identifikátor %s: číslo len keď sú to samé číslice', (identifier, first, second) => {
    mountHook();
    mockModuleFromPath.mockReturnValue('user-profile');
    mockIdentifierFromTarget.mockReturnValue(identifier);

    pressBack('/dashboard/users/x');

    expect(calls).toEqual(PROFILE('user-profile', first, second));
  });

  it.each([[null], ['']])('bez identifikátora (%p) sa zapíše len zhrnutie preč', (identifier) => {
    mountHook();
    mockModuleFromPath.mockReturnValue('user-profile');
    mockIdentifierFromTarget.mockReturnValue(identifier);

    pressBack('/dashboard/users/x');

    expect(calls).toEqual(PROFILE('user-profile'));
  });

  it('identifikátor sa číta z cesty adresy', () => {
    mountHook();

    pressBack('/dashboard/users/jana/portfolio/5?x=1#h');

    expect(mockIdentifierFromTarget).toHaveBeenCalledTimes(1);
    expect(mockIdentifierFromTarget).toHaveBeenCalledWith('/dashboard/users/jana/portfolio/5');
  });

  it('pri iných moduloch sa identifikátor vôbec nečíta', () => {
    mountHook();

    pressBack('/dashboard/search');

    expect(mockIdentifierFromTarget).not.toHaveBeenCalled();
  });

  it('po cudzom profile prechod na iný modul zabudne používateľa', () => {
    mountHook();
    pressBack('/dashboard/users/jana');
    calls = [];

    pressBack('/dashboard/profile');

    expect(calls).toEqual(PLAIN('profile'));
  });
});

describe('panely', () => {
  it.each([['/dashboard/search'], ['/dashboard/users/jana'], ['/dashboard/users/jana/portfolio/5']])(
    'adresa %s zavrie pravý panel, vyčistí pravú položku a zavrie mobilné menu',
    (url) => {
      mountHook();

      pressBack(url);

      expect(calls.slice(-3)).toEqual(CLOSE_PANELS);
    },
  );

  it('adresa, ktorú mapovanie nepozná, panely nezavrie', () => {
    mountHook();
    pressBack('/dashboard/neznama');
    expect(calls).toEqual([]);
  });
});

describe('nedostupné úložisko', () => {
  it('chyba pri zápise modulu nezabráni ostatným krokom', () => {
    mountHook();
    storageFails = true;

    expect(() => pressBack('/dashboard/users/jana')).not.toThrow();

    expect(calls).toEqual(
      PROFILE('user-profile', entry('setViewedUserId', null), entry('setViewedUserSlug', 'jana')),
    );
  });
});

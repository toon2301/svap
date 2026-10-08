/**
 * Navigácia okolo portfólia: šípka späť z detailu položky a tlačidlo „nová položka“.
 *
 * Hook dáva `DashboardContent` dva handlery. Návrat z detailu buď urobí skutočný krok späť
 * v histórii (keď položku otvorila appka), alebo prepne modul a nahradí adresu zoznamom
 * portfólia vlastníka. Nová položka prepne na obrazovku tvorby a pridá jej adresu do histórie.
 * Poradie volaní je súčasť správania, preto sa všetko zapisuje do jedného záznamu `calls`.
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { usePortfolioNavigation } from '../usePortfolioNavigation';

const mockReturnToPortfolioDetailOrigin = jest.fn();
jest.mock('../../modules/profile/portfolioRouting', () => ({
  ...jest.requireActual('../../modules/profile/portfolioRouting'),
  returnToPortfolioDetailOrigin: (...args: unknown[]) =>
    mockReturnToPortfolioDetailOrigin(...args),
}));

/** Všetko, čo hook zavolá alebo zapíše, sa ukladá sem v poradí volaní. */
let calls: string[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

type HookInput = Parameters<typeof usePortfolioNavigation>[0];
type HookOutput = ReturnType<typeof usePortfolioNavigation>;
type Mounted = RenderHookResult<HookOutput, HookInput>;

const spy = (name: string, impl?: (...args: unknown[]) => unknown) =>
  jest.fn((...args: unknown[]) => {
    record(name, ...args);
    return impl?.(...args);
  });

type UserInput = HookInput['user'];

let base: HookInput;

const makeBase = (): HookInput => ({
  router: { replace: spy('router.replace') },
  user: { id: 7, slug: 'anna' } as UserInput,
  effectivePortfolioOwnerIdentifier: 'jana',
  setActiveModule: spy('setActiveModule'),
  setActiveRightItem: spy('setActiveRightItem'),
  setIsMobileMenuOpen: spy('setIsMobileMenuOpen'),
  setIsNotificationsPanelOpen: spy('setIsNotificationsPanelOpen'),
  setIsRightSidebarOpen: spy('setIsRightSidebarOpen'),
  setIsSearchOpen: spy('setIsSearchOpen'),
  setOwnProfileTab: spy('setOwnProfileTab'),
  setViewedUserId: spy('setViewedUserId'),
  setViewedUserSlug: spy('setViewedUserSlug'),
  setViewedUserSummary: spy('setViewedUserSummary'),
});

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const makeInput = (overrides: Partial<HookInput> = {}): HookInput => ({ ...base, ...overrides });

const mountHook = (overrides: Partial<HookInput> = {}): Mounted =>
  renderHook((props: HookInput) => usePortfolioNavigation(props), {
    initialProps: makeInput(overrides),
  });

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

type HandlerName = keyof HookOutput;

const fire = (mounted: Mounted, name: HandlerName) =>
  act(() => {
    mounted.result.current[name]();
  });

const userOf = (user: { id?: number; slug?: string | null } | null): UserInput =>
  user as unknown as UserInput;

const realSetItem = Storage.prototype.setItem;

/** Zapisuje do `calls` každý zápis do localStorage; pri `failing` po zápise zlyhá. */
const installStorageSpy = (failing = false) => {
  jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function (this: Storage, key: string, value: string) {
      record('localStorage.setItem', key, value);
      if (failing) throw new Error('quota');
      realSetItem.call(this, key, value);
    });
};

const INPUT_KEYS = Object.keys(makeBase()) as Array<keyof HookInput>;

/** Mení hook jeden vstup na novú hodnotu. */
const changedValue = (key: keyof HookInput): Partial<HookInput> => {
  if (key === 'router') return { router: { replace: spy('nový router.replace') } };
  if (key === 'user') return { user: userOf({ id: 8, slug: 'iny' }) };
  if (key === 'effectivePortfolioOwnerIdentifier') return { effectivePortfolioOwnerIdentifier: 'peter' };
  return { [key]: spy('nová') } as Partial<HookInput>;
};

/** Povie, či sa handler pri zmene vstupu `key` vytvoril nanovo. */
const handlerChangesWith = (name: HandlerName, key: keyof HookInput): boolean => {
  const mounted = mountHook();
  const before = mounted.result.current[name];
  update(mounted, changedValue(key));
  return mounted.result.current[name] !== before;
};

/** Vstupy, od ktorých handler skutočne závisí (pole závislostí `useCallback`). */
const DEPENDENCIES: Record<HandlerName, Array<keyof HookInput>> = {
  handlePortfolioDetailBack: [
    'effectivePortfolioOwnerIdentifier',
    'router',
    'setActiveModule',
    'setActiveRightItem',
    'setIsMobileMenuOpen',
    'setIsNotificationsPanelOpen',
    'setIsRightSidebarOpen',
    'setIsSearchOpen',
    'setOwnProfileTab',
    'setViewedUserId',
    'setViewedUserSlug',
    'setViewedUserSummary',
  ],
  handleCreatePortfolio: ['user', 'setActiveModule', 'setOwnProfileTab'],
};

/** Kroky, ktoré návrat z detailu urobí vždy, hneď po zistení cieľa. */
const CLOSE_PANELS = [
  entry('setIsRightSidebarOpen', false),
  entry('setActiveRightItem', ''),
  entry('setIsMobileMenuOpen', false),
  entry('setIsSearchOpen', false),
  entry('setIsNotificationsPanelOpen', false),
  entry('setViewedUserSummary', null),
];

beforeEach(() => {
  calls = [];
  base = makeBase();
  localStorage.clear();
  mockReturnToPortfolioDetailOrigin.mockReset();
  mockReturnToPortfolioDetailOrigin.mockReturnValue(false);
  installStorageSpy();
  jest.spyOn(window.history, 'pushState').mockImplementation((...args: unknown[]) => {
    record('history.pushState', ...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('východiskový stav', () => {
  it('vráti dva handlery v tomto poradí', () => {
    const mounted = mountHook();
    expect(Object.keys(mounted.result.current)).toEqual([
      'handlePortfolioDetailBack',
      'handleCreatePortfolio',
    ]);
    expect(typeof mounted.result.current.handlePortfolioDetailBack).toBe('function');
    expect(typeof mounted.result.current.handleCreatePortfolio).toBe('function');
  });

  it('pri vytvorení nič nezavolá ani nezapíše', () => {
    mountHook();
    expect(calls).toEqual([]);
    expect(mockReturnToPortfolioDetailOrigin).not.toHaveBeenCalled();
  });
});

describe('krok späť z detailu portfólia (handlePortfolioDetailBack)', () => {
  describe('keď appka pozná pôvod detailu', () => {
    it('spraví skutočný krok späť (cez pomocnú funkciu) a nič iné', () => {
      mockReturnToPortfolioDetailOrigin.mockReturnValue(true);
      const mounted = mountHook();

      fire(mounted, 'handlePortfolioDetailBack');

      expect(mockReturnToPortfolioDetailOrigin).toHaveBeenCalledTimes(1);
      expect(calls).toEqual([]);
    });
  });

  describe('keď pôvod nie je známy (odkaz, F5)', () => {
    it('cudzí profil so slugom: modul, zobrazený používateľ, úložisko a replace na zoznam', () => {
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: 'jana' });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(mockReturnToPortfolioDetailOrigin).toHaveBeenCalledTimes(1);
      expect(calls).toEqual([
        entry('setActiveModule', 'user-profile'),
        ...CLOSE_PANELS,
        entry('setViewedUserId', null),
        entry('setViewedUserSlug', 'jana'),
        entry('localStorage.setItem', 'activeModule', 'user-profile'),
        entry('router.replace', '/dashboard/users/jana/portfolio'),
      ]);
    });

    it('cudzí profil s číselným identifikátorom sa otvorí podľa ID', () => {
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: '55' });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(calls).toEqual([
        entry('setActiveModule', 'user-profile'),
        ...CLOSE_PANELS,
        entry('setViewedUserId', 55),
        entry('setViewedUserSlug', null),
        entry('localStorage.setItem', 'activeModule', 'user-profile'),
        entry('router.replace', '/dashboard/users/55/portfolio'),
      ]);
    });

    it('číselný identifikátor s úvodnými nulami sa berie ako číslo', () => {
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: '007' });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(calls).toContain(entry('setViewedUserId', 7));
      expect(calls).toContain(entry('setViewedUserSlug', null));
    });

    it.each(['12abc', 'a12', '1 2', '-5', '1.5', '٣'])(
      'identifikátor %p nie je číslo: berie sa ako slug',
      (identifier) => {
        const mounted = mountHook({ effectivePortfolioOwnerIdentifier: identifier });

        fire(mounted, 'handlePortfolioDetailBack');

        expect(calls).toContain(entry('setViewedUserId', null));
        expect(calls).toContain(entry('setViewedUserSlug', identifier));
      },
    );

    it('slug so špeciálnymi znakmi sa v adrese zakóduje, v stave ostáva nezakódovaný', () => {
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: 'ján nováč/x' });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(calls).toContain(entry('setViewedUserSlug', 'ján nováč/x'));
      expect(calls).toContain(
        entry('router.replace', '/dashboard/users/j%C3%A1n%20nov%C3%A1%C4%8D%2Fx/portfolio'),
      );
    });

    it('identifikátor sa pred použitím oreže', () => {
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: '  jana  ' });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(calls).toContain(entry('setViewedUserSlug', 'jana'));
      expect(calls).toContain(entry('router.replace', '/dashboard/users/jana/portfolio'));
    });

    it.each([
      ['null', null],
      ['prázdny text', ''],
      ['samé medzery', '   '],
    ] as Array<[string, string | null]>)(
      'vlastník %s: návrat na vlastný profil, záložka Portfólio',
      (_title, identifier) => {
        const mounted = mountHook({ effectivePortfolioOwnerIdentifier: identifier });

        fire(mounted, 'handlePortfolioDetailBack');

        expect(calls).toEqual([
          entry('setActiveModule', 'profile'),
          ...CLOSE_PANELS,
          entry('setViewedUserId', null),
          entry('setViewedUserSlug', null),
          entry('setOwnProfileTab', 'portfolio'),
          entry('localStorage.setItem', 'activeModule', 'profile'),
          entry('router.replace', '/dashboard/profile'),
        ]);
      },
    );

    it('záložka vlastného profilu sa nastavuje len pri návrate na vlastný profil', () => {
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: 'jana' });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(calls.some((c) => c.startsWith('setOwnProfileTab('))).toBe(false);
    });

    it('zapíše modul aj do skutočného localStorage', () => {
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: 'jana' });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(localStorage.getItem('activeModule')).toBe('user-profile');
    });

    it('chyba úložiska návrat nezruší: replace sa vykoná', () => {
      installStorageSpy(true);
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: 'jana' });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(calls.slice(-2)).toEqual([
        entry('localStorage.setItem', 'activeModule', 'user-profile'),
        entry('router.replace', '/dashboard/users/jana/portfolio'),
      ]);
    });

    it('používa najnovšie vstupy (router aj vlastníka)', () => {
      const mounted = mountHook({ effectivePortfolioOwnerIdentifier: 'jana' });
      update(mounted, {
        effectivePortfolioOwnerIdentifier: 'peter',
        router: { replace: spy('nový router.replace') },
      });

      fire(mounted, 'handlePortfolioDetailBack');

      expect(calls).toContain(entry('nový router.replace', '/dashboard/users/peter/portfolio'));
      expect(calls).not.toContain(entry('router.replace', '/dashboard/users/jana/portfolio'));
    });
  });
});

describe('nová položka portfólia (handleCreatePortfolio)', () => {
  it('prepne na tvorbu, záložku Portfólio a pridá záznam s adresou podľa slugu', () => {
    const mounted = mountHook({ user: userOf({ id: 7, slug: 'anna' }) });

    fire(mounted, 'handleCreatePortfolio');

    expect(calls).toEqual([
      entry('setOwnProfileTab', 'portfolio'),
      entry('setActiveModule', 'portfolio-create'),
      entry('localStorage.setItem', 'activeModule', 'portfolio-create'),
      entry('history.pushState', null, '', '/dashboard/users/anna/portfolio/create'),
    ]);
  });

  it('používateľ bez slugu sa v adrese identifikuje číselným ID', () => {
    const mounted = mountHook({ user: userOf({ id: 42, slug: '' }) });

    fire(mounted, 'handleCreatePortfolio');

    expect(calls[3]).toBe(entry('history.pushState', null, '', '/dashboard/users/42/portfolio/create'));
  });

  it.each([null, undefined])('slug %p sa berie ako chýbajúci', (slug) => {
    const mounted = mountHook({ user: userOf({ id: 9, slug }) });

    fire(mounted, 'handleCreatePortfolio');

    expect(calls[3]).toBe(entry('history.pushState', null, '', '/dashboard/users/9/portfolio/create'));
  });

  it('slug so špeciálnymi znakmi sa v adrese zakóduje', () => {
    const mounted = mountHook({ user: userOf({ id: 7, slug: 'ján nováč' }) });

    fire(mounted, 'handleCreatePortfolio');

    expect(calls[3]).toBe(
      entry('history.pushState', null, '', '/dashboard/users/j%C3%A1n%20nov%C3%A1%C4%8D/portfolio/create'),
    );
  });

  it.each([
    ['slug aj ID chýbajú', { id: undefined, slug: '' }],
    ['ID je 0 a slug chýba', { id: 0, slug: '' }],
    ['používateľ nie je k dispozícii', null],
  ] as Array<[string, { id?: number; slug?: string | null } | null]>)(
    '%s: modul sa prepne, ale adresa ostane',
    (_title, user) => {
      const mounted = mountHook({ user: userOf(user) });

      fire(mounted, 'handleCreatePortfolio');

      expect(calls).toEqual([
        entry('setOwnProfileTab', 'portfolio'),
        entry('setActiveModule', 'portfolio-create'),
        entry('localStorage.setItem', 'activeModule', 'portfolio-create'),
      ]);
    },
  );

  it('slug má prednosť pred ID', () => {
    const mounted = mountHook({ user: userOf({ id: 1, slug: 'anna' }) });

    fire(mounted, 'handleCreatePortfolio');

    expect(calls[3]).toContain('/dashboard/users/anna/portfolio/create');
    expect(calls[3]).not.toContain('/dashboard/users/1/');
  });

  it('chyba úložiska tvorbu nezruší: adresa sa zapíše', () => {
    installStorageSpy(true);
    const mounted = mountHook({ user: userOf({ id: 7, slug: 'anna' }) });

    fire(mounted, 'handleCreatePortfolio');

    expect(calls.slice(-2)).toEqual([
      entry('localStorage.setItem', 'activeModule', 'portfolio-create'),
      entry('history.pushState', null, '', '/dashboard/users/anna/portfolio/create'),
    ]);
  });

  it('nevolá router a nehľadá pôvod detailu', () => {
    const mounted = mountHook();

    fire(mounted, 'handleCreatePortfolio');

    expect(base.router.replace).not.toHaveBeenCalled();
    expect(mockReturnToPortfolioDetailOrigin).not.toHaveBeenCalled();
  });

  it('používa najnovšieho používateľa', () => {
    const mounted = mountHook({ user: userOf({ id: 7, slug: 'anna' }) });
    update(mounted, { user: userOf({ id: 8, slug: 'eva' }) });

    fire(mounted, 'handleCreatePortfolio');

    expect(calls[3]).toBe(entry('history.pushState', null, '', '/dashboard/users/eva/portfolio/create'));
  });
});

describe('stabilita handlerov medzi renderami', () => {
  it('nezmenené vstupy nechajú oba handlery rovnaké', () => {
    const mounted = mountHook();
    const before = { ...mounted.result.current };

    update(mounted, {});

    expect(mounted.result.current.handlePortfolioDetailBack).toBe(before.handlePortfolioDetailBack);
    expect(mounted.result.current.handleCreatePortfolio).toBe(before.handleCreatePortfolio);
  });

  describe.each(Object.entries(DEPENDENCIES))('%s', (name, dependencies) => {
    const independent = INPUT_KEYS.filter((key) => !dependencies.includes(key));

    it.each(dependencies)('zmena vstupu %s vytvorí nový handler', (key) => {
      expect(handlerChangesWith(name as HandlerName, key)).toBe(true);
    });

    it.each(independent)('zmena vstupu %s handler nezmení', (key) => {
      expect(handlerChangesWith(name as HandlerName, key)).toBe(false);
    });
  });
});

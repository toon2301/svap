/**
 * Obsluhy sprievodcov (mobilného aj desktopového): otvorenie obrazoviek, ktoré sprievodca
 * ukazuje, a registrácia obsluhy „prvá ponuka je vytvorená“.
 *
 * Hook dáva `DashboardContent` jedenásť obsluh pre `DesktopOnboardingProvider` a
 * `MobileOnboardingProvider` a pre ukladací hook karty. Obsluhy krokov (domov, hľadanie,
 * žiadosti, správy) sú tenké obálky nad `handleMainModuleChange`; vlastný profil na desktope
 * a oznam o vytvorenej ponuke majú vlastnú logiku. Poradie volaní je súčasť správania, preto
 * sa všetko zapisuje do jedného záznamu `calls`.
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { dashboardSectionPath } from '../../components/dashboardRoutes';
import { useOnboardingHandlers } from '../useOnboardingHandlers';

/** Všetko, čo hook zavolá alebo zapíše, sa ukladá sem v poradí volaní. */
let calls: string[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

type HookInput = Parameters<typeof useOnboardingHandlers>[0];
type HookOutput = ReturnType<typeof useOnboardingHandlers>;
type Mounted = RenderHookResult<HookOutput, HookInput>;

const spy = (name: string, impl?: (...args: unknown[]) => unknown) =>
  jest.fn((...args: unknown[]) => {
    record(name, ...args);
    return impl?.(...args);
  });

let base: HookInput;

const makeBase = (): HookInput => ({
  activeModule: 'home',
  handleMainModuleChange: spy('handleMainModuleChange'),
  highlighting: { setHighlightedSkillId: spy('setHighlightedSkillId') },
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
  renderHook((props: HookInput) => useOnboardingHandlers(props), {
    initialProps: makeInput(overrides),
  });

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

type HandlerName = Exclude<
  keyof HookOutput,
  'handleMobileOnboardingSkillCreatedHandlerSet' | 'handleDesktopOnboardingSkillCreatedHandlerSet'
>;

/** Zavolá bezparametrový handler hooku. */
const fire = (mounted: Mounted, name: HandlerName) =>
  act(() => {
    mounted.result.current[name]();
  });

const OWN_PROFILE_PATH = dashboardSectionPath('profile') as string;

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

/** Mení hook jeden vstup na novú hodnotu (nová funkcia / nový objekt / iný text). */
const changedValue = (key: keyof HookInput): Partial<HookInput> => {
  if (key === 'activeModule') return { activeModule: 'search' };
  if (key === 'highlighting') return { highlighting: { setHighlightedSkillId: spy('nový highlight') } };
  return { [key]: spy('nová') } as Partial<HookInput>;
};

/** Povie, či sa handler pri zmene vstupu `key` vytvoril nanovo. */
const handlerChangesWith = (name: keyof HookOutput, key: keyof HookInput): boolean => {
  const mounted = mountHook();
  const before = mounted.result.current[name];
  update(mounted, changedValue(key));
  return mounted.result.current[name] !== before;
};

/** Vstupy, od ktorých handler skutočne závisí (pole závislostí `useCallback`). */
const DEPENDENCIES: Record<string, Array<keyof HookInput>> = {
  handleOnboardingSearchOpen: ['handleMainModuleChange'],
  handleDesktopOnboardingSearchOpen: [
    'activeModule',
    'handleMainModuleChange',
    'setIsNotificationsPanelOpen',
    'setIsSearchOpen',
  ],
  handleDesktopOnboardingSearchClose: ['setIsSearchOpen'],
  handleOnboardingRequestsOpen: ['handleMainModuleChange'],
  handleDesktopOnboardingRequestsOpen: ['handleMainModuleChange', 'setIsSearchOpen'],
  handleOnboardingMessagesOpen: ['handleMainModuleChange'],
  handleOnboardingHomeOpen: ['handleMainModuleChange'],
  handleDesktopOnboardingProfileOpen: [
    'highlighting',
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
  handleOnboardingSkillCreated: [],
  handleMobileOnboardingSkillCreatedHandlerSet: [],
  handleDesktopOnboardingSkillCreatedHandlerSet: [],
};

beforeEach(() => {
  calls = [];
  base = makeBase();
  localStorage.clear();
  installStorageSpy();
  jest.spyOn(window.history, 'pushState').mockImplementation((...args: unknown[]) => {
    record('history.pushState', ...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('východiskový stav', () => {
  it('vráti jedenásť obsluh v tomto poradí', () => {
    const mounted = mountHook();
    expect(Object.keys(mounted.result.current)).toEqual([
      'handleOnboardingSearchOpen',
      'handleDesktopOnboardingSearchOpen',
      'handleDesktopOnboardingSearchClose',
      'handleOnboardingRequestsOpen',
      'handleDesktopOnboardingRequestsOpen',
      'handleOnboardingMessagesOpen',
      'handleOnboardingHomeOpen',
      'handleDesktopOnboardingProfileOpen',
      'handleOnboardingSkillCreated',
      'handleMobileOnboardingSkillCreatedHandlerSet',
      'handleDesktopOnboardingSkillCreatedHandlerSet',
    ]);
    Object.values(mounted.result.current).forEach((handler) => {
      expect(typeof handler).toBe('function');
    });
  });

  it('pri vytvorení nič nezavolá ani nezapíše', () => {
    mountHook();
    expect(calls).toEqual([]);
  });
});

describe('obsluhy krokov, ktoré len prepnú modul', () => {
  it.each([
    ['handleOnboardingSearchOpen', 'search'],
    ['handleOnboardingRequestsOpen', 'requests'],
    ['handleOnboardingMessagesOpen', 'messages'],
    ['handleOnboardingHomeOpen', 'home'],
  ] as Array<[HandlerName, string]>)('%s prepne modul na %s a nič iné nespraví', (name, moduleId) => {
    const mounted = mountHook();

    fire(mounted, name);

    expect(calls).toEqual([entry('handleMainModuleChange', moduleId)]);
  });

  it('používajú najnovší handleMainModuleChange', () => {
    const mounted = mountHook();
    const newer = spy('novší handleMainModuleChange');
    update(mounted, { handleMainModuleChange: newer });

    fire(mounted, 'handleOnboardingHomeOpen');
    fire(mounted, 'handleOnboardingRequestsOpen');

    expect(calls).toEqual([
      entry('novší handleMainModuleChange', 'home'),
      entry('novší handleMainModuleChange', 'requests'),
    ]);
  });
});

describe('desktopové hľadanie', () => {
  it('otvorenie zavrie panel upozornení a otvorí panel hľadania (modul ostáva)', () => {
    const mounted = mountHook({ activeModule: 'home' });

    fire(mounted, 'handleDesktopOnboardingSearchOpen');

    expect(calls).toEqual([
      entry('setIsNotificationsPanelOpen', false),
      entry('setIsSearchOpen', true),
    ]);
  });

  it('z celoobrazovkového hľadania najprv vráti Nástenku a potom otvorí panel', () => {
    const mounted = mountHook({ activeModule: 'search' });

    fire(mounted, 'handleDesktopOnboardingSearchOpen');

    expect(calls).toEqual([
      entry('setIsNotificationsPanelOpen', false),
      entry('handleMainModuleChange', 'home'),
      entry('setIsSearchOpen', true),
    ]);
  });

  it.each(['home', 'profile', 'requests', 'search-results', 'Search', 'searchX'])(
    'v module %p sa Nástenka nevracia',
    (activeModule) => {
      const mounted = mountHook({ activeModule });

      fire(mounted, 'handleDesktopOnboardingSearchOpen');

      expect(calls).toEqual([
        entry('setIsNotificationsPanelOpen', false),
        entry('setIsSearchOpen', true),
      ]);
    },
  );

  it('používa aktuálny modul po zmene vstupu', () => {
    const mounted = mountHook({ activeModule: 'home' });
    update(mounted, { activeModule: 'search' });

    fire(mounted, 'handleDesktopOnboardingSearchOpen');

    expect(calls).toContain(entry('handleMainModuleChange', 'home'));
  });

  it('zatvorenie zavrie panel hľadania a nič iné nespraví', () => {
    const mounted = mountHook({ activeModule: 'search' });

    fire(mounted, 'handleDesktopOnboardingSearchClose');

    expect(calls).toEqual([entry('setIsSearchOpen', false)]);
  });

  it('otvorenie žiadostí zavrie panel hľadania a až potom prepne modul', () => {
    const mounted = mountHook();

    fire(mounted, 'handleDesktopOnboardingRequestsOpen');

    expect(calls).toEqual([
      entry('setIsSearchOpen', false),
      entry('handleMainModuleChange', 'requests'),
    ]);
  });
});

describe('desktopový sprievodca otvára vlastný profil (handleDesktopOnboardingProfileOpen)', () => {
  it('urobí všetky kroky v tomto poradí a pridá adresu profilu do histórie', () => {
    const mounted = mountHook();

    fire(mounted, 'handleDesktopOnboardingProfileOpen');

    expect(calls).toEqual([
      entry('setOwnProfileTab', 'offers'),
      entry('setActiveModule', 'profile'),
      entry('setIsRightSidebarOpen', false),
      entry('setActiveRightItem', ''),
      entry('setIsMobileMenuOpen', false),
      entry('setIsSearchOpen', false),
      entry('setIsNotificationsPanelOpen', false),
      entry('setViewedUserId', null),
      entry('setViewedUserSlug', null),
      entry('setViewedUserSummary', null),
      entry('setHighlightedSkillId', null),
      entry('localStorage.setItem', 'activeModule', 'profile'),
      entry('history.pushState', null, '', OWN_PROFILE_PATH),
    ]);
  });

  it('adresa vlastného profilu je /dashboard/profile', () => {
    expect(OWN_PROFILE_PATH).toBe('/dashboard/profile');
  });

  it('zapíše modul aj do skutočného localStorage', () => {
    const mounted = mountHook();

    fire(mounted, 'handleDesktopOnboardingProfileOpen');

    expect(localStorage.getItem('activeModule')).toBe('profile');
  });

  it('chyba úložiska nezabráni zápisu adresy do histórie', () => {
    installStorageSpy(true);
    const mounted = mountHook();

    fire(mounted, 'handleDesktopOnboardingProfileOpen');

    expect(calls.slice(-2)).toEqual([
      entry('localStorage.setItem', 'activeModule', 'profile'),
      entry('history.pushState', null, '', OWN_PROFILE_PATH),
    ]);
    expect(calls).toHaveLength(13);
  });

  it('používa najnovšie vstupy', () => {
    const mounted = mountHook();
    const newerModule = spy('nový setActiveModule');
    const newerHighlight = spy('nový setHighlightedSkillId');
    update(mounted, {
      setActiveModule: newerModule,
      highlighting: { setHighlightedSkillId: newerHighlight },
    });

    fire(mounted, 'handleDesktopOnboardingProfileOpen');

    expect(calls).toContain(entry('nový setActiveModule', 'profile'));
    expect(calls).toContain(entry('nový setHighlightedSkillId', null));
    expect(calls).not.toContain(entry('setActiveModule', 'profile'));
    expect(calls).not.toContain(entry('setHighlightedSkillId', null));
  });
});

describe('oznam „prvá ponuka je vytvorená“', () => {
  const registerBoth = (mounted: Mounted) => {
    const mobile = spy('mobilný oznam');
    const desktop = spy('desktopový oznam');
    act(() => {
      mounted.result.current.handleMobileOnboardingSkillCreatedHandlerSet(mobile);
      mounted.result.current.handleDesktopOnboardingSkillCreatedHandlerSet(desktop);
    });
    return { mobile, desktop };
  };

  it('bez zaregistrovaných obsluh nič nespadne ani nezavolá', () => {
    const mounted = mountHook();

    expect(() => fire(mounted, 'handleOnboardingSkillCreated')).not.toThrow();

    expect(calls).toEqual([]);
  });

  it('zavolá mobilnú a potom desktopovú obsluhu, každú presne raz', () => {
    const mounted = mountHook();
    const { mobile, desktop } = registerBoth(mounted);
    calls = [];

    fire(mounted, 'handleOnboardingSkillCreated');

    expect(calls).toEqual([entry('mobilný oznam'), entry('desktopový oznam')]);
    expect(mobile).toHaveBeenCalledTimes(1);
    expect(desktop).toHaveBeenCalledTimes(1);
  });

  it('zavolá obsluhu bez argumentov', () => {
    const mounted = mountHook();
    const { mobile, desktop } = registerBoth(mounted);

    fire(mounted, 'handleOnboardingSkillCreated');

    expect(mobile).toHaveBeenCalledWith();
    expect(desktop).toHaveBeenCalledWith();
  });

  it('zaregistrovanie obsluhy nič nespustí', () => {
    const mounted = mountHook();

    const { mobile, desktop } = registerBoth(mounted);

    expect(mobile).not.toHaveBeenCalled();
    expect(desktop).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('s jedinou zaregistrovanou obsluhou zavolá len ju (mobilná)', () => {
    const mounted = mountHook();
    const mobile = spy('mobilný oznam');
    act(() => mounted.result.current.handleMobileOnboardingSkillCreatedHandlerSet(mobile));

    fire(mounted, 'handleOnboardingSkillCreated');

    expect(calls).toEqual([entry('mobilný oznam')]);
  });

  it('s jedinou zaregistrovanou obsluhou zavolá len ju (desktopová)', () => {
    const mounted = mountHook();
    const desktop = spy('desktopový oznam');
    act(() => mounted.result.current.handleDesktopOnboardingSkillCreatedHandlerSet(desktop));

    fire(mounted, 'handleOnboardingSkillCreated');

    expect(calls).toEqual([entry('desktopový oznam')]);
  });

  it('odregistrovaná obsluha (null) sa už nevolá, druhá ostáva', () => {
    const mounted = mountHook();
    const { desktop } = registerBoth(mounted);
    act(() => mounted.result.current.handleMobileOnboardingSkillCreatedHandlerSet(null));
    calls = [];

    fire(mounted, 'handleOnboardingSkillCreated');

    expect(calls).toEqual([entry('desktopový oznam')]);
    expect(desktop).toHaveBeenCalledTimes(1);
  });

  it('odregistrovanie desktopovej obsluhy nechá mobilnú', () => {
    const mounted = mountHook();
    registerBoth(mounted);
    act(() => mounted.result.current.handleDesktopOnboardingSkillCreatedHandlerSet(null));
    calls = [];

    fire(mounted, 'handleOnboardingSkillCreated');

    expect(calls).toEqual([entry('mobilný oznam')]);
  });

  it('nová obsluha nahradí predošlú', () => {
    const mounted = mountHook();
    const { mobile } = registerBoth(mounted);
    const replacement = spy('náhrada');
    act(() => mounted.result.current.handleMobileOnboardingSkillCreatedHandlerSet(replacement));
    calls = [];

    fire(mounted, 'handleOnboardingSkillCreated');

    expect(calls).toEqual([entry('náhrada'), entry('desktopový oznam')]);
    expect(mobile).not.toHaveBeenCalled();
  });

  it('zaregistrované obsluhy prežijú nové renderovanie a zmenu vstupov', () => {
    const mounted = mountHook();
    registerBoth(mounted);
    update(mounted, { activeModule: 'search', handleMainModuleChange: spy('nový') });
    calls = [];

    fire(mounted, 'handleOnboardingSkillCreated');

    expect(calls).toEqual([entry('mobilný oznam'), entry('desktopový oznam')]);
  });

  it('dva samostatné hooky si obsluhy nezdieľajú', () => {
    const first = mountHook();
    const second = mountHook();
    const mobile = spy('prvý mobilný oznam');
    act(() => first.result.current.handleMobileOnboardingSkillCreatedHandlerSet(mobile));

    fire(second, 'handleOnboardingSkillCreated');

    expect(mobile).not.toHaveBeenCalled();
  });
});

describe('stabilita obsluh medzi renderami', () => {
  it('nezmenené vstupy nechajú všetky obsluhy rovnaké', () => {
    const mounted = mountHook();
    const before = { ...mounted.result.current };

    update(mounted, {});

    (Object.keys(before) as Array<keyof HookOutput>).forEach((name) => {
      expect(mounted.result.current[name]).toBe(before[name]);
    });
  });

  it('tabuľka závislostí pokrýva všetkých jedenásť obsluh', () => {
    const mounted = mountHook();
    expect(Object.keys(DEPENDENCIES).sort()).toEqual(Object.keys(mounted.result.current).sort());
  });

  it('nová obsluha oznamu sa registruje bez ohľadu na zmenu obsluh', () => {
    const mounted = mountHook();
    const first = mounted.result.current.handleMobileOnboardingSkillCreatedHandlerSet;
    update(mounted, { activeModule: 'search', setIsSearchOpen: spy('nový') });
    expect(mounted.result.current.handleMobileOnboardingSkillCreatedHandlerSet).toBe(first);
  });

  describe.each(Object.entries(DEPENDENCIES))('%s', (name, dependencies) => {
    const independent = INPUT_KEYS.filter((key) => !dependencies.includes(key));

    if (dependencies.length > 0) {
      it.each(dependencies)('zmena vstupu %s vytvorí nový handler', (key) => {
        expect(handlerChangesWith(name as keyof HookOutput, key)).toBe(true);
      });
    }

    it.each(independent)('zmena vstupu %s handler nezmení', (key) => {
      expect(handlerChangesWith(name as keyof HookOutput, key)).toBe(false);
    });
  });

  it('nový objekt highlighting s tou istou funkciou tiež vytvorí nový profilový handler (v závislostiach je celý objekt)', () => {
    const mounted = mountHook();
    const before = mounted.result.current.handleDesktopOnboardingProfileOpen;

    update(mounted, { highlighting: { setHighlightedSkillId: base.highlighting.setHighlightedSkillId } });

    expect(mounted.result.current.handleDesktopOnboardingProfileOpen).not.toBe(before);
  });
});

/**
 * Mobilné Nastavenia: zoznam Nastavení (otvorenie hamburgerom, zatvorenie krížikom) a
 * podobrazovka nastavení účtu (prehľad / overenie e-mailu / zmazanie účtu).
 *
 * Hook drží stav podobrazovky `mobileAccountSettingsView`, vracia ho na prehľad, keď sa
 * odíde z nastavení účtu, a dáva `DashboardContent` tri handlery: šípku v nastaveniach účtu,
 * otvorenie a zatvorenie zoznamu. Poradie volaní je súčasť správania, preto sa všetko
 * zapisuje do jedného záznamu `calls`.
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { DASHBOARD_HOME_PATH } from '../../components/dashboardRoutes';
import { useMobileSettings } from '../useMobileSettings';

const mockStepBackFromMobileSettings = jest.fn();
jest.mock('../mobileSettingsOrigin', () => ({
  stepBackFromMobileSettings: (...args: unknown[]) => mockStepBackFromMobileSettings(...args),
}));

/** Všetko, čo hook zavolá alebo zapíše, sa ukladá sem v poradí volaní. */
let calls: string[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

type HookInput = Parameters<typeof useMobileSettings>[0];
type Mounted = RenderHookResult<ReturnType<typeof useMobileSettings>, HookInput>;

const spy = (name: string, impl?: (...args: unknown[]) => unknown) =>
  jest.fn((...args: unknown[]) => {
    record(name, ...args);
    return impl?.(...args);
  });

let base: HookInput;

const makeBase = (): HookInput => ({
  activeModule: 'home',
  activeRightItem: '',
  handleMobileBack: spy('handleMobileBack'),
  handleMainModuleChange: spy('handleMainModuleChange'),
  setActiveModule: spy('setActiveModule'),
});

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const makeInput = (overrides: Partial<HookInput> = {}): HookInput => ({ ...base, ...overrides });

const mountHook = (overrides: Partial<HookInput> = {}): Mounted =>
  renderHook((props: HookInput) => useMobileSettings(props), {
    initialProps: makeInput(overrides),
  });

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

const view = (mounted: Mounted) => mounted.result.current.mobileAccountSettingsView;

const setView = (mounted: Mounted, next: 'overview' | 'verify-email' | 'delete-account') =>
  act(() => {
    mounted.result.current.setMobileAccountSettingsView(next);
  });

/** Adresa, na ktorej appka „stojí“: číta ju otvorenie aj zatvorenie zoznamu. */
const standAt = (path: string) => window.history.replaceState(null, '', path);

type Handler =
  | 'handleAccountSettingsMobileBack'
  | 'handleMobileSettingsOpen'
  | 'handleMobileSettingsClose';

/** Zmení hook jeden vstup a povie, či sa handler pritom vytvoril nanovo. */
const handlerChangesWith = (name: Handler, overrides: Partial<HookInput>): boolean => {
  const mounted = mountHook();
  const before = mounted.result.current[name];
  update(mounted, overrides);
  return mounted.result.current[name] !== before;
};

const NEW_FN = () => spy('nová');

beforeEach(() => {
  calls = [];
  base = makeBase();
  mockStepBackFromMobileSettings.mockReset();
  standAt('/dashboard');
  jest.spyOn(window.history, 'pushState').mockImplementation((...args: unknown[]) => {
    record('history.pushState', ...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('východiskový stav', () => {
  it('vráti päť hodnôt v tomto poradí', () => {
    const mounted = mountHook();
    expect(Object.keys(mounted.result.current)).toEqual([
      'mobileAccountSettingsView',
      'setMobileAccountSettingsView',
      'handleAccountSettingsMobileBack',
      'handleMobileSettingsOpen',
      'handleMobileSettingsClose',
    ]);
  });

  it('podobrazovka nastavení účtu začína prehľadom', () => {
    expect(view(mountHook())).toBe('overview');
  });

  it('pri vytvorení nič nezavolá ani nezapíše', () => {
    mountHook();
    expect(calls).toEqual([]);
    expect(mockStepBackFromMobileSettings).not.toHaveBeenCalled();
  });

  it('handlery sú funkcie', () => {
    const mounted = mountHook();
    expect(typeof mounted.result.current.setMobileAccountSettingsView).toBe('function');
    expect(typeof mounted.result.current.handleAccountSettingsMobileBack).toBe('function');
    expect(typeof mounted.result.current.handleMobileSettingsOpen).toBe('function');
    expect(typeof mounted.result.current.handleMobileSettingsClose).toBe('function');
  });
});

describe('podobrazovka nastavení účtu', () => {
  it.each(['verify-email', 'delete-account', 'overview'] as const)(
    'setter prepne podobrazovku na %s',
    (next) => {
      const mounted = mountHook({ activeModule: 'account-settings' });
      setView(mounted, 'delete-account');
      setView(mounted, next);
      expect(view(mounted)).toBe(next);
    },
  );

  it('setter je stabilný medzi renderami', () => {
    const mounted = mountHook();
    const before = mounted.result.current.setMobileAccountSettingsView;
    update(mounted, { activeModule: 'search' });
    expect(mounted.result.current.setMobileAccountSettingsView).toBe(before);
  });

  it.each([
    // [modul, pravá položka, podobrazovka sa zahodí?]
    ['account-settings', '', false],
    ['account-settings', 'edit-profile', false],
    ['account-settings', 'language', false],
    ['home', 'account-settings', false],
    ['settings', 'account-settings', false],
    ['account-settings', 'account-settings', false],
    ['home', '', true],
    ['settings', '', true],
    ['settings', 'notifications', true],
    ['profile', 'edit-profile', true],
    ['search', 'language', true],
  ])('modul %p a pravá položka %p: podobrazovka sa zahodí = %s', (moduleId, rightItem, discarded) => {
    const mounted = mountHook({ activeModule: 'account-settings', activeRightItem: '' });
    setView(mounted, 'verify-email');
    expect(view(mounted)).toBe('verify-email');

    update(mounted, { activeModule: moduleId, activeRightItem: rightItem });

    expect(view(mounted)).toBe(discarded ? 'overview' : 'verify-email');
  });

  it('podobrazovka nastavená mimo nastavení účtu sa zahodí až pri najbližšej zmene modulu', () => {
    const mounted = mountHook({ activeModule: 'home', activeRightItem: '' });
    setView(mounted, 'delete-account');
    expect(view(mounted)).toBe('delete-account');

    update(mounted, { activeModule: 'home', activeRightItem: '' });
    expect(view(mounted)).toBe('delete-account');

    update(mounted, { activeModule: 'search', activeRightItem: '' });
    expect(view(mounted)).toBe('overview');
  });

  it('zmena pravej položky samotná (modul mimo nastavení účtu) podobrazovku zahodí', () => {
    const mounted = mountHook({ activeModule: 'settings', activeRightItem: 'account-settings' });
    setView(mounted, 'verify-email');

    update(mounted, { activeModule: 'settings', activeRightItem: 'language' });

    expect(view(mounted)).toBe('overview');
  });

  it('zmena iných vstupov podobrazovku nezruší', () => {
    const mounted = mountHook({ activeModule: 'home' });
    setView(mounted, 'verify-email');

    update(mounted, {
      activeModule: 'home',
      handleMobileBack: NEW_FN(),
      handleMainModuleChange: NEW_FN(),
      setActiveModule: NEW_FN(),
    });

    expect(view(mounted)).toBe('verify-email');
  });

  it('návrat do nastavení účtu začína znova prehľadom po predošlom odchode', () => {
    const mounted = mountHook({ activeModule: 'account-settings' });
    setView(mounted, 'delete-account');
    update(mounted, { activeModule: 'home' });
    expect(view(mounted)).toBe('overview');

    update(mounted, { activeModule: 'account-settings' });

    expect(view(mounted)).toBe('overview');
  });
});

describe('šípka v nastaveniach účtu (handleAccountSettingsMobileBack)', () => {
  it('z prehľadu zavolá krok späť bez argumentov a podobrazovku nemení', () => {
    const mounted = mountHook({ activeModule: 'account-settings' });

    act(() => mounted.result.current.handleAccountSettingsMobileBack());

    expect(calls).toEqual([entry('handleMobileBack')]);
    expect(base.handleMobileBack).toHaveBeenCalledWith();
    expect(view(mounted)).toBe('overview');
  });

  it.each(['verify-email', 'delete-account'] as const)(
    'z podobrazovky %s sa vráti na prehľad a krok späť nezavolá',
    (sub) => {
      const mounted = mountHook({ activeModule: 'account-settings' });
      setView(mounted, sub);

      act(() => mounted.result.current.handleAccountSettingsMobileBack());

      expect(view(mounted)).toBe('overview');
      expect(calls).toEqual([]);
    },
  );

  it('po návrate na prehľad ďalšie stlačenie volá krok späť', () => {
    const mounted = mountHook({ activeModule: 'account-settings' });
    setView(mounted, 'verify-email');

    act(() => mounted.result.current.handleAccountSettingsMobileBack());
    expect(calls).toEqual([]);
    act(() => mounted.result.current.handleAccountSettingsMobileBack());

    expect(calls).toEqual([entry('handleMobileBack')]);
  });

  it('používa najnovší krok späť', () => {
    const mounted = mountHook({ activeModule: 'account-settings' });
    const newer = spy('novší handleMobileBack');
    update(mounted, { activeModule: 'account-settings', handleMobileBack: newer });

    act(() => mounted.result.current.handleAccountSettingsMobileBack());

    expect(calls).toEqual([entry('novší handleMobileBack')]);
  });

  it('nezmenené vstupy nechajú handler rovnaký', () => {
    const mounted = mountHook();
    const before = mounted.result.current.handleAccountSettingsMobileBack;
    update(mounted, {});
    expect(mounted.result.current.handleAccountSettingsMobileBack).toBe(before);
  });

  it('zmena podobrazovky vytvorí nový handler', () => {
    const mounted = mountHook({ activeModule: 'account-settings' });
    const before = mounted.result.current.handleAccountSettingsMobileBack;
    setView(mounted, 'verify-email');
    expect(mounted.result.current.handleAccountSettingsMobileBack).not.toBe(before);
  });

  it('zmena kroku späť vytvorí nový handler', () => {
    expect(handlerChangesWith('handleAccountSettingsMobileBack', { handleMobileBack: NEW_FN() })).toBe(
      true,
    );
  });

  it.each([
    ['activeModule', { activeModule: 'search' }],
    ['activeRightItem', { activeRightItem: 'language' }],
    ['handleMainModuleChange', { handleMainModuleChange: NEW_FN() }],
    ['setActiveModule', { setActiveModule: NEW_FN() }],
  ] as Array<[string, Partial<HookInput>]>)('zmena %s handler nezmení', (_name, overrides) => {
    expect(handlerChangesWith('handleAccountSettingsMobileBack', overrides)).toBe(false);
  });
});

describe('otvorenie zoznamu (handleMobileSettingsOpen)', () => {
  it.each(['/dashboard/settings', '/dashboard/settings/'])(
    'keď adresa už stojí na zozname (%s), len zosúladí modul a nenaviguje',
    (path) => {
      standAt(path);
      const mounted = mountHook();

      act(() => mounted.result.current.handleMobileSettingsOpen());

      expect(calls).toEqual([entry('setActiveModule', 'settings')]);
    },
  );

  it.each([
    '/dashboard',
    '/dashboard/home',
    '/dashboard/settings/account',
    '/dashboard/settings/notifications',
    '/dashboard/search',
    '/dashboard/settingsX',
  ])('keď adresa stojí inde (%s), ide bežnou navigáciou na Nastavenia', (path) => {
    standAt(path);
    const mounted = mountHook();

    act(() => mounted.result.current.handleMobileSettingsOpen());

    expect(calls).toEqual([entry('handleMainModuleChange', 'settings')]);
  });

  it('nezapisuje do histórie sám (navigáciu robí handleMainModuleChange)', () => {
    standAt('/dashboard/search');
    const mounted = mountHook();

    act(() => mounted.result.current.handleMobileSettingsOpen());

    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it('používa najnovšie handlery', () => {
    standAt('/dashboard');
    const mounted = mountHook();
    const newer = spy('novší handleMainModuleChange');
    update(mounted, { handleMainModuleChange: newer });

    act(() => mounted.result.current.handleMobileSettingsOpen());

    expect(calls).toEqual([entry('novší handleMainModuleChange', 'settings')]);
  });

  it('nezmenené vstupy nechajú handler rovnaký', () => {
    const mounted = mountHook();
    const before = mounted.result.current.handleMobileSettingsOpen;
    update(mounted, {});
    expect(mounted.result.current.handleMobileSettingsOpen).toBe(before);
  });

  it.each([
    ['handleMainModuleChange', { handleMainModuleChange: NEW_FN() }],
    ['setActiveModule', { setActiveModule: NEW_FN() }],
  ] as Array<[string, Partial<HookInput>]>)('zmena %s vytvorí nový handler', (_name, overrides) => {
    expect(handlerChangesWith('handleMobileSettingsOpen', overrides)).toBe(true);
  });

  it.each([
    ['activeModule', { activeModule: 'search' }],
    ['activeRightItem', { activeRightItem: 'language' }],
    ['handleMobileBack', { handleMobileBack: NEW_FN() }],
  ] as Array<[string, Partial<HookInput>]>)('zmena %s handler nezmení', (_name, overrides) => {
    expect(handlerChangesWith('handleMobileSettingsOpen', overrides)).toBe(false);
  });
});

describe('zatvorenie zoznamu (handleMobileSettingsClose)', () => {
  it.each(['/dashboard', '/dashboard/home', '/dashboard/settings/account', '/dashboard/search'])(
    'keď adresa už nie je zoznam (%s), nerobí nič',
    (path) => {
      standAt(path);
      mockStepBackFromMobileSettings.mockReturnValue(true);
      const mounted = mountHook();

      act(() => mounted.result.current.handleMobileSettingsClose());

      expect(calls).toEqual([]);
      expect(mockStepBackFromMobileSettings).not.toHaveBeenCalled();
    },
  );

  it.each(['/dashboard/settings', '/dashboard/settings/'])(
    'zoznam otvorený z appky (%s) sa zatvára krokom späť v histórii a nič iné sa nemení',
    (path) => {
      standAt(path);
      mockStepBackFromMobileSettings.mockReturnValue(true);
      const mounted = mountHook();

      act(() => mounted.result.current.handleMobileSettingsClose());

      expect(mockStepBackFromMobileSettings).toHaveBeenCalledTimes(1);
      expect(calls).toEqual([]);
    },
  );

  it('bez záznamu appky (priamy vstup) prepne na Nástenku a pridá jej adresu do histórie', () => {
    standAt('/dashboard/settings');
    mockStepBackFromMobileSettings.mockReturnValue(false);
    const mounted = mountHook();

    act(() => mounted.result.current.handleMobileSettingsClose());

    expect(mockStepBackFromMobileSettings).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      entry('setActiveModule', 'home'),
      entry('history.pushState', null, '', DASHBOARD_HOME_PATH),
    ]);
  });

  it('krok späť sa skúša až po kontrole adresy', () => {
    standAt('/dashboard/search');
    const mounted = mountHook();

    act(() => mounted.result.current.handleMobileSettingsClose());

    expect(mockStepBackFromMobileSettings).not.toHaveBeenCalled();
  });

  it('používa najnovší setActiveModule', () => {
    standAt('/dashboard/settings');
    mockStepBackFromMobileSettings.mockReturnValue(false);
    const mounted = mountHook();
    const newer = spy('nový setActiveModule');
    update(mounted, { setActiveModule: newer });

    act(() => mounted.result.current.handleMobileSettingsClose());

    expect(calls).toEqual([
      entry('nový setActiveModule', 'home'),
      entry('history.pushState', null, '', DASHBOARD_HOME_PATH),
    ]);
  });

  it('nezmenené vstupy nechajú handler rovnaký', () => {
    const mounted = mountHook();
    const before = mounted.result.current.handleMobileSettingsClose;
    update(mounted, {});
    expect(mounted.result.current.handleMobileSettingsClose).toBe(before);
  });

  it('zmena setActiveModule vytvorí nový handler', () => {
    expect(handlerChangesWith('handleMobileSettingsClose', { setActiveModule: NEW_FN() })).toBe(true);
  });

  it.each([
    ['activeModule', { activeModule: 'search' }],
    ['activeRightItem', { activeRightItem: 'language' }],
    ['handleMobileBack', { handleMobileBack: NEW_FN() }],
    ['handleMainModuleChange', { handleMainModuleChange: NEW_FN() }],
  ] as Array<[string, Partial<HookInput>]>)('zmena %s handler nezmení', (_name, overrides) => {
    expect(handlerChangesWith('handleMobileSettingsClose', overrides)).toBe(false);
  });
});

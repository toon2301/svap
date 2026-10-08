/**
 * Obsluhy šípky späť v hornej lište dashboardu pre štyri obrazovky, ktoré majú vlastný
 * návrat: výber kategórie zručností, popis zručnosti, recenzie ponuky a mobilná
 * konverzácia v Správach.
 *
 * Hook dáva `DashboardContent` štyri handlery a ref, do ktorého si obrazovka kategórií
 * zaregistruje vlastnú obsluhu. Ostatné obrazovky idú bežným `handleMobileBack`. Poradie
 * volaní je súčasť správania, preto sa všetko zapisuje do jedného záznamu `calls`.
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { useDashboardBackHandlers } from '../useDashboardBackHandlers';

/** Všetko, čo hook zavolá alebo zapíše, sa ukladá sem v poradí volaní. */
let calls: string[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

type HookInput = Parameters<typeof useDashboardBackHandlers>[0];
type HookOutput = ReturnType<typeof useDashboardBackHandlers>;
type Mounted = RenderHookResult<HookOutput, HookInput>;

const spy = (name: string, impl?: (...args: unknown[]) => unknown) =>
  jest.fn((...args: unknown[]) => {
    record(name, ...args);
    return impl?.(...args);
  });

let base: HookInput;

const makeBase = (): HookInput => ({
  searchParams: new URLSearchParams(''),
  handleMobileBack: spy('handleMobileBack'),
  handleNotificationNavigate: spy('handleNotificationNavigate'),
  selectedSkillsCategory: { id: 5 },
  setActiveModule: spy('setActiveModule'),
  setActiveRightItem: spy('setActiveRightItem'),
  setIsMobileMenuOpen: spy('setIsMobileMenuOpen'),
  setIsRightSidebarOpen: spy('setIsRightSidebarOpen'),
});

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const makeInput = (overrides: Partial<HookInput> = {}): HookInput => ({ ...base, ...overrides });

const mountHook = (overrides: Partial<HookInput> = {}): Mounted =>
  renderHook((props: HookInput) => useDashboardBackHandlers(props), {
    initialProps: makeInput(overrides),
  });

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

type HandlerName =
  | 'handleOfferReviewsBack'
  | 'handleSkillsDescribeMobileBack'
  | 'handleSkillsCategoryBack'
  | 'handleMobileMessagesBack';

const fire = (mounted: Mounted, name: HandlerName) =>
  act(() => {
    mounted.result.current[name]();
  });

const withReturnTo = (value: string | null) =>
  new URLSearchParams(value === null ? '' : `returnTo=${encodeURIComponent(value)}`);

const INPUT_KEYS = Object.keys(makeBase()) as Array<keyof HookInput>;

/** Mení hook jeden vstup na novú hodnotu. */
const changedValue = (key: keyof HookInput): Partial<HookInput> => {
  if (key === 'searchParams') return { searchParams: withReturnTo('/dashboard/ine') };
  if (key === 'selectedSkillsCategory') return { selectedSkillsCategory: { id: 99 } };
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
  handleOfferReviewsBack: ['handleMobileBack', 'handleNotificationNavigate', 'searchParams'],
  handleSkillsDescribeMobileBack: ['handleMobileBack', 'selectedSkillsCategory'],
  handleSkillsCategoryBack: ['handleMobileBack'],
  handleMobileMessagesBack: [
    'setActiveModule',
    'setActiveRightItem',
    'setIsMobileMenuOpen',
    'setIsRightSidebarOpen',
  ],
};

beforeEach(() => {
  calls = [];
  base = makeBase();
  window.history.replaceState(null, '', '/dashboard');
  jest.spyOn(window.history, 'pushState').mockImplementation((...args: unknown[]) => {
    record('history.pushState', ...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('východiskový stav', () => {
  it('vráti ref a štyri handlery v tomto poradí', () => {
    const mounted = mountHook();
    expect(Object.keys(mounted.result.current)).toEqual([
      'skillsCategoryBackHandlerRef',
      'handleOfferReviewsBack',
      'handleSkillsDescribeMobileBack',
      'handleSkillsCategoryBack',
      'handleMobileMessagesBack',
    ]);
    expect(typeof mounted.result.current.handleOfferReviewsBack).toBe('function');
    expect(typeof mounted.result.current.handleSkillsDescribeMobileBack).toBe('function');
    expect(typeof mounted.result.current.handleSkillsCategoryBack).toBe('function');
    expect(typeof mounted.result.current.handleMobileMessagesBack).toBe('function');
  });

  it('ref na obsluhu kategórií je prázdny a rovnaký medzi renderami', () => {
    const mounted = mountHook();
    const ref = mounted.result.current.skillsCategoryBackHandlerRef;
    expect(ref.current).toBeNull();

    update(mounted, { handleMobileBack: spy('nový') });

    expect(mounted.result.current.skillsCategoryBackHandlerRef).toBe(ref);
  });

  it('pri vytvorení nič nezavolá ani nezapíše', () => {
    mountHook();
    expect(calls).toEqual([]);
  });
});

describe('kategórie zručností (handleSkillsCategoryBack)', () => {
  it('zavolá obsluhu, ktorú si zaregistrovala obrazovka kategórií, a bežný návrat nie', () => {
    const mounted = mountHook();
    mounted.result.current.skillsCategoryBackHandlerRef.current = spy('obsluha kategórií');

    fire(mounted, 'handleSkillsCategoryBack');

    expect(calls).toEqual([entry('obsluha kategórií')]);
  });

  it('platí posledná zaregistrovaná obsluha', () => {
    const mounted = mountHook();
    mounted.result.current.skillsCategoryBackHandlerRef.current = spy('prvá');
    mounted.result.current.skillsCategoryBackHandlerRef.current = spy('druhá');

    fire(mounted, 'handleSkillsCategoryBack');

    expect(calls).toEqual([entry('druhá')]);
  });

  it('každé stlačenie zavolá obsluhu znova', () => {
    const mounted = mountHook();
    const registered = spy('obsluha kategórií');
    mounted.result.current.skillsCategoryBackHandlerRef.current = registered;

    fire(mounted, 'handleSkillsCategoryBack');
    fire(mounted, 'handleSkillsCategoryBack');

    expect(registered).toHaveBeenCalledTimes(2);
  });

  it('bez zaregistrovanej obsluhy ide bežný návrat bez argumentov', () => {
    const mounted = mountHook();

    fire(mounted, 'handleSkillsCategoryBack');

    expect(calls).toEqual([entry('handleMobileBack')]);
    expect(base.handleMobileBack).toHaveBeenCalledWith();
  });

  it('po odregistrovaní obsluhy (null) ide znova bežný návrat', () => {
    const mounted = mountHook();
    mounted.result.current.skillsCategoryBackHandlerRef.current = spy('obsluha kategórií');
    mounted.result.current.skillsCategoryBackHandlerRef.current = null;

    fire(mounted, 'handleSkillsCategoryBack');

    expect(calls).toEqual([entry('handleMobileBack')]);
  });

  it('zaregistrovaná obsluha prežije nové renderovanie', () => {
    const mounted = mountHook();
    mounted.result.current.skillsCategoryBackHandlerRef.current = spy('obsluha kategórií');
    update(mounted, { handleMobileBack: spy('nový') });

    fire(mounted, 'handleSkillsCategoryBack');

    expect(calls).toEqual([entry('obsluha kategórií')]);
  });

  it('dva samostatné hooky si obsluhu nezdieľajú', () => {
    const first = mountHook();
    const second = mountHook();
    first.result.current.skillsCategoryBackHandlerRef.current = spy('obsluha prvého');

    fire(second, 'handleSkillsCategoryBack');

    expect(calls).toEqual([entry('handleMobileBack')]);
  });
});

describe('popis zručnosti (handleSkillsDescribeMobileBack)', () => {
  it('zavolá bežný návrat s hodnotou false a ID vybranej karty', () => {
    const mounted = mountHook({ selectedSkillsCategory: { id: 12 } });

    fire(mounted, 'handleSkillsDescribeMobileBack');

    expect(calls).toEqual([entry('handleMobileBack', false, 12)]);
  });

  it.each([
    ['karta bez ID (nová)', { id: undefined }],
    ['žiadna vybraná karta', null],
  ] as Array<[string, HookInput['selectedSkillsCategory']]>)(
    '%s: ID návratového cieľa je null',
    (_title, category) => {
      const mounted = mountHook({ selectedSkillsCategory: category });

      fire(mounted, 'handleSkillsDescribeMobileBack');

      expect(calls).toEqual([entry('handleMobileBack', false, null)]);
    },
  );

  it('ID 0 sa nepovažuje za chýbajúce', () => {
    const mounted = mountHook({ selectedSkillsCategory: { id: 0 } });

    fire(mounted, 'handleSkillsDescribeMobileBack');

    expect(calls).toEqual([entry('handleMobileBack', false, 0)]);
  });

  it('zaregistrovaná obsluha kategórií sa v popise zručnosti nevolá', () => {
    const mounted = mountHook();
    const registered = spy('obsluha kategórií');
    mounted.result.current.skillsCategoryBackHandlerRef.current = registered;

    fire(mounted, 'handleSkillsDescribeMobileBack');

    expect(registered).not.toHaveBeenCalled();
  });

  it('po zmene vybranej karty používa nové ID', () => {
    const mounted = mountHook({ selectedSkillsCategory: { id: 1 } });
    update(mounted, { selectedSkillsCategory: { id: 2 } });

    fire(mounted, 'handleSkillsDescribeMobileBack');

    expect(calls).toEqual([entry('handleMobileBack', false, 2)]);
  });

  it('nová karta s rovnakým ID handler nezmení (v závislostiach je len ID)', () => {
    const mounted = mountHook({ selectedSkillsCategory: { id: 7 } });
    const before = mounted.result.current.handleSkillsDescribeMobileBack;

    update(mounted, { selectedSkillsCategory: { id: 7 } });

    expect(mounted.result.current.handleSkillsDescribeMobileBack).toBe(before);
  });
});

describe('recenzie ponuky (handleOfferReviewsBack)', () => {
  it.each([
    '/dashboard/requests?status=active&tab=sent',
    '/dashboard/users/jana?highlight=7',
    '/dashboard/profile',
    '/dashboard',
    '/dashboard/feed/7#komentare',
    '  /dashboard/messages  ',
  ])('návratová adresa %p sa odovzdá notifikačnej navigácii a bežný návrat nie', (returnTo) => {
    const mounted = mountHook({ searchParams: withReturnTo(returnTo) });

    fire(mounted, 'handleOfferReviewsBack');

    expect(calls).toEqual([entry('handleNotificationNavigate', returnTo.trim())]);
  });

  it('adresa sa odovzdá v normalizovanom tvare (cesta, dotaz a hash)', () => {
    const mounted = mountHook({
      searchParams: withReturnTo('/dashboard/users/ján?a=1&b=2#x'),
    });

    fire(mounted, 'handleOfferReviewsBack');

    expect(calls).toEqual([
      entry('handleNotificationNavigate', '/dashboard/users/j%C3%A1n?a=1&b=2#x'),
    ]);
  });

  it.each([
    ['bez parametra returnTo', null],
    ['prázdny returnTo', ''],
    ['returnTo z medzier', '   '],
    ['adresa mimo dashboardu', '/login'],
    ['cudzia adresa', 'https://example.com/dashboard/profile'],
    ['adresa bez lomky', 'dashboard/profile'],
    ['adresa s rovnakou schémou', '//dashboard/profile'],
    ['predpona dashboardu bez lomky', '/dashboardX/profile'],
    ['príliš dlhá adresa', `/dashboard/${'a'.repeat(520)}`],
  ] as Array<[string, string | null]>)('%s: ide bežný návrat bez argumentov', (_title, returnTo) => {
    const mounted = mountHook({ searchParams: withReturnTo(returnTo) });

    fire(mounted, 'handleOfferReviewsBack');

    expect(calls).toEqual([entry('handleMobileBack')]);
    expect(base.handleMobileBack).toHaveBeenCalledWith();
  });

  it('bez objektu s parametrami (null) ide bežný návrat', () => {
    const mounted = mountHook({ searchParams: null });

    fire(mounted, 'handleOfferReviewsBack');

    expect(calls).toEqual([entry('handleMobileBack')]);
  });

  it('návratová adresa sa číta z aktuálnych parametrov, nie len z tých pri vytvorení', () => {
    const mounted = mountHook({ searchParams: withReturnTo(null) });
    update(mounted, { searchParams: withReturnTo('/dashboard/requests') });

    fire(mounted, 'handleOfferReviewsBack');

    expect(calls).toEqual([entry('handleNotificationNavigate', '/dashboard/requests')]);
  });

  it('parameter returnTo sa číta presne podľa názvu', () => {
    const mounted = mountHook({
      searchParams: new URLSearchParams('returnto=/dashboard/requests&return_to=/dashboard/requests'),
    });

    fire(mounted, 'handleOfferReviewsBack');

    expect(calls).toEqual([entry('handleMobileBack')]);
  });

  it('nový objekt parametrov s rovnakou návratovou adresou handler nezmení', () => {
    const mounted = mountHook({ searchParams: withReturnTo('/dashboard/requests') });
    const before = mounted.result.current.handleOfferReviewsBack;

    update(mounted, { searchParams: withReturnTo('/dashboard/requests') });

    expect(mounted.result.current.handleOfferReviewsBack).toBe(before);
  });

  it('iná návratová adresa vytvorí nový handler', () => {
    const mounted = mountHook({ searchParams: withReturnTo('/dashboard/requests') });
    const before = mounted.result.current.handleOfferReviewsBack;

    update(mounted, { searchParams: withReturnTo('/dashboard/profile') });

    expect(mounted.result.current.handleOfferReviewsBack).not.toBe(before);
  });

  it('zmena platnej adresy na neplatnú vytvorí nový handler', () => {
    const mounted = mountHook({ searchParams: withReturnTo('/dashboard/requests') });
    const before = mounted.result.current.handleOfferReviewsBack;

    update(mounted, { searchParams: withReturnTo('/login') });

    expect(mounted.result.current.handleOfferReviewsBack).not.toBe(before);
  });
});

describe('mobilná konverzácia v Správach (handleMobileMessagesBack)', () => {
  it('prepne na Správy, zavrie pravý panel aj mobilné menu a pridá adresu Správ do histórie', () => {
    const mounted = mountHook();

    fire(mounted, 'handleMobileMessagesBack');

    expect(calls).toEqual([
      entry('setActiveModule', 'messages'),
      entry('setIsRightSidebarOpen', false),
      entry('setActiveRightItem', ''),
      entry('setIsMobileMenuOpen', false),
      entry('history.pushState', null, '', '/dashboard/messages'),
    ]);
  });

  it('používa najnovšie handlery', () => {
    const mounted = mountHook();
    const newer = spy('nový setActiveModule');
    update(mounted, { setActiveModule: newer });

    fire(mounted, 'handleMobileMessagesBack');

    expect(calls[0]).toBe(entry('nový setActiveModule', 'messages'));
  });
});

describe('stabilita handlerov medzi renderami', () => {
  it('nezmenené vstupy nechajú všetky handlery rovnaké', () => {
    const mounted = mountHook();
    const before = { ...mounted.result.current };

    update(mounted, {});

    (Object.keys(before) as Array<keyof HookOutput>).forEach((name) => {
      expect(mounted.result.current[name]).toBe(before[name]);
    });
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

/**
 * Úprava a mazanie vlastnej karty (ponuky) z profilu.
 *
 * Hook drží stav potvrdzovacieho okna (`pendingDeleteOffer`, `isDeletingOwnProfileOffer`)
 * a dáva `DashboardContent` tri handlery: otvorenie karty na úpravu (okno na desktope,
 * celá stránka `skills-describe` na mobile), vyžiadanie zmazania a potvrdené zmazanie
 * (volanie API, upratanie zoznamov, obnovenie profilu). Poradie volaní je súčasť
 * správania, preto sa všetko zapisuje do jedného záznamu `calls`.
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import type { Offer } from '../../modules/profile/profileOffersTypes';
import type { DashboardSkill } from '../useSkillsModals';
import { useOwnProfileOfferActions } from '../useOwnProfileOfferActions';

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

const mockApiDelete = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { delete: (...args: unknown[]) => mockApiDelete(...args) },
  endpoints: { skills: { detail: (id: number) => `/skills/${id}/` } },
}));

const mockInvalidateOffersCache = jest.fn();
jest.mock('../../modules/profile/profileOffersCache', () => ({
  invalidateOffersCache: (...args: unknown[]) => mockInvalidateOffersCache(...args),
}));

const mockDispatchProfileOffersRefresh = jest.fn();
jest.mock('../../modules/profile/profileOfferEvents', () => ({
  dispatchProfileOffersRefresh: (...args: unknown[]) => mockDispatchProfileOffersRefresh(...args),
}));

const mockSetSkillsDescribeProfileReturn = jest.fn();
jest.mock('../../modules/skills/skillsDescribeReturnSession', () => ({
  setSkillsDescribeProfileReturn: (...args: unknown[]) =>
    mockSetSkillsDescribeProfileReturn(...args),
}));

const mockMatchMedia = jest.fn();

/** Všetko, čo hook zavolá alebo zapíše, sa ukladá sem v poradí volaní. */
let calls: string[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

const EDIT_FAILED = 'skills.cardEditFailed=Kartu sa nepodarilo otvoriť na úpravu. Skúste to znova.';
const DELETE_FAILED = 'skills.cardDeleteFailed=Kartu sa nepodarilo odstrániť. Skúste to znova.';
const DELETE_SUCCESS = 'skills.cardDeleteSuccess=Karta bola vymazaná.';
const MOBILE_QUERY = '(max-width: 1023px)';

const offer = (id: number, over: Partial<Offer> = {}): Offer => ({
  id,
  category: 'Hudba',
  subcategory: 'Gitara',
  description: 'Hodiny gitary',
  ...over,
});

const offerWithId = (id: unknown): Offer => ({ ...offer(1), id: id as number });

const skill = (id: number, over: Partial<DashboardSkill> = {}): DashboardSkill => ({
  id,
  category: 'Hudba',
  subcategory: 'Gitara',
  ...over,
});

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const INVALID_IDS: Array<[string, unknown]> = [
  ['nula', 0],
  ['záporné číslo', -3],
  ['desatinné číslo', 1.5],
  ['NaN', Number.NaN],
  ['nekonečno', Number.POSITIVE_INFINITY],
  ['väčšie než bezpečné celé číslo', Number.MAX_SAFE_INTEGER + 1],
  ['číslo zapísané textom', '7'],
  ['null', null],
  ['chýbajúce id', undefined],
];

const VALID_IDS: Array<[string, number]> = [
  ['najmenšie platné id', 1],
  ['bežné id', 42],
  ['najväčšie bezpečné celé číslo', Number.MAX_SAFE_INTEGER],
];

/** [popis, chyba z API, hláška, ktorá sa má ukázať (null = záložný text)] */
const API_ERRORS: Array<[string, unknown, string | null]> = [
  ['hláška z `error`', { response: { data: { error: 'Karta už neexistuje.' } } }, 'Karta už neexistuje.'],
  ['hláška z `detail`', { response: { data: { detail: 'Nemáte oprávnenie.' } } }, 'Nemáte oprávnenie.'],
  [
    '`error` má prednosť pred `detail`',
    { response: { data: { error: 'Chyba A', detail: 'Chyba B' } } },
    'Chyba A',
  ],
  [
    'prázdny `error` prepustí `detail`',
    { response: { data: { error: '   ', detail: 'Chyba B' } } },
    'Chyba B',
  ],
  ['odpoveď bez hlášky', { response: { data: {} } }, null],
  ['sieťová chyba', new Error('Network Error'), null],
];

type HookInput = Parameters<typeof useOwnProfileOfferActions>[0];
type Mounted = RenderHookResult<ReturnType<typeof useOwnProfileOfferActions>, HookInput>;

const translate = (key: string, fallback?: string) => `${key}=${fallback}`;

const spy = (name: string, impl?: (...args: unknown[]) => unknown) =>
  jest.fn((...args: unknown[]) => {
    record(name, ...args);
    return impl?.(...args);
  });

let base: HookInput;

const makeBase = (): HookInput => ({
  isMobile: false,
  t: translate,
  user: { id: 1 },
  selectedSkillsCategory: null,
  fetchSkillDetail: spy('fetchSkillDetail', (id) => Promise.resolve(skill(id as number))),
  loadSkills: spy('loadSkills', () => Promise.resolve()),
  setStandardCategories: spy('setStandardCategories'),
  setCustomCategories: spy('setCustomCategories'),
  setSelectedSkillsCategory: spy('setSelectedSkillsCategory'),
  setIsSkillDescriptionModalOpen: spy('setIsSkillDescriptionModalOpen'),
  setEditingCustomCategoryIndex: spy('setEditingCustomCategoryIndex'),
  setEditingStandardCategoryIndex: spy('setEditingStandardCategoryIndex'),
  setActiveModule: spy('setActiveModule'),
  setIsRightSidebarOpen: spy('setIsRightSidebarOpen'),
  setActiveRightItem: spy('setActiveRightItem'),
  setIsMobileMenuOpen: spy('setIsMobileMenuOpen'),
  setIsSearchOpen: spy('setIsSearchOpen'),
  setIsNotificationsPanelOpen: spy('setIsNotificationsPanelOpen'),
  setOwnProfileTab: spy('setOwnProfileTab'),
});

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const makeInput = (overrides: Partial<HookInput> = {}): HookInput => ({ ...base, ...overrides });

const mountHook = (overrides: Partial<HookInput> = {}): Mounted =>
  renderHook((props: HookInput) => useOwnProfileOfferActions(props), {
    initialProps: makeInput(overrides),
  });

const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  mounted.rerender(makeInput(overrides));

const edit = (mounted: Mounted, target: Offer = offer(7)) =>
  act(async () => {
    await mounted.result.current.handleEditOwnProfileOffer(target);
  });

const askDelete = (mounted: Mounted, target: Offer) =>
  act(() => {
    mounted.result.current.handleDeleteOwnProfileOffer(target);
  });

const confirmDelete = (mounted: Mounted) =>
  act(async () => {
    await mounted.result.current.handleConfirmDeleteOwnProfileOffer();
  });

const updaterOf = (setter: unknown) =>
  (setter as { mock: { calls: unknown[][] } }).mock.calls[0][0] as (
    prev: DashboardSkill[],
  ) => DashboardSkill[];

const realSetItem = Storage.prototype.setItem;
const realMatchMedia = window.matchMedia;
let setItemSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  calls = [];
  base = makeBase();
  localStorage.clear();
  mockToastError.mockReset().mockImplementation((...args: unknown[]) => record('toast.error', ...args));
  mockToastSuccess
    .mockReset()
    .mockImplementation((...args: unknown[]) => record('toast.success', ...args));
  mockApiDelete.mockReset().mockImplementation((...args: unknown[]) => {
    record('api.delete', ...args);
    return Promise.resolve({});
  });
  mockInvalidateOffersCache
    .mockReset()
    .mockImplementation((...args: unknown[]) => record('invalidateOffersCache', ...args));
  mockDispatchProfileOffersRefresh
    .mockReset()
    .mockImplementation((...args: unknown[]) => record('dispatchProfileOffersRefresh', ...args));
  mockSetSkillsDescribeProfileReturn
    .mockReset()
    .mockImplementation((...args: unknown[]) => record('setSkillsDescribeProfileReturn', ...args));
  setItemSpy = jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function (this: Storage, key: string, value: string) {
      record('localStorage.setItem', key, value);
      realSetItem.call(this, key, value);
    });
  mockMatchMedia.mockReset().mockImplementation((query: string) => {
    record('matchMedia', query);
    return { matches: false, media: query };
  });
  window.matchMedia = mockMatchMedia as unknown as typeof window.matchMedia;
});

afterEach(() => {
  setItemSpy.mockRestore();
});

afterAll(() => {
  window.matchMedia = realMatchMedia;
});

describe('východiskový stav', () => {
  it('vráti stav okna a tri handlery, nič nečaká na potvrdenie ani sa nemaže', () => {
    const mounted = mountHook();
    expect(Object.keys(mounted.result.current).sort()).toEqual([
      'handleConfirmDeleteOwnProfileOffer',
      'handleDeleteOwnProfileOffer',
      'handleEditOwnProfileOffer',
      'isDeletingOwnProfileOffer',
      'pendingDeleteOffer',
      'setPendingDeleteOffer',
    ]);
    expect(mounted.result.current.pendingDeleteOffer).toBeNull();
    expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
  });

  it('pri vytvorení nič nezavolá, nezapíše do úložiska ani neukáže hlášku', () => {
    mountHook();
    expect(calls).toEqual([]);
  });
});

describe('úprava ponuky (handleEditOwnProfileOffer)', () => {
  it.each(INVALID_IDS)('neplatné id (%s): ukáže chybu a nič iné nespraví', async (_label, badId) => {
    const mounted = mountHook();
    await edit(mounted, offerWithId(badId));
    expect(calls).toEqual([entry('toast.error', EDIT_FAILED)]);
  });

  it.each(VALID_IDS)('platné id (%s) sa pošle do načítania detailu', async (_label, id) => {
    const mounted = mountHook();
    await edit(mounted, offer(id));
    expect(base.fetchSkillDetail).toHaveBeenCalledTimes(1);
    expect(base.fetchSkillDetail).toHaveBeenCalledWith(id);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('desktop: otvorí okno úpravy s načítanou kartou (presné poradie krokov)', async () => {
    const mounted = mountHook();
    await edit(mounted);
    expect(calls).toEqual([
      entry('setOwnProfileTab', 'offers'),
      entry('fetchSkillDetail', 7),
      entry('setEditingCustomCategoryIndex', null),
      entry('setEditingStandardCategoryIndex', null),
      entry('setSelectedSkillsCategory', skill(7)),
      entry('localStorage.setItem', 'skillsDescribeMode', 'offer'),
      entry('matchMedia', MOBILE_QUERY),
      entry('setIsSkillDescriptionModalOpen', true),
    ]);
    expect(localStorage.getItem('skillsDescribeMode')).toBe('offer');
    expect(localStorage.getItem('activeModule')).toBeNull();
  });

  it('mobil (isMobile): otvorí celú stránku skills-describe a zapamätá si návrat do profilu', async () => {
    const mounted = mountHook({ isMobile: true });
    await edit(mounted);
    expect(calls).toEqual([
      entry('setOwnProfileTab', 'offers'),
      entry('fetchSkillDetail', 7),
      entry('setEditingCustomCategoryIndex', null),
      entry('setEditingStandardCategoryIndex', null),
      entry('setSelectedSkillsCategory', skill(7)),
      entry('localStorage.setItem', 'skillsDescribeMode', 'offer'),
      entry('setIsSkillDescriptionModalOpen', false),
      entry('setActiveModule', 'skills-describe'),
      entry('setIsRightSidebarOpen', false),
      entry('setActiveRightItem', ''),
      entry('setIsMobileMenuOpen', false),
      entry('setIsSearchOpen', false),
      entry('setIsNotificationsPanelOpen', false),
      entry('localStorage.setItem', 'activeModule', 'skills-describe'),
      entry('setSkillsDescribeProfileReturn', 7),
    ]);
    expect(localStorage.getItem('activeModule')).toBe('skills-describe');
  });

  it('úzky viewport podľa matchMedia: rovnako ako mobil, aj keď isMobile ešte nie je true', async () => {
    mockMatchMedia.mockImplementation((query: string) => {
      record('matchMedia', query);
      return { matches: true, media: query };
    });
    const mounted = mountHook({ isMobile: false });
    await edit(mounted);
    expect(calls).toEqual([
      entry('setOwnProfileTab', 'offers'),
      entry('fetchSkillDetail', 7),
      entry('setEditingCustomCategoryIndex', null),
      entry('setEditingStandardCategoryIndex', null),
      entry('setSelectedSkillsCategory', skill(7)),
      entry('localStorage.setItem', 'skillsDescribeMode', 'offer'),
      entry('matchMedia', MOBILE_QUERY),
      entry('setIsSkillDescriptionModalOpen', false),
      entry('setActiveModule', 'skills-describe'),
      entry('setIsRightSidebarOpen', false),
      entry('setActiveRightItem', ''),
      entry('setIsMobileMenuOpen', false),
      entry('setIsSearchOpen', false),
      entry('setIsNotificationsPanelOpen', false),
      entry('localStorage.setItem', 'activeModule', 'skills-describe'),
      entry('setSkillsDescribeProfileReturn', 7),
    ]);
  });

  it.each([
    ['Hľadám (is_seeking: true)', true, 'search'],
    ['Ponúkam (is_seeking: false)', false, 'offer'],
    ['Ponúkam (is_seeking chýba)', undefined, 'offer'],
  ])('karta z časti %s si zapamätá režim „%s“', async (_label, isSeeking, mode) => {
    const mounted = mountHook({
      fetchSkillDetail: spy('fetchSkillDetail', () => Promise.resolve(skill(7, { is_seeking: isSeeking }))),
    });
    await edit(mounted);
    expect(localStorage.getItem('skillsDescribeMode')).toBe(mode);
    expect(calls).toContain(entry('localStorage.setItem', 'skillsDescribeMode', mode));
  });

  it('do vybranej karty sa dostane presne ten objekt, ktorý vrátilo načítanie detailu', async () => {
    const fetched = skill(7, { description: 'z API' });
    const mounted = mountHook({
      fetchSkillDetail: spy('fetchSkillDetail', () => Promise.resolve(fetched)),
    });
    await edit(mounted);
    expect(base.setSelectedSkillsCategory).toHaveBeenCalledTimes(1);
    expect((base.setSelectedSkillsCategory as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toBe(
      fetched,
    );
  });

  it('návrat na mobile sa viaže na id kliknutej ponuky, nie na id z odpovede', async () => {
    const mounted = mountHook({
      isMobile: true,
      fetchSkillDetail: spy('fetchSkillDetail', () => Promise.resolve(skill(99))),
    });
    await edit(mounted, offer(7));
    expect(mockSetSkillsDescribeProfileReturn).toHaveBeenCalledTimes(1);
    expect(mockSetSkillsDescribeProfileReturn).toHaveBeenCalledWith(7);
  });

  it('záložka profilu sa prepne na Ponuky ešte predtým, než príde detail', async () => {
    const detail = deferred<DashboardSkill>();
    const mounted = mountHook({ fetchSkillDetail: spy('fetchSkillDetail', () => detail.promise) });
    let pending!: Promise<void>;
    act(() => {
      pending = mounted.result.current.handleEditOwnProfileOffer(offer(7));
    });
    expect(calls).toEqual([entry('setOwnProfileTab', 'offers'), entry('fetchSkillDetail', 7)]);
    await act(async () => {
      detail.resolve(skill(7));
      await pending;
    });
    expect(calls).toContain(entry('setIsSkillDescriptionModalOpen', true));
  });

  it('chyba úložiska pri zápise režimu karty úpravu na desktope nezastaví', async () => {
    setItemSpy.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const mounted = mountHook();
    await edit(mounted);
    expect(setItemSpy).toHaveBeenCalledWith('skillsDescribeMode', 'offer');
    expect(calls).toEqual([
      entry('setOwnProfileTab', 'offers'),
      entry('fetchSkillDetail', 7),
      entry('setEditingCustomCategoryIndex', null),
      entry('setEditingStandardCategoryIndex', null),
      entry('setSelectedSkillsCategory', skill(7)),
      entry('matchMedia', MOBILE_QUERY),
      entry('setIsSkillDescriptionModalOpen', true),
    ]);
  });

  it('chyba úložiska pri zápise modulu nezastaví presun na mobilnú stránku', async () => {
    setItemSpy.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const mounted = mountHook({ isMobile: true });
    await edit(mounted);
    expect(setItemSpy).toHaveBeenCalledWith('skillsDescribeMode', 'offer');
    expect(setItemSpy).toHaveBeenCalledWith('activeModule', 'skills-describe');
    expect(calls).toEqual([
      entry('setOwnProfileTab', 'offers'),
      entry('fetchSkillDetail', 7),
      entry('setEditingCustomCategoryIndex', null),
      entry('setEditingStandardCategoryIndex', null),
      entry('setSelectedSkillsCategory', skill(7)),
      entry('setIsSkillDescriptionModalOpen', false),
      entry('setActiveModule', 'skills-describe'),
      entry('setIsRightSidebarOpen', false),
      entry('setActiveRightItem', ''),
      entry('setIsMobileMenuOpen', false),
      entry('setIsSearchOpen', false),
      entry('setIsNotificationsPanelOpen', false),
      entry('setSkillsDescribeProfileReturn', 7),
    ]);
  });

  it.each(API_ERRORS)(
    'zlyhanie načítania detailu (%s): ukáže hlášku a nič ďalšie nezmení',
    async (_label, error, message) => {
      const mounted = mountHook({
        fetchSkillDetail: spy('fetchSkillDetail', () => Promise.reject(error)),
      });
      await edit(mounted);
      expect(calls).toEqual([
        entry('setOwnProfileTab', 'offers'),
        entry('fetchSkillDetail', 7),
        entry('toast.error', message ?? EDIT_FAILED),
      ]);
      expect(localStorage.getItem('skillsDescribeMode')).toBeNull();
    },
  );

  it('chyba až po načítaní detailu sa ohlási rovnakou hláškou ako chyba načítania', async () => {
    const mounted = mountHook({
      setSelectedSkillsCategory: spy('setSelectedSkillsCategory', () => {
        throw new Error('boom');
      }),
    });
    await edit(mounted);
    expect(calls).toEqual([
      entry('setOwnProfileTab', 'offers'),
      entry('fetchSkillDetail', 7),
      entry('setEditingCustomCategoryIndex', null),
      entry('setEditingStandardCategoryIndex', null),
      entry('setSelectedSkillsCategory', skill(7)),
      entry('toast.error', EDIT_FAILED),
    ]);
  });
});

describe('vyžiadanie zmazania (handleDeleteOwnProfileOffer)', () => {
  it.each(VALID_IDS)('platné id (%s): ponuka čaká na potvrdenie a nič sa nevolá', async (_label, id) => {
    const mounted = mountHook();
    const target = offer(id);
    await askDelete(mounted, target);
    expect(mounted.result.current.pendingDeleteOffer).toBe(target);
    expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
    expect(calls).toEqual([]);
  });

  it.each(INVALID_IDS)('neplatné id (%s): ukáže chybu a ponuka nečaká na potvrdenie', async (_label, badId) => {
    const mounted = mountHook();
    await askDelete(mounted, offerWithId(badId));
    expect(mounted.result.current.pendingDeleteOffer).toBeNull();
    expect(calls).toEqual([entry('toast.error', DELETE_FAILED)]);
  });

  it('ďalšie vyžiadanie nahradí čakajúcu ponuku', async () => {
    const mounted = mountHook();
    const second = offer(8);
    await askDelete(mounted, offer(5));
    await askDelete(mounted, second);
    expect(mounted.result.current.pendingDeleteOffer).toBe(second);
  });

  it('neplatné vyžiadanie už čakajúcu ponuku nezruší', async () => {
    const mounted = mountHook();
    const first = offer(5);
    await askDelete(mounted, first);
    await askDelete(mounted, offerWithId(0));
    expect(mounted.result.current.pendingDeleteOffer).toBe(first);
  });

  it('okno sa zatvorí cez setPendingDeleteOffer(null), ktoré hook vracia pre potvrdzovacie okno', async () => {
    const mounted = mountHook();
    await askDelete(mounted, offer(5));
    act(() => {
      mounted.result.current.setPendingDeleteOffer(null);
    });
    expect(mounted.result.current.pendingDeleteOffer).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe('potvrdenie zmazania (handleConfirmDeleteOwnProfileOffer)', () => {
  const UPDATER = (): void => {};

  it('bez čakajúcej ponuky nič nespraví', async () => {
    const mounted = mountHook();
    await confirmDelete(mounted);
    expect(calls).toEqual([]);
    expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
  });

  it.each(INVALID_IDS)(
    'neplatné id (%s) v čakajúcej ponuke: okno sa zavrie, ukáže sa chyba a API sa nevolá',
    async (_label, badId) => {
      const waiting = offer(5);
      const mounted = mountHook();
      await askDelete(mounted, waiting);
      (waiting as unknown as { id: unknown }).id = badId;
      await confirmDelete(mounted);
      expect(mounted.result.current.pendingDeleteOffer).toBeNull();
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
      expect(calls).toEqual([entry('toast.error', DELETE_FAILED)]);
    },
  );

  describe('úspešné zmazanie', () => {
    it.each(VALID_IDS)('platné id (%s) sa zmaže cez endpoint karty', async (_label, id) => {
      const mounted = mountHook();
      await askDelete(mounted, offer(id));
      await confirmDelete(mounted);
      expect(calls[0]).toBe(entry('api.delete', `/skills/${id}/`));
      expect(mockApiDelete).toHaveBeenCalledTimes(1);
    });

    it('presné poradie krokov, keď je vybraná iná karta', async () => {
      const mounted = mountHook({ selectedSkillsCategory: { id: 9 } });
      await askDelete(mounted, offer(5));
      await confirmDelete(mounted);
      expect(calls).toEqual([
        entry('api.delete', '/skills/5/'),
        entry('setStandardCategories', UPDATER),
        entry('setCustomCategories', UPDATER),
        entry('invalidateOffersCache', 1),
        entry('dispatchProfileOffersRefresh', { ownerUserId: 1, deletedOfferId: 5 }),
        entry('toast.success', DELETE_SUCCESS),
        entry('loadSkills'),
      ]);
      expect(mounted.result.current.pendingDeleteOffer).toBeNull();
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
    });

    it('presné poradie krokov, keď nie je vybraná žiadna karta', async () => {
      const mounted = mountHook({ selectedSkillsCategory: null });
      await askDelete(mounted, offer(5));
      await confirmDelete(mounted);
      expect(calls).toEqual([
        entry('api.delete', '/skills/5/'),
        entry('setStandardCategories', UPDATER),
        entry('setCustomCategories', UPDATER),
        entry('invalidateOffersCache', 1),
        entry('dispatchProfileOffersRefresh', { ownerUserId: 1, deletedOfferId: 5 }),
        entry('toast.success', DELETE_SUCCESS),
        entry('loadSkills'),
      ]);
    });

    it('zmazaná je práve vybraná karta: výber aj okno popisu sa zatvoria hneď po zoznamoch', async () => {
      const mounted = mountHook({ selectedSkillsCategory: { id: 5 } });
      await askDelete(mounted, offer(5));
      await confirmDelete(mounted);
      expect(calls).toEqual([
        entry('api.delete', '/skills/5/'),
        entry('setStandardCategories', UPDATER),
        entry('setCustomCategories', UPDATER),
        entry('setSelectedSkillsCategory', null),
        entry('setIsSkillDescriptionModalOpen', false),
        entry('invalidateOffersCache', 1),
        entry('dispatchProfileOffersRefresh', { ownerUserId: 1, deletedOfferId: 5 }),
        entry('toast.success', DELETE_SUCCESS),
        entry('loadSkills'),
      ]);
    });

    it('bez prihláseného používateľa sa cache aj obnovenie profilu pýtajú bez ownerUserId', async () => {
      const mounted = mountHook({ user: null });
      await askDelete(mounted, offer(5));
      await confirmDelete(mounted);
      expect(mockInvalidateOffersCache).toHaveBeenCalledWith(undefined);
      expect(mockDispatchProfileOffersRefresh).toHaveBeenCalledWith({
        ownerUserId: undefined,
        deletedOfferId: 5,
      });
    });

    it('zo štandardných aj vlastných kariet vyhodí práve zmazanú a ostatné nechá', async () => {
      const mounted = mountHook();
      await askDelete(mounted, offer(5));
      await confirmDelete(mounted);
      const withoutId: DashboardSkill = { category: 'Bez id', subcategory: 'x' };
      const list = [skill(1), skill(5), skill(9), withoutId];
      expect(base.setStandardCategories).toHaveBeenCalledTimes(1);
      expect(base.setCustomCategories).toHaveBeenCalledTimes(1);
      expect(updaterOf(base.setStandardCategories)(list)).toEqual([skill(1), skill(9), withoutId]);
      expect(updaterOf(base.setCustomCategories)(list)).toEqual([skill(1), skill(9), withoutId]);
      expect(list).toHaveLength(4);
    });

    it('počas volania API je isDeletingOwnProfileOffer true a okno ostáva otvorené', async () => {
      const request = deferred<unknown>();
      mockApiDelete.mockImplementation((...args: unknown[]) => {
        record('api.delete', ...args);
        return request.promise;
      });
      const mounted = mountHook();
      await askDelete(mounted, offer(5));
      let running!: Promise<void>;
      act(() => {
        running = mounted.result.current.handleConfirmDeleteOwnProfileOffer();
      });
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(true);
      expect(mounted.result.current.pendingDeleteOffer).not.toBeNull();
      expect(calls).toEqual([entry('api.delete', '/skills/5/')]);
      await act(async () => {
        request.resolve({});
        await running;
      });
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
      expect(mounted.result.current.pendingDeleteOffer).toBeNull();
    });

    it('obnovenie zručností sa nečaká: mazanie skončí a príznak sa vráti na false, aj keď loadSkills ešte beží', async () => {
      const reload = deferred<void>();
      const mounted = mountHook({ loadSkills: spy('loadSkills', () => reload.promise) });
      await askDelete(mounted, offer(5));
      let finished = false;
      await act(async () => {
        const running = mounted.result.current.handleConfirmDeleteOwnProfileOffer().then(() => {
          finished = true;
        });
        await Promise.race([running, new Promise((resolve) => setTimeout(resolve, 0))]);
      });
      expect(calls[calls.length - 1]).toBe(entry('loadSkills'));
      expect(finished).toBe(true);
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
      expect(mounted.result.current.pendingDeleteOffer).toBeNull();
      expect(mockToastError).not.toHaveBeenCalled();
      reload.resolve();
    });
  });

  describe('zlyhanie zmazania', () => {
    it.each(API_ERRORS)(
      'zlyhanie API (%s): ukáže hlášku, okno ostáva otvorené a nič sa neupratuje',
      async (_label, error, message) => {
        mockApiDelete.mockImplementation((...args: unknown[]) => {
          record('api.delete', ...args);
          return Promise.reject(error);
        });
        const target = offer(5);
        const mounted = mountHook();
        await askDelete(mounted, target);
        await confirmDelete(mounted);
        expect(calls).toEqual([
          entry('api.delete', '/skills/5/'),
          entry('toast.error', message ?? DELETE_FAILED),
        ]);
        expect(mounted.result.current.pendingDeleteOffer).toBe(target);
        expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
      },
    );

    it('po zlyhaní sa dá zmazanie zopakovať a druhý pokus prejde', async () => {
      mockApiDelete.mockImplementationOnce((...args: unknown[]) => {
        record('api.delete', ...args);
        return Promise.reject(new Error('Network Error'));
      });
      const mounted = mountHook();
      await askDelete(mounted, offer(5));
      await confirmDelete(mounted);
      expect(mounted.result.current.pendingDeleteOffer).not.toBeNull();
      calls = [];
      await confirmDelete(mounted);
      expect(calls[0]).toBe(entry('api.delete', '/skills/5/'));
      expect(calls).toContain(entry('toast.success', DELETE_SUCCESS));
      expect(mounted.result.current.pendingDeleteOffer).toBeNull();
    });

    it('chyba po úspešnom volaní API (pri zneplatnení cache) okno nezavrie a ohlási sa ako zlyhanie', async () => {
      mockInvalidateOffersCache.mockImplementation((...args: unknown[]) => {
        record('invalidateOffersCache', ...args);
        throw new Error('cache');
      });
      const target = offer(5);
      const mounted = mountHook();
      await askDelete(mounted, target);
      await confirmDelete(mounted);
      expect(calls).toEqual([
        entry('api.delete', '/skills/5/'),
        entry('setStandardCategories', UPDATER),
        entry('setCustomCategories', UPDATER),
        entry('invalidateOffersCache', 1),
        entry('toast.error', DELETE_FAILED),
      ]);
      expect(mounted.result.current.pendingDeleteOffer).toBe(target);
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
    });
  });

  describe('ochrana pred dvojitým potvrdením a nezávislosť od úpravy', () => {
    it('druhé potvrdenie počas mazania API nevolá znova', async () => {
      const request = deferred<unknown>();
      mockApiDelete.mockImplementation((...args: unknown[]) => {
        record('api.delete', ...args);
        return request.promise;
      });
      const mounted = mountHook();
      await askDelete(mounted, offer(5));
      let first!: Promise<void>;
      act(() => {
        first = mounted.result.current.handleConfirmDeleteOwnProfileOffer();
      });
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(true);
      await confirmDelete(mounted);
      expect(mockApiDelete).toHaveBeenCalledTimes(1);
      expect(calls).toEqual([entry('api.delete', '/skills/5/')]);
      await act(async () => {
        request.resolve({});
        await first;
      });
      expect(mockApiDelete).toHaveBeenCalledTimes(1);
      expect(mockToastSuccess).toHaveBeenCalledTimes(1);
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
    });

    it('po dokončení mazania ďalšie potvrdenie nič nespraví, lebo nič nečaká', async () => {
      const mounted = mountHook();
      await askDelete(mounted, offer(5));
      await confirmDelete(mounted);
      calls = [];
      await confirmDelete(mounted);
      expect(calls).toEqual([]);
      expect(mockApiDelete).toHaveBeenCalledTimes(1);
    });

    it('úprava inej karty počas mazania nie je blokovaná a mazanie neovplyvní', async () => {
      const request = deferred<unknown>();
      mockApiDelete.mockImplementation((...args: unknown[]) => {
        record('api.delete', ...args);
        return request.promise;
      });
      const mounted = mountHook();
      await askDelete(mounted, offer(5));
      let running!: Promise<void>;
      act(() => {
        running = mounted.result.current.handleConfirmDeleteOwnProfileOffer();
      });
      await edit(mounted, offer(8));
      expect(calls).toContain(entry('fetchSkillDetail', 8));
      expect(calls).toContain(entry('setIsSkillDescriptionModalOpen', true));
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(true);
      await act(async () => {
        request.resolve({});
        await running;
      });
      expect(mounted.result.current.isDeletingOwnProfileOffer).toBe(false);
    });
  });
});

type HandlerName =
  | 'handleEditOwnProfileOffer'
  | 'handleDeleteOwnProfileOffer'
  | 'handleConfirmDeleteOwnProfileOffer';

/** Nová hodnota pre každý vstup: úplnosť tabuľky kontroluje typ `Record<keyof HookInput, …>`. */
const CHANGED_INPUT: Record<keyof HookInput, () => unknown> = {
  isMobile: () => true,
  t: () => (key: string) => key,
  user: () => ({ id: 2 }),
  selectedSkillsCategory: () => ({ id: 8 }),
  fetchSkillDetail: () => jest.fn(),
  loadSkills: () => jest.fn(),
  setStandardCategories: () => jest.fn(),
  setCustomCategories: () => jest.fn(),
  setSelectedSkillsCategory: () => jest.fn(),
  setIsSkillDescriptionModalOpen: () => jest.fn(),
  setEditingCustomCategoryIndex: () => jest.fn(),
  setEditingStandardCategoryIndex: () => jest.fn(),
  setActiveModule: () => jest.fn(),
  setIsRightSidebarOpen: () => jest.fn(),
  setActiveRightItem: () => jest.fn(),
  setIsMobileMenuOpen: () => jest.fn(),
  setIsSearchOpen: () => jest.fn(),
  setIsNotificationsPanelOpen: () => jest.fn(),
  setOwnProfileTab: () => jest.fn(),
};

/** Od ktorých vstupov handler závisí: len zmena týchto vstupov ho smie obnoviť. */
const DEPENDENCIES: Record<HandlerName, ReadonlyArray<keyof HookInput>> = {
  handleEditOwnProfileOffer: [
    'fetchSkillDetail',
    'isMobile',
    'setActiveModule',
    'setActiveRightItem',
    'setEditingCustomCategoryIndex',
    'setEditingStandardCategoryIndex',
    'setIsSkillDescriptionModalOpen',
    'setIsMobileMenuOpen',
    'setIsNotificationsPanelOpen',
    'setIsRightSidebarOpen',
    'setIsSearchOpen',
    'setOwnProfileTab',
    'setSelectedSkillsCategory',
    't',
  ],
  handleDeleteOwnProfileOffer: ['t'],
  handleConfirmDeleteOwnProfileOffer: [
    'loadSkills',
    'selectedSkillsCategory',
    'setCustomCategories',
    'setIsSkillDescriptionModalOpen',
    'setSelectedSkillsCategory',
    'setStandardCategories',
    't',
    'user',
  ],
};

const INPUT_NAMES = Object.keys(CHANGED_INPUT) as Array<keyof HookInput>;
const HANDLER_NAMES = Object.keys(DEPENDENCIES) as HandlerName[];

const handlerInputPairs = (dependsOnInput: boolean) =>
  HANDLER_NAMES.flatMap((handler) =>
    INPUT_NAMES.filter((input) => DEPENDENCIES[handler].includes(input) === dependsOnInput).map(
      (input) => [handler, input] as [HandlerName, keyof HookInput],
    ),
  );

const handlerAfterInputChange = (handler: HandlerName, input: keyof HookInput) => {
  const mounted = mountHook();
  const before = mounted.result.current[handler];
  update(mounted, { [input]: CHANGED_INPUT[input]() } as Partial<HookInput>);
  return { before, after: mounted.result.current[handler] };
};

describe('obnovenie handlerov (memoizácia)', () => {
  it('pri rovnakých vstupoch ostávajú všetky tri handlery tie isté', () => {
    const mounted = mountHook();
    const before = { ...mounted.result.current };
    update(mounted, {});
    expect(mounted.result.current.handleEditOwnProfileOffer).toBe(before.handleEditOwnProfileOffer);
    expect(mounted.result.current.handleDeleteOwnProfileOffer).toBe(before.handleDeleteOwnProfileOffer);
    expect(mounted.result.current.handleConfirmDeleteOwnProfileOffer).toBe(
      before.handleConfirmDeleteOwnProfileOffer,
    );
  });

  it.each(handlerInputPairs(true))('%s sa obnoví pri zmene vstupu %s', (handler, input) => {
    const { before, after } = handlerAfterInputChange(handler, input);
    expect(after).not.toBe(before);
  });

  it.each(handlerInputPairs(false))('%s ostane ten istý pri zmene vstupu %s', (handler, input) => {
    const { before, after } = handlerAfterInputChange(handler, input);
    expect(after).toBe(before);
  });

  it('handleConfirmDeleteOwnProfileOffer: nový objekt používateľa s rovnakým id ho neobnoví', () => {
    const mounted = mountHook();
    const before = mounted.result.current.handleConfirmDeleteOwnProfileOffer;
    update(mounted, { user: { id: 1 } });
    expect(mounted.result.current.handleConfirmDeleteOwnProfileOffer).toBe(before);
  });

  it('handleConfirmDeleteOwnProfileOffer: nový objekt vybranej karty s rovnakým id ho neobnoví', () => {
    const mounted = mountHook({ selectedSkillsCategory: { id: 8 } });
    const before = mounted.result.current.handleConfirmDeleteOwnProfileOffer;
    update(mounted, { selectedSkillsCategory: { id: 8 } });
    expect(mounted.result.current.handleConfirmDeleteOwnProfileOffer).toBe(before);
  });

  it('po vyžiadaní zmazania sa obnoví len handler potvrdenia (mení sa čakajúca ponuka)', async () => {
    const mounted = mountHook();
    const confirmBefore = mounted.result.current.handleConfirmDeleteOwnProfileOffer;
    const deleteBefore = mounted.result.current.handleDeleteOwnProfileOffer;
    const editBefore = mounted.result.current.handleEditOwnProfileOffer;
    await askDelete(mounted, offer(5));
    expect(mounted.result.current.handleConfirmDeleteOwnProfileOffer).not.toBe(confirmBefore);
    expect(mounted.result.current.handleDeleteOwnProfileOffer).toBe(deleteBefore);
    expect(mounted.result.current.handleEditOwnProfileOffer).toBe(editBefore);
  });

  it('handler potvrdenia sa obnoví aj vtedy, keď sa začne mazať (mení sa isDeleting)', async () => {
    const request = deferred<unknown>();
    mockApiDelete.mockImplementation((...args: unknown[]) => {
      record('api.delete', ...args);
      return request.promise;
    });
    const mounted = mountHook();
    await askDelete(mounted, offer(5));
    const before = mounted.result.current.handleConfirmDeleteOwnProfileOffer;
    let running!: Promise<void>;
    act(() => {
      running = before();
    });
    expect(mounted.result.current.handleConfirmDeleteOwnProfileOffer).not.toBe(before);
    await act(async () => {
      request.resolve({});
      await running;
    });
  });
});

describe('nové hodnoty vstupov', () => {
  it('po zmene isMobile ide úprava inou cestou', async () => {
    const mounted = mountHook({ isMobile: false });
    update(mounted, { isMobile: true });
    await edit(mounted);
    expect(calls).toContain(entry('setActiveModule', 'skills-describe'));
    expect(calls).not.toContain(entry('setIsSkillDescriptionModalOpen', true));
  });

  it('po zmene t sa hlášky ukážu novým prekladačom', async () => {
    const mounted = mountHook();
    update(mounted, { t: (key: string) => `NOVÝ ${key}` });
    await edit(mounted, offerWithId(0));
    await askDelete(mounted, offerWithId(0));
    expect(calls).toEqual([
      entry('toast.error', 'NOVÝ skills.cardEditFailed'),
      entry('toast.error', 'NOVÝ skills.cardDeleteFailed'),
    ]);
  });

  it('po zmene používateľa a vybranej karty sa zmazanie viaže na nové hodnoty', async () => {
    const mounted = mountHook();
    await askDelete(mounted, offer(5));
    update(mounted, { user: { id: 2 }, selectedSkillsCategory: { id: 5 } });
    await confirmDelete(mounted);
    expect(calls).toContain(entry('invalidateOffersCache', 2));
    expect(calls).toContain(entry('dispatchProfileOffersRefresh', { ownerUserId: 2, deletedOfferId: 5 }));
    expect(calls).toContain(entry('setSelectedSkillsCategory', null));
  });

  it('po výmene setterov zoznamov a loadSkills zmazanie volá nové funkcie', async () => {
    const mounted = mountHook();
    await askDelete(mounted, offer(5));
    update(mounted, {
      setStandardCategories: spy('newSetStandard'),
      setCustomCategories: spy('newSetCustom'),
      loadSkills: spy('newLoadSkills', () => Promise.resolve()),
    });
    await confirmDelete(mounted);
    expect(calls).toEqual([
      entry('api.delete', '/skills/5/'),
      'newSetStandard(ƒ)',
      'newSetCustom(ƒ)',
      entry('invalidateOffersCache', 1),
      entry('dispatchProfileOffersRefresh', { ownerUserId: 1, deletedOfferId: 5 }),
      entry('toast.success', DELETE_SUCCESS),
      'newLoadSkills()',
    ]);
    expect(base.setStandardCategories).not.toHaveBeenCalled();
    expect(base.setCustomCategories).not.toHaveBeenCalled();
    expect(base.loadSkills).not.toHaveBeenCalled();
  });
});

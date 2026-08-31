/**
 * Čiastočný úspech pri vytváraní ponuky.
 *
 * POST prejde → ponuka v DB EXISTUJE. Keď zlyhá až niektorý z následných
 * krokov, nesmie to skončiť stavom, z ktorého sa používateľ nevie pohnúť:
 * rozpracovaná karta musí vedieť o svojom id (inak pošle druhý POST a dostane
 * duplicate_offer) a hláška nesmie tvrdiť, že uloženie zlyhalo.
 */

import { act, renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useSkillSaveHandler } from './useSkillSaveHandler';
import type { DashboardSkill } from './useSkillsModals';

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn(), patch: jest.fn(), get: jest.fn() },
  endpoints: {
    skills: { list: '/skills/', detail: (id: number) => `/skills/${id}/` },
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/offerImageUpload', () => ({ uploadOfferImage: jest.fn() }));

jest.mock('../modules/profile/profileOffersCache', () => ({
  invalidateOffersCache: jest.fn(),
}));

jest.mock('../modules/profile/profileOfferEvents', () => ({
  dispatchProfileOffersRefresh: jest.fn(),
}));

const mockedPost = api.post as jest.Mock;
const mockedPatch = api.patch as jest.Mock;
const mockedToastError = (toast as unknown as { error: jest.Mock }).error;

const draft = {
  category: 'IT',
  subcategory: 'Web',
  description: 'Popis',
  country_code: 'SK',
  district_code: 'nitra',
  district: 'Nitra',
  location: 'Nitra',
  is_seeking: false,
} as unknown as DashboardSkill;

function setup(overrides: Record<string, unknown> = {}) {
  const setSelectedSkillsCategory = jest.fn();
  const loadSkills = jest.fn();
  const { result } = renderHook(() =>
    useSkillSaveHandler({
      selectedSkillsCategory: draft,
      activeModule: 'skills-offer',
      setActiveModule: jest.fn(),
      toLocalSkill: (apiSkill: unknown) => apiSkill as DashboardSkill,
      applySkillUpdate: jest.fn(),
      loadSkills,
      fetchSkillDetail: jest.fn(),
      t: (_key: string, fallback: string) => fallback,
      setSelectedSkillsCategory,
      ...overrides,
    }),
  );
  return { save: result.current, setSelectedSkillsCategory, loadSkills };
}

/**
 * Harness so SKUTOČNÝM stavom: updater sa aplikuje na draft a hook sa
 * prerenderuje s výsledkom.
 *
 * Bez toho by sa dalo overiť len to, s akým updaterom sa setter zavolal –
 * nie to, či opakované uloženie naozaj pôjde PATCH-om. A práve to je pointa
 * opravy „zaseknutého modalu".
 */
function setupStateful(overrides: Record<string, unknown> = {}) {
  let current: DashboardSkill | null = { ...draft };
  const loadSkills = jest.fn();
  const setSelectedSkillsCategory = jest.fn(
    (updater: (prev: DashboardSkill | null) => DashboardSkill | null) => {
      current = updater(current);
    },
  );

  const { result, rerender } = renderHook(() =>
    useSkillSaveHandler({
      selectedSkillsCategory: current,
      activeModule: 'skills-offer',
      setActiveModule: jest.fn(),
      toLocalSkill: (apiSkill: unknown) => apiSkill as DashboardSkill,
      applySkillUpdate: jest.fn(),
      loadSkills,
      fetchSkillDetail: jest.fn().mockResolvedValue({ id: 77, images: [] }),
      t: (_key: string, fallback: string) => fallback,
      setSelectedSkillsCategory,
      ...overrides,
    }),
  );

  return {
    loadSkills,
    setSelectedSkillsCategory,
    getDraft: () => current,
    /** Prepne stav na inú, tiež ešte neuloženú kartu. */
    switchTo: (next: DashboardSkill | null) => {
      current = next;
      rerender();
    },
    /** Spustí uloženie bez čakania – na scenáre so súbežnou zmenou karty. */
    start: () => result.current(),
    save: async () => {
      await act(async () => {
        await result.current();
      });
      // Nový stav sa musí premietnuť do hooku, inak by druhé uloženie
      // bežalo nad zastaraným draftom a test by nič nedokazoval.
      rerender();
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('writes the created id into the draft right after the POST succeeds', async () => {
  mockedPost.mockResolvedValue({ data: { id: 77, category: 'IT' } });

  const { save, setSelectedSkillsCategory } = setup();
  await act(async () => {
    await save();
  });

  expect(setSelectedSkillsCategory).toHaveBeenCalledTimes(1);
  const updater = setSelectedSkillsCategory.mock.calls[0][0];
  expect(updater(draft)).toMatchObject({ id: 77 });
});

it('does not overwrite an id the draft already has', async () => {
  mockedPost.mockResolvedValue({ data: { id: 77, category: 'IT' } });

  const { save, setSelectedSkillsCategory } = setup();
  await act(async () => {
    await save();
  });

  const updater = setSelectedSkillsCategory.mock.calls[0][0];
  // Medzitým sa mohla otvoriť iná, už uložená karta – tej sa updater dotknúť
  // nesmie, inak by jej prepísal id odpoveďou z cudzieho uloženia.
  const otherCard = { ...draft, id: 12 } as unknown as DashboardSkill;
  expect(updater(otherCard)).toBe(otherCard);
  expect(updater(null)).toBeNull();
});

it('retries with a PATCH after a failed follow-up, never a second POST', async () => {
  mockedPost.mockResolvedValue({ data: { id: 77, category: 'IT' } });
  mockedPatch.mockResolvedValue({ data: { id: 77, category: 'IT' } });
  // Prvé uloženie vytvorí ponuku, ale nasledujúci krok spadne.
  const loadSkills = jest
    .fn()
    .mockRejectedValueOnce(new Error('sieť spadla'))
    .mockResolvedValue(undefined);

  const harness = setupStateful({ loadSkills });
  await harness.save();

  expect(harness.getDraft()).toMatchObject({ id: 77 });

  // Používateľ to skúsi znova.
  await harness.save();

  // Presne jeden POST (prvý pokus) a jeden PATCH (opakovanie) – dôkaz, že
  // druhý pokus použil už uložené id a nevytvoril duplicitu.
  expect(mockedPost).toHaveBeenCalledTimes(1);
  expect(mockedPatch).toHaveBeenCalledTimes(1);
  expect(mockedPatch.mock.calls[0][0]).toBe('/skills/77/');
});

it('does not hand the created id to a different card opened meanwhile', async () => {
  let releasePost: ((value: unknown) => void) | null = null;
  mockedPost.mockImplementation(
    () => new Promise((resolve) => {
      releasePost = resolve;
    }),
  );

  const harness = setupStateful();
  const pending = harness.start();

  // Kým POST visí, používateľ otvorí INÚ, tiež ešte neuloženú kartu.
  const otherDraft = {
    ...draft,
    category: 'Domácnosť',
    subcategory: 'Upratovanie',
  } as unknown as DashboardSkill;
  harness.switchTo(otherDraft);

  await act(async () => {
    releasePost?.({ data: { id: 77, category: 'IT' } });
    await pending;
  });

  // Cudzia karta nesmie dostať id z uloženia inej – inak by jej ďalšie
  // uloženie PATCH-lo ponuku, ktorú vôbec needituje.
  expect(harness.getDraft()).toBe(otherDraft);
  expect(harness.getDraft()).not.toHaveProperty('id', 77);
});

it('does not hand the created id to the same category in the opposite card type', async () => {
  let releasePost: ((value: unknown) => void) | null = null;
  mockedPost.mockImplementation(
    () =>
      new Promise((resolve) => {
        releasePost = resolve;
      }),
  );

  const harness = setupStateful();
  const pending = harness.start();
  const oppositeTypeDraft = {
    ...draft,
    is_seeking: true,
  } as unknown as DashboardSkill;
  harness.switchTo(oppositeTypeDraft);

  await act(async () => {
    releasePost?.({ data: { id: 77, category: 'IT', is_seeking: false } });
    await pending;
  });

  expect(harness.getDraft()).toBe(oppositeTypeDraft);
  expect(harness.getDraft()).not.toHaveProperty('id', 77);
});

it('stores the derived type on an untyped draft before creating it', async () => {
  mockedPost.mockResolvedValue({
    data: { id: 77, category: 'IT', subcategory: 'Web', is_seeking: true },
  });

  const harness = setupStateful({ activeModule: 'skills-search' });
  await harness.save();

  expect(harness.getDraft()).toMatchObject({ id: 77, is_seeking: true });
  expect(mockedPost.mock.calls[0][1]).toMatchObject({ is_seeking: true });
});

it('keeps the draft usable when a follow-up step fails after creation', async () => {
  mockedPost.mockResolvedValue({ data: { id: 77, category: 'IT' } });
  const loadSkills = jest.fn().mockRejectedValue(new Error('sieť spadla'));

  const { save, setSelectedSkillsCategory } = setup({ loadSkills });
  await act(async () => {
    await save();
  });

  // Id je v drafte → opakovanie pôjde PATCH-om, nie druhým POST-om.
  expect(setSelectedSkillsCategory).toHaveBeenCalledTimes(1);
  expect(
    setSelectedSkillsCategory.mock.calls[0][0](draft),
  ).toMatchObject({ id: 77 });

  // A hláška nesmie tvrdiť, že sa karta neuložila.
  expect(mockedToastError).toHaveBeenCalledWith(
    'Karta je uložená, no zoznam sa nepodarilo obnoviť. Obnov stránku.',
  );
  // Iba jeden POST – žiadny automatický druhý pokus.
  expect(mockedPost).toHaveBeenCalledTimes(1);
});

it('still reports a real failure when the POST itself fails', async () => {
  mockedPost.mockRejectedValue(new Error('nope'));

  const { save, setSelectedSkillsCategory } = setup();
  await act(async () => {
    await save();
  });

  expect(setSelectedSkillsCategory).not.toHaveBeenCalled();
  expect(mockedToastError).toHaveBeenCalled();
  expect(mockedToastError.mock.calls[0][0]).not.toContain('je uložená');
});

it('shows the translated card-limit toast when the backend rejects a stale client count', async () => {
  mockedPost.mockRejectedValue({
    response: { data: { code: 'offer_limit_reached' } },
  });

  const { save } = setup();
  await act(async () => {
    await save();
  });

  expect(mockedToastError).toHaveBeenCalledWith(
    'Môžeš mať maximálne 3 karty v tejto sekcii.',
  );
});

it.each([
  ['offer', 'skills-offer', false],
  ['request', 'skills-search', true],
])(
  'keeps a new %s draft open and skips the API when its country is missing',
  async (_label, activeModule, isSeeking) => {
    const setActiveModule = jest.fn();
    const selectedSkillsCategory = {
      ...draft,
      country_code: '',
      district_code: '',
      district: '',
      location: '',
      is_seeking: isSeeking,
    } as DashboardSkill;
    const { save } = setup({
      selectedSkillsCategory,
      activeModule,
      setActiveModule,
    });

    await act(async () => {
      await save();
    });

    expect(mockedPost).not.toHaveBeenCalled();
    expect(setActiveModule).not.toHaveBeenCalled();
    expect(mockedToastError).toHaveBeenCalledWith(
      'Vyber krajinu ponuky alebo dopytu.',
    );
  },
);

it('keeps a legacy saved offer editable when its country is still empty', async () => {
  const selectedSkillsCategory = {
    ...draft,
    id: 42,
    country_code: '',
    district_code: '',
    district: '',
    location: '',
  } as DashboardSkill;
  mockedPatch.mockResolvedValue({ data: selectedSkillsCategory });
  const { save } = setup({ selectedSkillsCategory });

  await act(async () => {
    await save();
  });

  expect(mockedPatch).toHaveBeenCalledWith(
    '/skills/42/',
    expect.objectContaining({ country_code: '' }),
  );
  expect(mockedPost).not.toHaveBeenCalled();
});

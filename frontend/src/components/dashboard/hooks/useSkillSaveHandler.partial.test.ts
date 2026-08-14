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
const mockedToastError = (toast as unknown as { error: jest.Mock }).error;

const draft = {
  category: 'IT',
  subcategory: 'Web',
  description: 'Popis',
  country_code: 'SK',
  district_code: 'nitra',
  district: 'Nitra',
  location: 'Nitra',
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

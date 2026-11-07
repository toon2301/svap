/**
 * Mobilné uloženie karty, keď sa nová fotka nenahrá (nález 293): karta ostane uložená a chyba fotky sa len oznámi
 * toastom. Chyba sa nesmie hlásiť ako neúspešné uloženie, inak by používateľ ponuku vytváral znova a narazil by na
 * `duplicate_offer`. Rovnaké správanie má mať aj okno ponúk (`DashboardModals`).
 */

import { act, renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { uploadOfferImage } from '@/lib/offerImageUpload';
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
jest.mock('./offerImageRefresh', () => ({ startBoundedImageRefresh: jest.fn() }));
jest.mock('../modules/profile/profileOffersRefresh', () => ({ scheduleProfileOffersRefresh: jest.fn() }));
jest.mock('../modules/profile/profileOffersCache', () => ({ invalidateOffersCache: jest.fn() }));
jest.mock('../modules/profile/profileOfferEvents', () => ({ dispatchProfileOffersRefresh: jest.fn() }));

const mockedUpload = uploadOfferImage as jest.Mock;
const mockedToastError = toast.error as jest.Mock;

const baseCard = {
  category: 'IT',
  subcategory: 'Web',
  description: 'Popis',
  country_code: 'SK',
  district_code: 'nitra',
  district: 'Nitra',
  location: 'Nitra',
  is_seeking: false,
};

const SAVE_FAILED_TEXT = 'Ponuku sa nepodarilo uložiť. Skús to znova.';

/** Dve nové fotky, aby sa dalo overiť poradie v texte chyby aj to, že zlyhanie jednej nezastaví ďalšie. */
const twoImages = () => [
  new File(['a'], 'prva.png', { type: 'image/png' }),
  new File(['b'], 'druha.png', { type: 'image/png' }),
];

/** Uloží kartu cez mobilný handler a vráti, čo sa po uložení stalo. */
async function saveCard(selected: Record<string, unknown>, savedId: number) {
  const fetchSkillDetail = jest.fn().mockResolvedValue({ ...baseCard, id: savedId, images: [] });
  const applySkillUpdate = jest.fn();
  const { result } = renderHook(() =>
    useSkillSaveHandler({
      selectedSkillsCategory: selected as unknown as DashboardSkill,
      activeModule: 'skills-offer',
      setActiveModule: jest.fn(),
      toLocalSkill: (apiSkill: unknown) => apiSkill as DashboardSkill,
      applySkillUpdate,
      loadSkills: jest.fn(),
      fetchSkillDetail,
      t: (_key: string, fallback: string) => fallback,
      setSelectedSkillsCategory: jest.fn(),
    }),
  );
  await act(async () => {
    await result.current();
  });
  return { fetchSkillDetail, applySkillUpdate };
}

const SCENARIOS = [
  {
    label: 'úprava existujúcej karty',
    selected: { ...baseCard, id: 7, _newImages: twoImages() },
    mockSave: () => (api.patch as jest.Mock).mockResolvedValue({ data: { ...baseCard, id: 7 } }),
    savedId: 7,
  },
  {
    label: 'vytvorenie novej karty',
    selected: { ...baseCard, _newImages: twoImages() },
    mockSave: () => (api.post as jest.Mock).mockResolvedValue({ data: { ...baseCard, id: 12 } }),
    savedId: 12,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockedUpload.mockReset();
});

describe.each(SCENARIOS)('mobilné uloženie: $label', ({ selected, mockSave, savedId }) => {
  beforeEach(() => {
    mockSave();
  });

  it('chyba prvej fotky sa oznámi toastom s dôvodom a druhá fotka sa nahrá', async () => {
    mockedUpload
      .mockRejectedValueOnce({ response: { data: { error: 'Neplatný typ súboru.' } } })
      .mockResolvedValueOnce(undefined);

    const { fetchSkillDetail } = await saveCard(selected, savedId);

    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Chyba pri nahrávaní obrázka 1: Neplatný typ súboru.');
    expect(mockedToastError).not.toHaveBeenCalledWith(SAVE_FAILED_TEXT);
    expect(mockedUpload).toHaveBeenCalledTimes(2);
    expect(fetchSkillDetail).toHaveBeenCalledTimes(1);
  });

  it('pri odmietnutí moderáciou ukáže hlášku o nevhodnom obsahu', async () => {
    mockedUpload
      .mockRejectedValueOnce({ response: { data: { code: 'image_moderation_rejected', error: 'x' } } })
      .mockResolvedValueOnce(undefined);

    await saveCard(selected, savedId);

    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Fotka nebola prijatá kvôli nevhodnému obsahu.');
  });

  it('v texte chyby je poradie fotky, ktorá zlyhala', async () => {
    mockedUpload
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ response: { data: { error: 'Súbor je príliš veľký.' } } });

    await saveCard(selected, savedId);

    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Chyba pri nahrávaní obrázka 2: Súbor je príliš veľký.');
  });

  it('keď zlyhajú obe fotky, každá dostane vlastný toast a karta ostane uložená', async () => {
    mockedUpload.mockRejectedValue(new Error('Network Error'));

    const { applySkillUpdate } = await saveCard(selected, savedId);

    expect(mockedToastError.mock.calls.map(([text]) => text)).toEqual([
      'Chyba pri nahrávaní obrázka 1: Network Error',
      'Chyba pri nahrávaní obrázka 2: Network Error',
    ]);
    expect(applySkillUpdate).toHaveBeenCalled();
  });
});

/**
 * Mobilné uloženie karty s novými fotkami: nové fotky čakajú na spracovanie,
 * preto sa po skončení sledovania ich stavu musí obnoviť aj zoznam ponúk na profile.
 */

import { act, renderHook } from '@testing-library/react';
import { api } from '@/lib/api';
import { useSkillSaveHandler } from './useSkillSaveHandler';
import { startBoundedImageRefresh } from './offerImageRefresh';
import type { DashboardSkill } from './useSkillsModals';
import { scheduleProfileOffersRefresh } from '../modules/profile/profileOffersRefresh';

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

jest.mock('@/lib/offerImageUpload', () => ({ uploadOfferImage: jest.fn().mockResolvedValue(undefined) }));
jest.mock('./offerImageRefresh', () => ({ startBoundedImageRefresh: jest.fn() }));
jest.mock('../modules/profile/profileOffersRefresh', () => ({ scheduleProfileOffersRefresh: jest.fn() }));

jest.mock('../modules/profile/profileOffersCache', () => ({
  invalidateOffersCache: jest.fn(),
}));

jest.mock('../modules/profile/profileOfferEvents', () => ({
  dispatchProfileOffersRefresh: jest.fn(),
}));

const OWNER_ID = 5;
const mockedPost = api.post as jest.Mock;
const mockedPatch = api.patch as jest.Mock;
const mockedStartRefresh = startBoundedImageRefresh as jest.Mock;
const mockedSchedule = scheduleProfileOffersRefresh as jest.Mock;

const newImage = () => new File(['x'], 'nova.png', { type: 'image/png' });

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

async function saveCard(selected: Record<string, unknown>, fetchedId: number) {
  const fetchSkillDetail = jest.fn().mockResolvedValue({
    ...baseCard,
    id: fetchedId,
    images: [{ id: 1, image_url: null, status: 'pending' }],
  });
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
      ownerUserIdForOffersCache: OWNER_ID,
      setSelectedSkillsCategory: jest.fn(),
    }),
  );
  await act(async () => {
    await result.current();
  });
  return { fetchSkillDetail, applySkillUpdate };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('pri úprave karty s novou fotkou odovzdá sledovaniu fotiek funkciu, ktorá obnoví profil', async () => {
  mockedPatch.mockResolvedValue({ data: { ...baseCard, id: 7 } });

  const { fetchSkillDetail, applySkillUpdate } = await saveCard(
    { ...baseCard, id: 7, _newImages: [newImage()] },
    7,
  );

  expect(mockedStartRefresh).toHaveBeenCalledTimes(1);
  const [skillId, fetchDetail, applyUpdate, onSettled] = mockedStartRefresh.mock.calls[0];
  expect(skillId).toBe(7);
  expect(fetchDetail).toBe(fetchSkillDetail);
  expect(applyUpdate).toBe(applySkillUpdate);
  expect(typeof onSettled).toBe('function');

  mockedSchedule.mockClear();
  onSettled();
  expect(mockedSchedule).toHaveBeenCalledTimes(1);
  expect(mockedSchedule).toHaveBeenCalledWith(OWNER_ID);
});

it('pri vytvorení karty s novou fotkou odovzdá sledovaniu fotiek funkciu, ktorá obnoví profil', async () => {
  mockedPost.mockResolvedValue({ data: { ...baseCard, id: 12 } });

  const { fetchSkillDetail, applySkillUpdate } = await saveCard(
    { ...baseCard, _newImages: [newImage()] },
    12,
  );

  expect(mockedStartRefresh).toHaveBeenCalledTimes(1);
  const [skillId, fetchDetail, applyUpdate, onSettled] = mockedStartRefresh.mock.calls[0];
  expect(skillId).toBe(12);
  expect(fetchDetail).toBe(fetchSkillDetail);
  expect(applyUpdate).toBe(applySkillUpdate);
  expect(typeof onSettled).toBe('function');

  mockedSchedule.mockClear();
  onSettled();
  expect(mockedSchedule).toHaveBeenCalledTimes(1);
  expect(mockedSchedule).toHaveBeenCalledWith(OWNER_ID);
});

it('bez nových fotiek sledovanie fotiek nespustí', async () => {
  mockedPatch.mockResolvedValue({ data: { ...baseCard, id: 7 } });

  await saveCard({ ...baseCard, id: 7 }, 7);

  expect(mockedStartRefresh).not.toHaveBeenCalled();
});

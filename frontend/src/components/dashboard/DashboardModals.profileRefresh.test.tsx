import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/api';
import type { User } from '@/types';
import DashboardModals from './DashboardModals';
import { startBoundedImageRefresh } from './hooks/offerImageRefresh';
import type { DashboardSkill, UseSkillsModalsResult } from './hooks/useSkillsModals';
import { PROFILE_OFFERS_REFRESH_EVENT } from './modules/profile/profileOfferEvents';
import {
  getOffersFromCache,
  makeOffersCacheKey,
  setOffersToCache,
} from './modules/profile/profileOffersCache';
import type { Offer } from './modules/profile/profileOffersTypes';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ refreshUser: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn(), patch: jest.fn(), get: jest.fn(), delete: jest.fn() },
  endpoints: {
    skills: { list: '/skills/', detail: (id: number) => `/skills/${id}/` },
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('./modules/accountType/AccountTypeModal', () => () => null);
jest.mock('./modules/accountType/PersonalAccountModal', () => () => null);
jest.mock('./modules/skills/SkillsCategoryModal', () => () => null);
jest.mock('./modules/skills/AddCustomCategoryModal', () => () => null);
jest.mock('@/lib/offerImageUpload', () => ({ uploadOfferImage: jest.fn().mockResolvedValue(undefined) }));
jest.mock('./hooks/offerImageRefresh', () => ({ startBoundedImageRefresh: jest.fn() }));

const OWNER_ID = 5;
const OFFERS_CACHE_KEY = makeOffersCacheKey(OWNER_ID);
const EVENT_WAIT = { timeout: 2000 };

const mockedPatch = api.patch as jest.Mock;
const mockedStartRefresh = startBoundedImageRefresh as jest.Mock;

const editedSkill = (): DashboardSkill => ({
  id: 7,
  category: 'Remeslá',
  subcategory: 'Maľovanie',
  description: 'Popis ponuky',
  country_code: 'SK',
  district_code: 'bratislava-i',
  images: [
    { id: 1, image_url: 'https://cdn.example.com/a.webp', status: 'approved' },
    { id: 2, image_url: 'https://cdn.example.com/b.webp', status: 'approved' },
  ],
});

let log: string[];

function createSkillsState(selected: DashboardSkill): UseSkillsModalsResult {
  return {
    selectedSkillsCategory: selected,
    setSelectedSkillsCategory: jest.fn(),
    standardCategories: [],
    setStandardCategories: jest.fn(),
    customCategories: [],
    setCustomCategories: jest.fn(),
    isSkillsCategoryModalOpen: false,
    setIsSkillsCategoryModalOpen: jest.fn(),
    isSkillDescriptionModalOpen: true,
    setIsSkillDescriptionModalOpen: jest.fn(),
    isAddCustomCategoryModalOpen: false,
    setIsAddCustomCategoryModalOpen: jest.fn(),
    editingCustomCategoryIndex: null,
    setEditingCustomCategoryIndex: jest.fn(),
    editingStandardCategoryIndex: null,
    setEditingStandardCategoryIndex: jest.fn(),
    toLocalSkill: (skill) => skill as DashboardSkill,
    applySkillUpdate: jest.fn(),
    loadSkills: jest.fn().mockResolvedValue(undefined),
    fetchSkillDetail: jest.fn(),
    handleRemoveSkillImage: jest.fn(),
    removeStandardCategory: jest.fn(),
    removeCustomCategory: jest.fn(),
  };
}

function renderEditWindow(skillsState: UseSkillsModalsResult) {
  return render(
    <DashboardModals
      accountType="personal"
      setAccountType={jest.fn()}
      isAccountTypeModalOpen={false}
      setIsAccountTypeModalOpen={jest.fn()}
      isPersonalAccountModalOpen={false}
      setIsPersonalAccountModalOpen={jest.fn()}
      skillsState={skillsState}
      activeModule="skills-offer"
      t={(_key, fallback) => fallback}
      user={{ id: OWNER_ID } as User}
    />,
  );
}

const onRefreshEvent = () => {
  log.push('event');
};

beforeEach(() => {
  jest.clearAllMocks();
  log = [];
  mockedPatch.mockImplementation(async () => {
    log.push('patch');
    return { data: editedSkill() };
  });
  window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, onRefreshEvent);
});

afterEach(() => {
  window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, onRefreshEvent);
});

describe('okno úpravy ponuky – obnova zoznamu ponúk na profile po zmene fotiek', () => {
  it('po zmazaní fotky obnoví profil AŽ po skutočnom zmazaní na serveri', async () => {
    const skillsState = createSkillsState(editedSkill());
    (skillsState.handleRemoveSkillImage as jest.Mock).mockImplementation(async (_skillId, imageId) => {
      log.push(`delete:${imageId}`);
      // Profil, ktorý by sa medzitým načítal, by ešte mohol vrátiť starý zoznam do cache.
      setOffersToCache(OFFERS_CACHE_KEY, [{ id: 7 } as Offer]);
      return [];
    });
    renderEditWindow(skillsState);

    fireEvent.click(screen.getAllByLabelText('Odstrániť existujúcu fotku')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => {
      const deleted = log.indexOf('delete:1');
      expect(deleted).toBeGreaterThan(-1);
      expect(log.lastIndexOf('event')).toBeGreaterThan(deleted);
    }, EVENT_WAIT);
    expect(skillsState.handleRemoveSkillImage).toHaveBeenCalledWith(7, 1);
    expect(log.indexOf('patch')).toBeLessThan(log.indexOf('delete:1'));
    expect(getOffersFromCache(OFFERS_CACHE_KEY)).toBeUndefined();
  });

  it('pri pomalom zmazaní fotky obnovenie odíde až po jeho dokončení', async () => {
    const skillsState = createSkillsState(editedSkill());
    (skillsState.handleRemoveSkillImage as jest.Mock).mockImplementation(async (_skillId, imageId) => {
      // Zmazanie trvá dlhšie, než je čakanie na zlúčenie obnovení.
      await new Promise((resolve) => setTimeout(resolve, 450));
      log.push(`delete:${imageId}`);
      return [];
    });
    renderEditWindow(skillsState);

    fireEvent.click(screen.getAllByLabelText('Odstrániť existujúcu fotku')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => {
      const deleted = log.indexOf('delete:1');
      expect(deleted).toBeGreaterThan(-1);
      expect(log.lastIndexOf('event')).toBeGreaterThan(deleted);
    }, EVENT_WAIT);
  });

  it('pri viacerých zmazaných fotkách pošle po poslednom zmazaní jedno obnovenie', async () => {
    const skillsState = createSkillsState(editedSkill());
    (skillsState.handleRemoveSkillImage as jest.Mock).mockImplementation(async (_skillId, imageId) => {
      log.push(`delete:${imageId}`);
      return [];
    });
    renderEditWindow(skillsState);

    const removeButtons = screen.getAllByLabelText('Odstrániť existujúcu fotku');
    fireEvent.click(removeButtons[0]);
    fireEvent.click(screen.getAllByLabelText('Odstrániť existujúcu fotku')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => {
      const lastDeleted = log.indexOf('delete:2');
      expect(lastDeleted).toBeGreaterThan(-1);
      expect(log.lastIndexOf('event')).toBeGreaterThan(lastDeleted);
    }, EVENT_WAIT);
    const afterFirstDelete = log.slice(log.indexOf('delete:1'));
    expect(afterFirstDelete.filter((entry) => entry === 'event')).toHaveLength(1);
  });

  it('ak zmazanie fotky zlyhá, žiadne ďalšie obnovenie neodíde', async () => {
    const skillsState = createSkillsState(editedSkill());
    (skillsState.handleRemoveSkillImage as jest.Mock).mockImplementation(async (_skillId, imageId) => {
      log.push(`delete:${imageId}`);
      throw new Error('Odstránenie obrázka zlyhalo');
    });
    renderEditWindow(skillsState);

    fireEvent.click(screen.getAllByLabelText('Odstrániť existujúcu fotku')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => expect(log).toContain('delete:1'));
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(log.slice(log.indexOf('delete:1'))).toEqual(['delete:1']);
  });

  it('uloženie bez zmazaných fotiek pošle len obnovenie z uloženia', async () => {
    const skillsState = createSkillsState(editedSkill());
    renderEditWindow(skillsState);

    fireEvent.click(screen.getByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => expect(log).toContain('event'));
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(log.filter((entry) => entry === 'event')).toHaveLength(1);
    expect(skillsState.handleRemoveSkillImage).not.toHaveBeenCalled();
  });

  it('po pridaní fotky odovzdá načítaniu čakajúcich fotiek funkciu, ktorá obnoví profil', async () => {
    const skillsState = createSkillsState(editedSkill());
    (skillsState.fetchSkillDetail as jest.Mock).mockResolvedValue({
      ...editedSkill(),
      images: [{ id: 3, image_url: null, status: 'pending' }],
    });
    URL.createObjectURL = jest.fn(() => 'blob:preview');
    const { container } = renderEditWindow(skillsState);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'nova.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aktualizovať' }));

    await waitFor(() => expect(mockedStartRefresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(skillsState.setIsSkillDescriptionModalOpen).toHaveBeenCalledWith(false));
    const onSettled = mockedStartRefresh.mock.calls[0][3];
    expect(typeof onSettled).toBe('function');

    setOffersToCache(OFFERS_CACHE_KEY, [{ id: 7 } as Offer]);
    const eventsBefore = log.filter((entry) => entry === 'event').length;
    onSettled();

    expect(getOffersFromCache(OFFERS_CACHE_KEY)).toBeUndefined();
    await waitFor(() => {
      expect(log.filter((entry) => entry === 'event').length).toBeGreaterThan(eventsBefore);
    }, EVENT_WAIT);
  });
});

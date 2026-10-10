import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/api';
import type { User } from '@/types';
import DashboardModals from './DashboardModals';
import { startBoundedImageRefresh } from './hooks/offerImageRefresh';
import type { DashboardSkill, UseSkillsModalsResult } from './hooks/useSkillsModals';
import { scheduleProfileOffersRefresh } from './modules/profile/profileOffersRefresh';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ refreshUser: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn(), patch: jest.fn() },
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
jest.mock('./modules/profile/profileOffersRefresh', () => ({ scheduleProfileOffersRefresh: jest.fn() }));

jest.mock('./modules/skills/SkillDescriptionModal', () => ({
  __esModule: true,
  default: (props: { isOpen: boolean; onSave: (...args: unknown[]) => Promise<void> }) =>
    props.isOpen ? (
      <button
        type="button"
        onClick={() => {
          void props
            .onSave(
              'Maľovanie stien',
              undefined,
              [],
              [new File(['x'], 'nova.png', { type: 'image/png' })],
              null,
              '€',
              false,
              '',
              '',
              undefined,
              '',
              'SK',
              'bratislava-i',
              'low',
              null,
              false,
            )
            .catch(() => undefined);
        }}
      >
        Uložiť testovaciu kartu
      </button>
    ) : null,
}));

const OWNER_ID = 5;
const mockedPost = api.post as jest.Mock;
const mockedPatch = api.patch as jest.Mock;
const mockedStartRefresh = startBoundedImageRefresh as jest.Mock;
const mockedSchedule = scheduleProfileOffersRefresh as jest.Mock;

type Scenario = {
  label: string;
  selected: DashboardSkill;
  editingCustomCategoryIndex: number | null;
  customCategories: DashboardSkill[];
  api: 'patch' | 'post';
  savedId: number;
};

const SCENARIOS: Scenario[] = [
  {
    label: 'úprava vlastnej karty zo zoznamu vlastných kariet',
    selected: { category: 'Vlastná', subcategory: 'Vlastná' },
    editingCustomCategoryIndex: 0,
    customCategories: [{ id: 11, category: 'Vlastná', subcategory: 'Vlastná' }],
    api: 'patch',
    savedId: 11,
  },
  {
    label: 'prvé uloženie vlastnej karty na mieste v zozname',
    selected: { category: 'Vlastná', subcategory: 'Vlastná' },
    editingCustomCategoryIndex: 0,
    customCategories: [{ category: 'Vlastná', subcategory: 'Vlastná' }],
    api: 'post',
    savedId: 12,
  },
  {
    label: 'úprava existujúcej karty',
    selected: { id: 7, category: 'Remeslá', subcategory: 'Maľovanie' },
    editingCustomCategoryIndex: null,
    customCategories: [],
    api: 'patch',
    savedId: 7,
  },
  {
    label: 'nová vlastná karta',
    selected: { category: 'Vlastná', subcategory: 'Vlastná' },
    editingCustomCategoryIndex: null,
    customCategories: [],
    api: 'post',
    savedId: 13,
  },
  {
    label: 'nová štandardná karta',
    selected: { category: 'Remeslá', subcategory: 'Maľovanie' },
    editingCustomCategoryIndex: null,
    customCategories: [],
    api: 'post',
    savedId: 14,
  },
];

function createSkillsState(scenario: Scenario): UseSkillsModalsResult {
  return {
    selectedSkillsCategory: scenario.selected,
    setSelectedSkillsCategory: jest.fn(),
    standardCategories: [],
    setStandardCategories: jest.fn(),
    customCategories: scenario.customCategories,
    setCustomCategories: jest.fn(),
    isSkillsCategoryModalOpen: false,
    setIsSkillsCategoryModalOpen: jest.fn(),
    isSkillDescriptionModalOpen: true,
    setIsSkillDescriptionModalOpen: jest.fn(),
    isAddCustomCategoryModalOpen: false,
    setIsAddCustomCategoryModalOpen: jest.fn(),
    editingCustomCategoryIndex: scenario.editingCustomCategoryIndex,
    setEditingCustomCategoryIndex: jest.fn(),
    editingStandardCategoryIndex: null,
    setEditingStandardCategoryIndex: jest.fn(),
    toLocalSkill: (skill) => skill as DashboardSkill,
    applySkillUpdate: jest.fn(),
    loadSkills: jest.fn().mockResolvedValue(undefined),
    fetchSkillDetail: jest.fn().mockResolvedValue({
      id: scenario.savedId,
      category: scenario.selected.category,
      subcategory: scenario.selected.subcategory,
      images: [{ id: 99, image_url: null, status: 'pending' }],
    }),
    handleRemoveSkillImage: jest.fn(),
    removeStandardCategory: jest.fn(),
    removeCustomCategory: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it.each(SCENARIOS)(
  'po uložení karty s novou fotkou ($label) odovzdá načítaniu čakajúcich fotiek funkciu, ktorá obnoví profil',
  async (scenario) => {
    const saved = {
      id: scenario.savedId,
      category: scenario.selected.category,
      subcategory: scenario.selected.subcategory,
    };
    mockedPatch.mockResolvedValue({ data: saved });
    mockedPost.mockResolvedValue({ data: saved });
    const skillsState = createSkillsState(scenario);
    render(
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

    fireEvent.click(screen.getByRole('button', { name: 'Uložiť testovaciu kartu' }));

    await waitFor(() => expect(mockedStartRefresh).toHaveBeenCalledTimes(1));
    expect(scenario.api === 'patch' ? mockedPatch : mockedPost).toHaveBeenCalledTimes(1);
    const [skillId, fetchDetail, applyUpdate, onSettled] = mockedStartRefresh.mock.calls[0];
    expect(skillId).toBe(scenario.savedId);
    expect(fetchDetail).toBe(skillsState.fetchSkillDetail);
    expect(applyUpdate).toBe(skillsState.applySkillUpdate);
    expect(typeof onSettled).toBe('function');

    await waitFor(() => expect(skillsState.setIsSkillDescriptionModalOpen).toHaveBeenCalledWith(false));
    mockedSchedule.mockClear();
    onSettled();

    expect(mockedSchedule).toHaveBeenCalledTimes(1);
    expect(mockedSchedule).toHaveBeenCalledWith(OWNER_ID);
  },
);

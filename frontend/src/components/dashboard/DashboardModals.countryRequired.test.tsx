import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import DashboardModals from './DashboardModals';
import type { DashboardSkill, UseSkillsModalsResult } from './hooks/useSkillsModals';

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
jest.mock('@/lib/offerImageUpload', () => ({ uploadOfferImage: jest.fn() }));
jest.mock('./hooks/offerImageRefresh', () => ({ startBoundedImageRefresh: jest.fn() }));
jest.mock('./modules/profile/profileOfferEvents', () => ({ dispatchProfileOffersRefresh: jest.fn() }));

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
              [],
              null,
              '€',
              false,
              '',
              '',
              undefined,
              '',
              '',
              '',
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

const mockedPost = api.post as jest.Mock;
const mockedPatch = api.patch as jest.Mock;
const mockedToastError = (toast as unknown as { error: jest.Mock }).error;

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

function renderDashboardModals(selected: DashboardSkill) {
  const skillsState = createSkillsState(selected);
  render(
    <DashboardModals
      accountType="personal"
      setAccountType={jest.fn()}
      isAccountTypeModalOpen={false}
      setIsAccountTypeModalOpen={jest.fn()}
      isPersonalAccountModalOpen={false}
      setIsPersonalAccountModalOpen={jest.fn()}
      skillsState={skillsState}
      activeModule={selected.is_seeking ? 'skills-search' : 'skills-offer'}
      t={(_key, fallback) => fallback}
      user={null}
    />,
  );
  return skillsState;
}

beforeEach(() => {
  jest.clearAllMocks();
});

it.each([
  ['offer', false],
  ['request', true],
])('blocks a new desktop %s without a country', async (_label, isSeeking) => {
  const skillsState = renderDashboardModals({
    category: 'Remeslá',
    subcategory: 'Maliar',
    country_code: '',
    is_seeking: isSeeking,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Uložiť testovaciu kartu' }));

  await waitFor(() => {
    expect(mockedToastError).toHaveBeenCalledWith(
      'Vyber krajinu ponuky alebo dopytu.',
    );
  });
  expect(mockedPost).not.toHaveBeenCalled();
  expect(skillsState.setIsSkillDescriptionModalOpen).not.toHaveBeenCalledWith(false);
});

it('allows a desktop legacy card without a country to remain editable', async () => {
  const saved = {
    id: 42,
    category: 'Domácnosť',
    subcategory: 'Upratovanie',
    country_code: '',
  } as DashboardSkill;
  mockedPatch.mockResolvedValue({ data: saved });
  renderDashboardModals(saved);

  fireEvent.click(screen.getByRole('button', { name: 'Uložiť testovaciu kartu' }));

  await waitFor(() => {
    expect(mockedPatch).toHaveBeenCalledWith(
      '/skills/42/',
      expect.objectContaining({ country_code: '' }),
    );
  });
  expect(mockedPost).not.toHaveBeenCalled();
  expect(mockedToastError).not.toHaveBeenCalledWith(
    'Vyber krajinu ponuky alebo dopytu.',
  );
});

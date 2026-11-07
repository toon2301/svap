/**
 * Okno ponúk, keď sa nová fotka nenahrá (nález 293). Predtým sa ukázalo natívne okno prehliadača `alert()` s
 * doslovným textom bez prekladu a chyba sa hodila ďalej, takže sa ukázal ešte toast „Ponuku sa nepodarilo uložiť“,
 * hoci ponuka už bola uložená. Teraz sa chyba fotky oznámi toastom (rovnako ako v mobilnej úprave), ponuka sa dokončí
 * a okno sa zavrie.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { uploadOfferImage } from '@/lib/offerImageUpload';
import type { User } from '@/types';
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
jest.mock('./modules/profile/profileOffersRefresh', () => ({ scheduleProfileOffersRefresh: jest.fn() }));

/** Ako skončilo uloženie z pohľadu okna: `onSave` sa buď vyriešil, alebo odmietol (okno vtedy ostane otvorené). */
let mockSaveOutcome: 'pending' | 'resolved' | 'rejected' = 'pending';

jest.mock('./modules/skills/SkillDescriptionModal', () => ({
  __esModule: true,
  default: (props: { isOpen: boolean; onSave: (...args: unknown[]) => Promise<void> }) =>
    props.isOpen ? (
      <button
        type="button"
        onClick={() => {
          mockSaveOutcome = 'pending';
          props
            .onSave(
              'Maľovanie stien',
              undefined,
              [],
              [
                new File(['a'], 'prva.png', { type: 'image/png' }),
                new File(['b'], 'druha.png', { type: 'image/png' }),
              ],
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
            .then(
              () => {
                mockSaveOutcome = 'resolved';
              },
              () => {
                mockSaveOutcome = 'rejected';
              },
            );
        }}
      >
        Uložiť testovaciu kartu
      </button>
    ) : null,
}));

const mockedPost = api.post as jest.Mock;
const mockedPatch = api.patch as jest.Mock;
const mockedUpload = uploadOfferImage as jest.Mock;
const mockedToastError = toast.error as jest.Mock;

const SAVE_FAILED_TEXT = 'Ponuku sa nepodarilo uložiť. Skús to znova.';

type Scenario = {
  label: string;
  selected: DashboardSkill;
  editingCustomCategoryIndex: number | null;
  customCategories: DashboardSkill[];
  api: 'patch' | 'post';
  savedId: number;
};

/** Všetkých päť ciest, ktoré po uložení karty nahrávajú fotky (každá volala `uploadImagesIfNeeded`). */
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

/** Stav okien ponúk s mockmi, ktoré si test môže po uložení skontrolovať. */
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
      images: [],
    }),
    handleRemoveSkillImage: jest.fn(),
    removeStandardCategory: jest.fn(),
    removeCustomCategory: jest.fn(),
  };
}

/** Vykreslí okná ponúk pre daný scenár, klikne na uloženie a počká, kým sa okno s popisom zavrie alebo uloženie skončí. */
async function saveScenario(scenario: Scenario) {
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
      user={{ id: 5 } as User}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Uložiť testovaciu kartu' }));
  await waitFor(() => expect(mockSaveOutcome).not.toBe('pending'));
  return skillsState;
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUpload.mockReset();
  mockSaveOutcome = 'pending';
  alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe.each(SCENARIOS)('okno ponúk, chyba fotky: $label', (scenario) => {
  it('ukáže toast s dôvodom, nie natívne okno, a ponuku dokončí aj s druhou fotkou', async () => {
    mockedUpload
      .mockRejectedValueOnce({ response: { data: { error: 'Neplatný typ súboru.' } } })
      .mockResolvedValueOnce(undefined);

    const skillsState = await saveScenario(scenario);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Chyba pri nahrávaní obrázka 1: Neplatný typ súboru.');
    expect(mockedToastError).not.toHaveBeenCalledWith(SAVE_FAILED_TEXT);
    // Ponuka je uložená, druhá fotka sa nahrala a okno sa zavrelo.
    expect(mockedUpload).toHaveBeenCalledTimes(2);
    expect(mockSaveOutcome).toBe('resolved');
    expect(skillsState.fetchSkillDetail).toHaveBeenCalledWith(scenario.savedId);
    expect(skillsState.setIsSkillDescriptionModalOpen).toHaveBeenCalledWith(false);
  });

  it('pri odmietnutí moderáciou ukáže hlášku o nevhodnom obsahu', async () => {
    mockedUpload
      .mockRejectedValueOnce({ response: { data: { code: 'image_moderation_rejected', error: 'x' } } })
      .mockResolvedValueOnce(undefined);

    await saveScenario(scenario);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Fotka nebola prijatá kvôli nevhodnému obsahu.');
    expect(mockSaveOutcome).toBe('resolved');
  });
});

describe('okno ponúk, chyba fotky: ďalšie prípady', () => {
  const scenario = SCENARIOS[2];

  it('v texte chyby je poradie fotky, ktorá zlyhala', async () => {
    mockedUpload
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ response: { data: { error: 'Súbor je príliš veľký.' } } });

    await saveScenario(scenario);

    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Chyba pri nahrávaní obrázka 2: Súbor je príliš veľký.');
  });

  it('keď zlyhajú obe fotky, každá dostane vlastný toast a okno sa aj tak zavrie', async () => {
    mockedUpload.mockRejectedValue(new Error('Network Error'));

    const skillsState = await saveScenario(scenario);

    expect(mockedToastError.mock.calls.map(([text]) => text)).toEqual([
      'Chyba pri nahrávaní obrázka 1: Network Error',
      'Chyba pri nahrávaní obrázka 2: Network Error',
    ]);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockSaveOutcome).toBe('resolved');
    expect(skillsState.setIsSkillDescriptionModalOpen).toHaveBeenCalledWith(false);
  });

  it('keď sa fotky nahrajú, žiadny toast ani okno sa neukáže', async () => {
    mockedUpload.mockResolvedValue(undefined);

    await saveScenario(scenario);

    expect(mockedToastError).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockSaveOutcome).toBe('resolved');
  });
});

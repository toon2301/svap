import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import toast from 'react-hot-toast';

import type { DashboardSkill } from '../../hooks/useSkillsModals';
import SkillsModuleRouter from './SkillsModuleRouter';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  endpoints: { skills: { imageDetail: () => '' } },
}));

type ActionProps = {
  onFirstOptionClick?: () => void;
  onSecondOptionClick?: () => void;
  onAddCategory?: () => void;
};

jest.mock('./SkillsDesktopSection', () => ({
  __esModule: true,
  default: ({ onFirstOptionClick, onSecondOptionClick, onAddCategory }: ActionProps) => (
    <div>
      <button type="button" data-testid="first-option" onClick={onFirstOptionClick}>
        prvá voľba
      </button>
      <button type="button" data-testid="second-option" onClick={onSecondOptionClick}>
        druhá voľba
      </button>
      <button type="button" data-testid="add-category" onClick={onAddCategory}>
        pridať kategóriu
      </button>
    </div>
  ),
}));

jest.mock('./SkillsMobileSection', () => ({
  __esModule: true,
  default: () => null,
}));

/**
 * Limit kariet so skutočnou obrazovkou `SkillsScreen` (nález 302, podmienka opatrnosti 5: druhé hlásenie). Obrazovka
 * limit stráži sama a ukáže jeden toast; obslužné funkcie smerovača, v ktorých boli štyri natívne `alert()`, pri limite
 * vôbec nezavolá, lebo oba počítajú rovnaké odfiltrované zoznamy a rovnaký limit. Pri limite teda vznikne práve jedno
 * hlásenie na klepnutie a smerovač nič neotvorí.
 */
const LIMIT_TEXT = 'Môžeš mať maximálne 3 karty v tejto sekcii.';

const setActiveModule = jest.fn();
const setIsSkillsCategoryModalOpen = jest.fn();
const setIsAddCustomCategoryModalOpen = jest.fn();

const card = (id: number, isSeeking: boolean): DashboardSkill => ({
  id,
  category: 'Domácnosť',
  subcategory: `Upratovanie ${id}`,
  is_seeking: isSeeking,
});

function renderRouter(
  activeModule: 'skills-offer' | 'skills-search',
  standardCategories: DashboardSkill[],
  customCategories: DashboardSkill[],
) {
  return render(
    <SkillsModuleRouter
      activeModule={activeModule}
      accountType="personal"
      standardCategories={standardCategories}
      customCategories={customCategories}
      selectedSkillsCategory={null}
      setActiveModule={setActiveModule}
      setIsSkillsCategoryModalOpen={setIsSkillsCategoryModalOpen}
      setSelectedSkillsCategory={jest.fn()}
      setIsSkillDescriptionModalOpen={jest.fn()}
      setIsAddCustomCategoryModalOpen={setIsAddCustomCategoryModalOpen}
      setEditingCustomCategoryIndex={jest.fn()}
      setEditingStandardCategoryIndex={jest.fn()}
      removeStandardCategory={async () => undefined}
      removeCustomCategory={async () => undefined}
    />,
  );
}

describe.each([
  ['skills-offer', false, ['first-option', 'add-category']],
  ['skills-search', true, ['first-option', 'second-option']],
] as const)('SkillsModuleRouter so skutočnou obrazovkou, %s (nález 302)', (activeModule, isSeeking, entryPoints) => {
  const originalWidth = window.innerWidth;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.innerWidth = 1280;
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    window.innerWidth = originalWidth;
    alertSpy.mockRestore();
  });

  it('pri troch kartách ukáže každé klepnutie práve jeden toast, bez natívneho okna, a smerovač nič neotvorí', () => {
    renderRouter(activeModule, [card(1, isSeeking), card(2, isSeeking)], [card(3, isSeeking)]);

    entryPoints.forEach((testId, index) => {
      fireEvent.click(screen.getByTestId(testId));
      expect(toast.error).toHaveBeenCalledTimes(index + 1);
    });

    expect(toast.error).toHaveBeenCalledWith(LIMIT_TEXT);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(setActiveModule).not.toHaveBeenCalled();
    expect(setIsSkillsCategoryModalOpen).not.toHaveBeenCalled();
    expect(setIsAddCustomCategoryModalOpen).not.toHaveBeenCalled();
  });

  it('karty druhého druhu sa do limitu nepočítajú: obrazovka aj smerovač ich vynechajú, nič sa neukáže', () => {
    renderRouter(activeModule, [card(1, !isSeeking), card(2, !isSeeking)], [card(3, !isSeeking), card(4, isSeeking)]);

    fireEvent.click(screen.getByTestId(entryPoints[0]));

    expect(toast.error).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(setIsSkillsCategoryModalOpen).toHaveBeenCalledWith(true);
  });
});

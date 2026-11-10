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
  endpoints: {
    skills: {
      imageDetail: (skillId: number, imageId: number) => `/auth/skills/${skillId}/images/${imageId}/`,
    },
  },
}));

type ActionProps = {
  onFirstOptionClick?: () => void;
  onSecondOptionClick?: () => void;
  onAddCategory?: () => void;
};

/**
 * Náhrada obrazovky `SkillsScreen`, ktorá odovzdá smerovaču jeho vlastné obslužné funkcie bez ochrany limitu. Skutočná
 * obrazovka limit stráži sama (`withCardLimitGuard`) a funkcie smerovača pri limite vôbec nezavolá, preto sa vetva
 * smerovača pri limite dá vyskúšať len takto.
 */
jest.mock('./SkillsScreen', () => ({
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

/**
 * Limit kariet v `SkillsModuleRouter` (nález 302, osem natívnych `alert()` v troch súboroch nad 500 riadkov). Pri troch
 * kartách v sekcii mal smerovač ukázať natívne okno prehliadača, ktoré blokuje stránku. Má ukázať toast a nič neotvoriť.
 */
const LIMIT_TEXT = 'Môžeš mať maximálne 3 karty v tejto sekcii.';

const setActiveModule = jest.fn();
const setIsSkillsCategoryModalOpen = jest.fn();
const setIsAddCustomCategoryModalOpen = jest.fn();

const offer = (id: number): DashboardSkill => ({
  id,
  category: 'Domácnosť',
  subcategory: `Upratovanie ${id}`,
  is_seeking: false,
});

const seek = (id: number): DashboardSkill => ({ ...offer(id), subcategory: `Hľadám ${id}`, is_seeking: true });

function renderRouter(
  standardCategories: DashboardSkill[],
  customCategories: DashboardSkill[],
  activeModule: 'skills-offer' | 'skills-search' = 'skills-offer',
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

describe('SkillsModuleRouter: limit kariet ukáže toast, nie natívne okno (nález 302)', () => {
  const originalWidth = window.innerWidth;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    window.innerWidth = originalWidth;
    alertSpy.mockRestore();
  });

  it('Ponúkam, výber kategórie pri troch kartách: toast, nie natívne okno, a nič sa neotvorí (miesto 1)', () => {
    renderRouter([offer(1), offer(2)], [offer(3)]);

    fireEvent.click(screen.getByTestId('first-option'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(LIMIT_TEXT);
    expect(setActiveModule).not.toHaveBeenCalled();
    expect(setIsSkillsCategoryModalOpen).not.toHaveBeenCalled();
  });

  it('Ponúkam, výber kategórie pod limitom: otvorí okno (desktop) aj obrazovku (mobil), bez toastu a bez natívneho okna', () => {
    window.innerWidth = 1280;
    const desktop = renderRouter([offer(1)], [offer(2)]);
    fireEvent.click(screen.getByTestId('first-option'));
    expect(setIsSkillsCategoryModalOpen).toHaveBeenCalledWith(true);
    expect(setActiveModule).not.toHaveBeenCalled();
    desktop.unmount();

    window.innerWidth = 390;
    renderRouter([offer(1)], [offer(2)]);
    fireEvent.click(screen.getByTestId('first-option'));
    expect(setActiveModule).toHaveBeenCalledWith('skills-select-category');

    expect(toast.error).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('Ponúkam, pridanie vlastnej kategórie pri troch kartách: toast, nie natívne okno, a nič sa neotvorí (miesto 2)', () => {
    renderRouter([offer(1), offer(2)], [offer(3)]);

    fireEvent.click(screen.getByTestId('add-category'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(LIMIT_TEXT);
    expect(setActiveModule).not.toHaveBeenCalled();
    expect(setIsAddCustomCategoryModalOpen).not.toHaveBeenCalled();
  });

  it('Ponúkam, pridanie vlastnej kategórie pod limitom: otvorí okno (desktop) aj obrazovku (mobil), bez toastu a bez natívneho okna', () => {
    window.innerWidth = 1280;
    const desktop = renderRouter([offer(1)], [offer(2)]);
    fireEvent.click(screen.getByTestId('add-category'));
    expect(setIsAddCustomCategoryModalOpen).toHaveBeenCalledWith(true);
    expect(setActiveModule).not.toHaveBeenCalled();
    desktop.unmount();

    window.innerWidth = 390;
    renderRouter([offer(1)], [offer(2)]);
    fireEvent.click(screen.getByTestId('add-category'));
    expect(setActiveModule).toHaveBeenCalledWith('skills-add-custom-category');

    expect(toast.error).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('Hľadám, výber kategórie pri troch kartách: toast, nie natívne okno, a nič sa neotvorí (miesto 3)', () => {
    renderRouter([seek(1), seek(2)], [seek(3)], 'skills-search');

    fireEvent.click(screen.getByTestId('first-option'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(LIMIT_TEXT);
    expect(setActiveModule).not.toHaveBeenCalled();
    expect(setIsSkillsCategoryModalOpen).not.toHaveBeenCalled();
  });

  it('Hľadám, výber kategórie pod limitom: otvorí okno (desktop) aj obrazovku (mobil), bez toastu a bez natívneho okna', () => {
    window.innerWidth = 1280;
    const desktop = renderRouter([seek(1)], [seek(2)], 'skills-search');
    fireEvent.click(screen.getByTestId('first-option'));
    expect(setIsSkillsCategoryModalOpen).toHaveBeenCalledWith(true);
    expect(setActiveModule).not.toHaveBeenCalled();
    desktop.unmount();

    window.innerWidth = 390;
    renderRouter([seek(1)], [seek(2)], 'skills-search');
    fireEvent.click(screen.getByTestId('first-option'));
    expect(setActiveModule).toHaveBeenCalledWith('skills-select-category');

    expect(toast.error).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

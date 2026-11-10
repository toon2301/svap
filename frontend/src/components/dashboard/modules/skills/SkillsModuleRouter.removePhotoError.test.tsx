import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import type { DashboardSkill } from '../../hooks/useSkillsModals';
import SkillsModuleRouter from './SkillsModuleRouter';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  endpoints: {
    skills: {
      imageDetail: (skillId: number, imageId: number) => `/auth/skills/${skillId}/images/${imageId}/`,
    },
  },
}));

/**
 * Zmazanie existujúcej fotky v mobilnej úprave ponuky so skutočným smerovačom a skutočnou obrazovkou (nález 302, miesto
 * 8 z 8, podmienka opatrnosti 5: druhé hlásenie). Smerovač zlyhanie `api.delete` zabalí do `Error` so správou a hook
 * obrazovky ju zachytí a ukáže. Predtým natívne okno `alert()`, teraz toast; tlačidlo „×“ pri fotke výsledok
 * nespracúva, takže vzniká práve jedno hlásenie.
 */
const SELECTED: DashboardSkill = {
  id: 7,
  category: 'Domácnosť',
  subcategory: 'Upratovanie',
  is_seeking: false,
  images: [{ id: 5, image_url: 'https://example.test/a.jpg' }],
};

const mockedDelete = api.delete as jest.Mock;

function renderDescribeScreen(setSelectedSkillsCategory: jest.Mock = jest.fn()) {
  return render(
    <SkillsModuleRouter
      activeModule="skills-describe"
      accountType="personal"
      standardCategories={[]}
      customCategories={[]}
      selectedSkillsCategory={SELECTED}
      setActiveModule={jest.fn()}
      setIsSkillsCategoryModalOpen={jest.fn()}
      setSelectedSkillsCategory={setSelectedSkillsCategory}
      setIsSkillDescriptionModalOpen={jest.fn()}
      setIsAddCustomCategoryModalOpen={jest.fn()}
      setEditingCustomCategoryIndex={jest.fn()}
      setEditingStandardCategoryIndex={jest.fn()}
      removeStandardCategory={async () => undefined}
      removeCustomCategory={async () => undefined}
    />,
  );
}

const clickRemovePhoto = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Odstrániť existujúcu fotku' }));
  });
};

describe('SkillsModuleRouter: zlyhané zmazanie existujúcej fotky v mobilnej úprave (nález 302)', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('chyba servera: práve jeden toast s textom servera, nie natívne okno', async () => {
    mockedDelete.mockRejectedValue({ response: { data: { error: 'Fotku nemožno zmazať.' } } });
    renderDescribeScreen();

    await clickRemovePhoto();

    expect(mockedDelete).toHaveBeenCalledWith('/auth/skills/7/images/5/');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Fotku nemožno zmazať.');
  });

  it('sieťová chyba: práve jeden toast s neprázdnym textom (nie anglické „Network Error“), nie natívne okno', async () => {
    mockedDelete.mockRejectedValue({ isAxiosError: true, message: 'Network Error' });
    renderDescribeScreen();

    await clickRemovePhoto();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    const [message] = (toast.error as jest.Mock).mock.calls[0];
    expect(typeof message).toBe('string');
    expect(message.trim()).not.toBe('');
    expect(message).not.toMatch(/Network Error/i);
  });

  it('úspešné zmazanie prevezme nový zoznam fotiek do rodiča a nič neukáže ani natívnym oknom, ani toastom', async () => {
    mockedDelete.mockResolvedValue({ data: { images: [] } });
    const setSelectedSkillsCategory = jest.fn();
    renderDescribeScreen(setSelectedSkillsCategory);

    await clickRemovePhoto();

    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    const updates = setSelectedSkillsCategory.mock.calls
      .map(([action]) => (typeof action === 'function' ? action(SELECTED) : action))
      .filter((next) => next && Array.isArray(next.images));
    expect(updates.some((next) => next.images.length === 0)).toBe(true);
  });
});

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { api } from '@/lib/api';
import type { DashboardSkill } from '../../hooks/useSkillsModals';
import SkillsModuleRouter from './SkillsModuleRouter';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  endpoints: {
    skills: {
      imageDetail: (skillId: number, imageId: number) => `/auth/skills/${skillId}/images/${imageId}/`,
    },
  },
}));

/**
 * Zmazanie jednej z dvoch existujúcich fotiek v mobilnej úprave ponuky so skutočným smerovačom a skutočnou obrazovkou
 * (nález 326). Server odpovedá stavom 204 bez tela. Smerovač z prázdnej odpovede vracal prázdny zoznam, ktorý hook
 * obrazovky vzal ako nový zoznam všetkých fotiek, takže po zmazaní jednej zmizli obe. Ostať má tá druhá a rodič má
 * dostať zoznam len s ňou.
 */
const FIRST = { id: 5, image_url: 'https://example.test/a.jpg' };
const SECOND = { id: 6, image_url: 'https://example.test/b.jpg' };

const SELECTED: DashboardSkill = {
  id: 7,
  category: 'Domácnosť',
  subcategory: 'Upratovanie',
  is_seeking: false,
  images: [FIRST, SECOND],
};

const mockedDelete = api.delete as jest.Mock;

/** Vykreslí smerovač na obrazovke Popis ponuky s dvoma fotkami; zápisy do rodiča idú do daného zástupného setteru. */
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

const REMOVE_LABEL = 'Odstrániť existujúcu fotku';

/** Klikne na „×“ pri prvej fotke a počká na dokončenie zmazania. */
const clickRemoveFirstPhoto = async () => {
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: REMOVE_LABEL })[0]);
  });
};

/** Zoznamy fotiek, ktoré smerovač zapísal do rodiča (funkčné aj priame zápisy sa vyhodnotia nad pôvodnou ponukou). */
const imageListsWrittenToParent = (setSelectedSkillsCategory: jest.Mock) =>
  setSelectedSkillsCategory.mock.calls
    .map(([action]) => (typeof action === 'function' ? action(SELECTED) : action))
    .filter((next) => next && Array.isArray(next.images))
    .map((next) => next.images as Array<{ id: number }>);

describe('SkillsModuleRouter: zmazanie jednej z dvoch fotiek (nález 326)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('server odpovie 204 bez tela: ostane druhá fotka a rodič dostane zoznam len s ňou', async () => {
    mockedDelete.mockResolvedValue({ status: 204, data: '' });
    const setSelectedSkillsCategory = jest.fn();
    renderDescribeScreen(setSelectedSkillsCategory);
    expect(screen.getAllByRole('button', { name: REMOVE_LABEL })).toHaveLength(2);

    await clickRemoveFirstPhoto();

    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(mockedDelete).toHaveBeenCalledWith('/auth/skills/7/images/5/');
    expect(screen.queryAllByRole('button', { name: REMOVE_LABEL })).toHaveLength(1);
    const lists = imageListsWrittenToParent(setSelectedSkillsCategory);
    expect(lists.length).toBeGreaterThan(0);
    expect(lists[lists.length - 1].map((image) => image.id)).toEqual([6]);
  });

  it('server vráti zoznam fotiek: prevezme sa a ostane druhá fotka', async () => {
    mockedDelete.mockResolvedValue({ status: 200, data: { images: [SECOND] } });
    const setSelectedSkillsCategory = jest.fn();
    renderDescribeScreen(setSelectedSkillsCategory);

    await clickRemoveFirstPhoto();

    expect(screen.queryAllByRole('button', { name: REMOVE_LABEL })).toHaveLength(1);
    const lists = imageListsWrittenToParent(setSelectedSkillsCategory);
    expect(lists[lists.length - 1].map((image) => image.id)).toEqual([6]);
  });

  it('server vráti prázdny zoznam (zmazaná posledná fotka): nezostane žiadna', async () => {
    mockedDelete.mockResolvedValue({ status: 200, data: { images: [] } });
    renderDescribeScreen();

    await clickRemoveFirstPhoto();

    expect(screen.queryAllByRole('button', { name: REMOVE_LABEL })).toHaveLength(0);
  });
});

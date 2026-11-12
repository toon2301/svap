import React from 'react';
import { render } from '@testing-library/react';

import { api } from '@/lib/api';
import type { DashboardSkill } from '../../hooks/useSkillsModals';
import SkillsModuleRouter from './SkillsModuleRouter';

/** Vlastnosti obrazovky Popis ponuky, ktoré tento test číta: funkcia zmazania existujúcej fotky zo smerovača. */
type DescribeScreenProps = { onRemoveExistingImage?: (imageId: number) => Promise<unknown> };

/** Posledné vlastnosti, s ktorými smerovač vykreslil obrazovku Popis ponuky (premenná musí začínať na `mock`). */
let mockDescribeProps: DescribeScreenProps | null = null;

jest.mock('./SkillsDescriptionScreen', () => ({
  __esModule: true,
  default: (props: DescribeScreenProps) => {
    mockDescribeProps = props;
    return null;
  },
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
 * Funkcia zmazania existujúcej fotky, ktorú smerovač dáva obrazovke Popis ponuky (nález 326). Server pri zmazaní
 * fotky odpovedá stavom 204 bez tela, takže `data` je prázdny reťazec. Smerovač z neho vracal `data?.images || []`,
 * teda prázdny zoznam, a hook obrazovky ho vzal ako nový zoznam všetkých fotiek: po zmazaní jednej zmizli všetky.
 * Bez zoznamu v odpovedi má funkcia vrátiť `undefined`, aby hook len vyradil zmazanú fotku.
 */
const SELECTED: DashboardSkill = {
  id: 7,
  category: 'Domácnosť',
  subcategory: 'Upratovanie',
  is_seeking: false,
  images: [
    { id: 5, image_url: 'https://example.test/a.jpg' },
    { id: 6, image_url: 'https://example.test/b.jpg' },
  ],
};

const mockedDelete = api.delete as jest.Mock;

/** Vykreslí smerovač na obrazovke Popis ponuky a vráti funkciu zmazania fotky, ktorú dostala (zástupná) obrazovka. */
function renderAndGetRemoveFunction(): (imageId: number) => Promise<unknown> {
  render(
    <SkillsModuleRouter
      activeModule="skills-describe"
      accountType="personal"
      standardCategories={[]}
      customCategories={[]}
      selectedSkillsCategory={SELECTED}
      setActiveModule={jest.fn()}
      setIsSkillsCategoryModalOpen={jest.fn()}
      setSelectedSkillsCategory={jest.fn()}
      setIsSkillDescriptionModalOpen={jest.fn()}
      setIsAddCustomCategoryModalOpen={jest.fn()}
      setEditingCustomCategoryIndex={jest.fn()}
      setEditingStandardCategoryIndex={jest.fn()}
      removeStandardCategory={async () => undefined}
      removeCustomCategory={async () => undefined}
    />,
  );
  const remove = mockDescribeProps?.onRemoveExistingImage;
  if (!remove) throw new Error('Smerovač nedal obrazovke funkciu zmazania fotky.');
  return remove;
}

describe('SkillsModuleRouter: výsledok zmazania existujúcej fotky (nález 326)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDescribeProps = null;
  });

  it.each([
    ['204 bez tela (prázdny reťazec)', { status: 204, data: '' }],
    ['odpoveď bez dát (undefined)', { status: 204, data: undefined }],
    ['odpoveď bez zoznamu fotiek', { status: 200, data: { message: 'ok' } }],
  ])('%s: vráti undefined, nie prázdny zoznam', async (_label, response) => {
    mockedDelete.mockResolvedValue(response);
    const remove = renderAndGetRemoveFunction();

    const result = await remove(5);

    expect(mockedDelete).toHaveBeenCalledWith('/auth/skills/7/images/5/');
    expect(result).toBeUndefined();
  });

  it('odpoveď servera so zoznamom fotiek: vráti presne ten zoznam', async () => {
    const images = [{ id: 6, image_url: 'https://example.test/b.jpg' }];
    mockedDelete.mockResolvedValue({ status: 200, data: { images } });
    const remove = renderAndGetRemoveFunction();

    const result = await remove(5);

    expect(result).toBe(images);
  });

  it('odpoveď servera s prázdnym zoznamom fotiek: vráti ten prázdny zoznam (posledná fotka zmazaná)', async () => {
    const images: unknown[] = [];
    mockedDelete.mockResolvedValue({ status: 200, data: { images } });
    const remove = renderAndGetRemoveFunction();

    const result = await remove(5);

    expect(result).toBe(images);
  });
});

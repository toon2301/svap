import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import cs from '../../../../../messages/cs.json';
import de from '../../../../../messages/de.json';
import en from '../../../../../messages/en.json';
import hu from '../../../../../messages/hu.json';
import pl from '../../../../../messages/pl.json';
import sk from '../../../../../messages/sk.json';
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

/** Skutočné jazykové súbory aplikácie: zástupný `t` z nich číta preklady vo vybranom jazyku. */
const mockCatalogs: Record<string, unknown> = { sk, cs, en, pl, de, hu };
let mockLocale = 'sk';

/** Preklad podľa bodkovej cesty v súbore aktuálneho jazyka; ak kľúč chýba, vráti záložný text z kódu. */
const mockTranslate = (key: string, fallback?: string): string => {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      mockCatalogs[mockLocale],
    );
  return typeof value === 'string' ? value : (fallback ?? key);
};

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({ locale: mockLocale, searchCountry: 'SK', t: mockTranslate }),
}));

/**
 * Zmazanie existujúcej fotky v mobilnej úprave ponuky pri sieťovej chybe v každom z šiestich jazykov (nález 302,
 * pripomienka CodeRabbitu k PR 254). Smerovač zlyhanie `api.delete` zabalí do `Error` so správou a hook ju ukáže v
 * toaste. Záložný text v smerovači bol napevno slovenský, takže používateľ s iným jazykom videl slovenský toast.
 * Toast má niesť text `skills.imageDeleteFailed` v jazyku rozhrania.
 */
const SELECTED: DashboardSkill = {
  id: 7,
  category: 'Domácnosť',
  subcategory: 'Upratovanie',
  is_seeking: false,
  images: [{ id: 5, image_url: 'https://example.test/a.jpg' }],
};

const LOCALES = ['sk', 'cs', 'en', 'pl', 'de', 'hu'] as const;

const catalogText = (locale: string): string =>
  (mockCatalogs[locale] as { skills: { imageDeleteFailed: string } }).skills.imageDeleteFailed;

const mockedDelete = api.delete as jest.Mock;

function renderDescribeScreen() {
  return render(
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
}

/** Klepne na „×“ pri existujúcej fotke; názov tlačidla je v jazyku rozhrania. */
const clickRemovePhoto = async () => {
  const name = mockTranslate('skills.removeExistingPhoto', 'Odstrániť existujúcu fotku');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

describe.each(LOCALES)('SkillsModuleRouter: zmazanie fotky pri chybe, jazyk %s (nález 302, PR 254)', (locale) => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockLocale = locale;
  });

  afterEach(() => {
    mockLocale = 'sk';
  });

  it('sieťová chyba bez odpovede servera: práve jeden toast s prekladom `skills.imageDeleteFailed`, nie slovenský ani anglický text', async () => {
    mockedDelete.mockRejectedValue({ isAxiosError: true, message: 'Network Error' });
    renderDescribeScreen();

    await clickRemovePhoto();

    expect(mockedDelete).toHaveBeenCalledWith('/auth/skills/7/images/5/');
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(catalogText(locale));
    expect(toast.error).not.toHaveBeenCalledWith('Network Error');
    if (locale !== 'sk') {
      expect(catalogText(locale)).not.toBe(catalogText('sk'));
      expect(toast.error).not.toHaveBeenCalledWith(catalogText('sk'));
      expect(toast.error).not.toHaveBeenCalledWith('Odstránenie obrázka zlyhalo');
    }
  });

  it('text chyby zo servera má prednosť pred prekladom', async () => {
    mockedDelete.mockRejectedValue({ response: { data: { error: 'Server: fotku nemožno zmazať.' } } });
    renderDescribeScreen();

    await clickRemovePhoto();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Server: fotku nemožno zmazať.');
  });
});

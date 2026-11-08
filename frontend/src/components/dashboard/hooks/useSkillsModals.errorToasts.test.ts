/**
 * Chyba zmazania v hooku okien ponúk (nález 302). Zlyhané zmazanie fotky ponuky a karty (štandardnej aj vlastnej)
 * predtým ukázalo natívne okno `alert()`. Teraz ukáže toast. Pri fotke sa chyba hodí ďalej, lebo podľa nej
 * `removeOfferPhotoAndRefreshProfile` pozná, že zmazanie neprešlo; jediný volajúci ju ticho prehltne, takže
 * používateľ vidí jedno hlásenie. Pri karte sa chyba nehádže a zoznam ostane nezmenený.
 */

import { act, renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useSkillsModals } from './useSkillsModals';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('../../../lib/api', () => ({
  api: { delete: jest.fn(), get: jest.fn() },
  endpoints: {
    skills: {
      list: '/auth/skills/',
      detail: (id: number) => `/auth/skills/${id}/`,
      imageDetail: (skillId: number, imageId: number) => `/auth/skills/${skillId}/images/${imageId}/`,
    },
  },
}));

/** Preklady, ktoré test dosadí: kľúč, ktorý tu nie je, vráti záložný text z kódu. */
let mockTranslations: Record<string, string> = {};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => mockTranslations[key] ?? fallback,
    country: 'SK',
  }),
}));

const mockedDelete = api.delete as jest.Mock;
const mockedToastError = toast.error as jest.Mock;

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockTranslations = {};
  alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe('useSkillsModals, zmazanie fotky ponuky', () => {
  it('ukáže toast s textom zo servera, nie natívne okno, a chybu hodí ďalej', async () => {
    const serverError = { response: { data: { error: 'Fotku nemožno zmazať.' } } };
    mockedDelete.mockRejectedValue(serverError);
    const { result } = renderHook(() => useSkillsModals());

    await act(async () => {
      await expect(result.current.handleRemoveSkillImage(7, 3)).rejects.toBe(serverError);
    });

    expect(mockedDelete).toHaveBeenCalledWith('/auth/skills/7/images/3/');
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Fotku nemožno zmazať.');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('použije `detail`, keď server `error` neposlal', async () => {
    mockedDelete.mockRejectedValue({ response: { data: { detail: 'Zakázané.' } } });
    const { result } = renderHook(() => useSkillsModals());

    await act(async () => {
      await expect(result.current.handleRemoveSkillImage(7, 3)).rejects.toBeDefined();
    });

    expect(mockedToastError).toHaveBeenCalledWith('Zakázané.');
  });

  it('bez textu zo servera ukáže preklad `skills.imageDeleteFailed`', async () => {
    mockTranslations = { 'skills.imageDeleteFailed': 'Preklad zo súboru prekladov' };
    mockedDelete.mockRejectedValue(new Error(''));
    const { result } = renderHook(() => useSkillsModals());

    await act(async () => {
      await expect(result.current.handleRemoveSkillImage(7, 3)).rejects.toBeDefined();
    });

    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Preklad zo súboru prekladov');
  });

  it('bez prekladu ukáže záložný slovenský text', async () => {
    mockedDelete.mockRejectedValue({});
    const { result } = renderHook(() => useSkillsModals());

    await act(async () => {
      await expect(result.current.handleRemoveSkillImage(7, 3)).rejects.toBeDefined();
    });

    expect(mockedToastError).toHaveBeenCalledWith('Odstránenie obrázka zlyhalo.');
  });
});

describe.each([
  { label: 'štandardnej', list: 'standardCategories', setList: 'setStandardCategories', remove: 'removeStandardCategory' },
  { label: 'vlastnej', list: 'customCategories', setList: 'setCustomCategories', remove: 'removeCustomCategory' },
] as const)('useSkillsModals, zmazanie $label karty', ({ list, setList, remove }) => {
  /** Hook so zoznamom s jednou uloženou kartou (má `id`, takže sa maže aj na serveri). */
  function renderWithOneCard() {
    const hook = renderHook(() => useSkillsModals());
    act(() => {
      hook.result.current[setList]([{ id: 5, category: 'IT', subcategory: 'Web' }]);
    });
    return hook;
  }

  it('pri chybe ukáže toast s textom zo servera, nie natívne okno, nehodí chybu a zoznam ostane', async () => {
    mockedDelete.mockRejectedValue({ response: { data: { error: 'Kartu nemožno zmazať.' } } });
    const { result } = renderWithOneCard();

    await act(async () => {
      await result.current[remove](0);
    });

    expect(mockedDelete).toHaveBeenCalledWith('/auth/skills/5/');
    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Kartu nemožno zmazať.');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(result.current[list]).toHaveLength(1);
  });

  it('bez textu zo servera ukáže preklad `skills.cardDeleteFailed`', async () => {
    mockTranslations = { 'skills.cardDeleteFailed': 'Preklad zo súboru prekladov' };
    mockedDelete.mockRejectedValue({});
    const { result } = renderWithOneCard();

    await act(async () => {
      await result.current[remove](0);
    });

    expect(mockedToastError).toHaveBeenCalledTimes(1);
    expect(mockedToastError).toHaveBeenCalledWith('Preklad zo súboru prekladov');
  });

  it('po úspešnom zmazaní karta zmizne zo zoznamu a nič sa neukáže', async () => {
    mockedDelete.mockResolvedValue({});
    const { result } = renderWithOneCard();

    await act(async () => {
      await result.current[remove](0);
    });

    expect(result.current[list]).toHaveLength(0);
    expect(mockedToastError).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

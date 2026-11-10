import { act, renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';

import cs from '../../../../../../../messages/cs.json';
import de from '../../../../../../../messages/de.json';
import en from '../../../../../../../messages/en.json';
import hu from '../../../../../../../messages/hu.json';
import pl from '../../../../../../../messages/pl.json';
import sk from '../../../../../../../messages/sk.json';
import type { SkillImage } from '../types';
import { useSkillsDescriptionScreenState } from './useSkillsDescriptionScreenState';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

/** Preklady, ktoré test dosadí: kľúč, ktorý tu nie je, vráti záložný text z kódu. */
let mockTranslations: Record<string, string> = {};
const mockT = (key: string, fallback: string) => mockTranslations[key] ?? fallback;

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, country: 'SK' }),
}));

/**
 * Zlyhané zmazanie existujúcej fotky v mobilnej úprave ponuky (nález 302, miesto 8 z 8). Hook zachytí chybu z funkcie
 * `onRemoveExistingImage` a predtým ukázal natívne okno `alert()`, ktoré blokuje stránku; pri sieťovej chybe by
 * ukázalo anglické „Network Error“. Má ukázať toast s textom chyby, inak preložený záložný text, a fotku nechať.
 */
const IMAGE: SkillImage = { id: 5, image_url: 'https://example.test/a.jpg' };

/** Stabilná referencia: hook synchronizuje fotky pri každej zmene `initialImages`, nový literál by stav pri každom vykreslení vrátil. */
const INITIAL_IMAGES: SkillImage[] = [IMAGE];

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockTranslations = {};
  alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
});

/** Hook s jednou existujúcou fotkou a danou funkciou zmazania. */
function renderState(onRemoveExistingImage: (imageId: number) => Promise<SkillImage[] | void>) {
  const onExistingImagesChange = jest.fn();
  const view = renderHook(() =>
    useSkillsDescriptionScreenState({
      initialImages: INITIAL_IMAGES,
      onRemoveExistingImage,
      onExistingImagesChange,
    }),
  );
  return { ...view, onExistingImagesChange };
}

const removeImage = async (result: { current: { handleRemoveExistingImageClick: (id: number) => Promise<void> } }) => {
  await act(async () => {
    await result.current.handleRemoveExistingImageClick(5);
  });
};

describe('useSkillsDescriptionScreenState: zlyhané zmazanie existujúcej fotky (miesto 8)', () => {
  it('chyba nesúca správu (ako ju hádže smerovač): toast s touto správou, nie natívne okno; fotka ostane', async () => {
    const { result, onExistingImagesChange } = renderState(jest.fn().mockRejectedValue(new Error('Fotku nemožno zmazať.')));

    await removeImage(result);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Fotku nemožno zmazať.');
    expect(result.current.existingImages).toEqual([IMAGE]);
    expect(onExistingImagesChange).not.toHaveBeenCalled();
  });

  it('text zo servera (`response.data.error`) má prednosť pred správou chyby', async () => {
    const { result } = renderState(
      jest.fn().mockRejectedValue({ response: { data: { error: 'Server: zakázané.' } }, message: 'Request failed' }),
    );

    await removeImage(result);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Server: zakázané.');
  });

  it('sieťová chyba bez odpovede servera: preložený záložný text, nie anglické „Network Error“', async () => {
    mockTranslations = { 'skills.imageDeleteFailed': 'Failed to delete image.' };
    const { result } = renderState(jest.fn().mockRejectedValue({ isAxiosError: true, message: 'Network Error' }));

    await removeImage(result);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Failed to delete image.');
  });

  it('chyba bez správy: ukáže záložný text z kódu, nie prázdny toast', async () => {
    const { result } = renderState(jest.fn().mockRejectedValue(new Error('')));

    await removeImage(result);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Odstránenie obrázka zlyhalo.');
  });

  it('chyba sa nehádže ďalej: volajúce tlačidlo ju nespracúva, takže vzniká práve jedno hlásenie', async () => {
    const { result } = renderState(jest.fn().mockRejectedValue(new Error('Fotku nemožno zmazať.')));

    await expect(
      act(async () => {
        await result.current.handleRemoveExistingImageClick(5);
      }),
    ).resolves.toBeUndefined();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('úspešné zmazanie prevezme nový zoznam fotiek a nič neukáže ani natívnym oknom, ani toastom', async () => {
    const { result, onExistingImagesChange } = renderState(jest.fn().mockResolvedValue([]));

    await removeImage(result);

    expect(result.current.existingImages).toEqual([]);
    expect(onExistingImagesChange).toHaveBeenCalledWith([]);
    expect(toast.error).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('kľúč `skills.imageDeleteFailed` je preložený vo všetkých šiestich jazykoch a slovenský text zodpovedá záložnému', () => {
    [sk, cs, en, pl, de, hu].forEach((messages) => {
      expect(typeof messages.skills.imageDeleteFailed).toBe('string');
      expect(messages.skills.imageDeleteFailed.trim()).not.toBe('');
    });
    expect(sk.skills.imageDeleteFailed).toBe('Odstránenie obrázka zlyhalo.');
  });
});

import { act, renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';

import type { SkillImage } from '../types';
import { useSkillsDescriptionScreenState } from './useSkillsDescriptionScreenState';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

/**
 * Výsledok funkcie `onRemoveExistingImage` v hooku obrazovky Popis ponuky (nález 326). Ak funkcia vráti zoznam fotiek,
 * hook ho prevezme ako nový zoznam všetkých fotiek; ak nevráti nič (`undefined`), hook len vyradí zmazanú fotku.
 * Vetva bez zoznamu sa kvôli prázdnemu zoznamu zo smerovača nikdy nespustila.
 */
const FIRST: SkillImage = { id: 5, image_url: 'https://example.test/a.jpg' };
const SECOND: SkillImage = { id: 6, image_url: 'https://example.test/b.jpg' };
const THIRD: SkillImage = { id: 7, image_url: 'https://example.test/c.jpg' };

/** Stabilná referencia: hook synchronizuje fotky pri každej zmene `initialImages`, nový literál by stav pri každom vykreslení vrátil. */
const INITIAL_IMAGES: SkillImage[] = [FIRST, SECOND];

beforeEach(() => {
  jest.clearAllMocks();
});

/** Hook s dvoma existujúcimi fotkami a danou funkciou zmazania. */
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

/** Zavolá zmazanie prvej fotky cez obslužnú funkciu hooku a počká na jeho dokončenie. */
const removeFirst = async (result: { current: { handleRemoveExistingImageClick: (id: number) => Promise<void> } }) => {
  await act(async () => {
    await result.current.handleRemoveExistingImageClick(FIRST.id as number);
  });
};

describe('useSkillsDescriptionScreenState: výsledok zmazania existujúcej fotky (nález 326)', () => {
  it('funkcia nevráti nič: ostane druhá fotka a rodič dostane zoznam len s ňou', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const { result, onExistingImagesChange } = renderState(remove);

    await removeFirst(result);

    expect(remove).toHaveBeenCalledWith(5);
    expect(result.current.existingImages).toEqual([SECOND]);
    expect(onExistingImagesChange).toHaveBeenCalledTimes(1);
    expect(onExistingImagesChange).toHaveBeenCalledWith([SECOND]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('funkcia vráti zoznam: hook ho prevezme ako nový zoznam všetkých fotiek (aj keď sa líši od vyradenia)', async () => {
    const serverList = [SECOND, THIRD];
    const { result, onExistingImagesChange } = renderState(jest.fn().mockResolvedValue(serverList));

    await removeFirst(result);

    expect(result.current.existingImages).toEqual(serverList);
    expect(onExistingImagesChange).toHaveBeenCalledTimes(1);
    expect(onExistingImagesChange).toHaveBeenCalledWith(serverList);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('funkcia vráti prázdny zoznam: nezostane žiadna fotka (server potvrdil, že už žiadna nie je)', async () => {
    const { result, onExistingImagesChange } = renderState(jest.fn().mockResolvedValue([]));

    await removeFirst(result);

    expect(result.current.existingImages).toEqual([]);
    expect(onExistingImagesChange).toHaveBeenCalledWith([]);
  });
});

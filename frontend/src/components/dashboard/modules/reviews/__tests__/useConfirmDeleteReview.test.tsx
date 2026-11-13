import { act, renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';

import { invalidateOffersCache } from '../../profile/profileOffersCache';
import { useConfirmDeleteReview } from '../useConfirmDeleteReview';

const mockApiDelete = jest.fn();

/** Preklady, ktoré test dosadí: kľúč, ktorý tu nie je, vráti záložný text z kódu. */
let mockTranslations: Record<string, string> = {};
const mockT = (key: string, fallback: string) => mockTranslations[key] ?? fallback;

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/api', () => ({
  api: { delete: (...args: unknown[]) => mockApiDelete(...args) },
  endpoints: { reviews: { detail: (id: number) => `reviews/detail/${id}` } },
}));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: mockT }) }));
jest.mock('../../profile/profileOffersCache', () => ({ invalidateOffersCache: jest.fn() }));

/**
 * Obsluha potvrdenia zmazania vlastnej recenzie (nález 325): po úspešnom zmazaní a načítaní zoznamu sa ukáže toast
 * „Recenzia bola vymazaná.“ (kľúč `reviews.deleteReviewSuccess`); pri zlyhaní je chyba ako doteraz
 * (`reviews.deleteReviewFailed` alebo text zo servera) a toast úspechu sa neukáže.
 */
type OfferLike = { id: number; already_reviewed?: boolean; can_review?: boolean };

const order = (mock: jest.Mock) => mock.mock.invocationCallOrder[0];

/** Pripraví obsluhu s predvolenými vstupmi (recenzia 7 ponuky 3, prihlásený 1, vlastník ponuky 5); vstupy sa dajú prepísať. */
const setup = (overrides: Partial<Parameters<typeof useConfirmDeleteReview<OfferLike>>[0]> = {}) => {
  const params = {
    offerId: 3,
    reviewIdToDelete: 7,
    viewerUserId: 1,
    offerOwnerUserId: 5,
    reloadReviews: jest.fn().mockResolvedValue(undefined),
    setOffer: jest.fn(),
    setReviewIdToDelete: jest.fn(),
    setIsDeletingReview: jest.fn(),
    ...overrides,
  };
  const { result } = renderHook(() => useConfirmDeleteReview<OfferLike>(params));
  const confirm = async () => {
    await act(async () => {
      await result.current();
    });
  };
  return { params, confirm };
};

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockTranslations = {};
  mockApiDelete.mockReset();
  mockApiDelete.mockResolvedValue({ data: {} });
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('useConfirmDeleteReview: úspešné zmazanie', () => {
  it('zmaže recenziu, načíta zoznam, upraví ponuku, zneplatní cache a zavrie potvrdenie; toast úspechu je až na konci', async () => {
    const { params, confirm } = setup();

    await confirm();

    expect(mockApiDelete).toHaveBeenCalledTimes(1);
    expect(mockApiDelete).toHaveBeenCalledWith('reviews/detail/7');
    expect(params.reloadReviews).toHaveBeenCalledTimes(1);
    expect(params.setOffer).toHaveBeenCalledTimes(1);
    expect(invalidateOffersCache).toHaveBeenCalledTimes(2);
    expect(invalidateOffersCache).toHaveBeenNthCalledWith(1, 1);
    expect(invalidateOffersCache).toHaveBeenNthCalledWith(2, 5);
    expect(params.setReviewIdToDelete).toHaveBeenCalledTimes(1);
    expect(params.setReviewIdToDelete).toHaveBeenCalledWith(null);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Recenzia bola vymazaná.');
    expect(toast.error).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    // Poradie: zmazanie, načítanie zoznamu, úprava ponuky, cache, zatvorenie a až potom toast úspechu.
    const steps = [
      order(mockApiDelete),
      order(params.reloadReviews),
      order(params.setOffer),
      order(invalidateOffersCache as jest.Mock),
      order(params.setReviewIdToDelete),
      order(toast.success as jest.Mock),
    ];
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });

  it('príznak mazania sa zapne pred zmazaním a po dokončení sa uvoľní', async () => {
    const { params, confirm } = setup();

    await confirm();

    expect(params.setIsDeletingReview.mock.calls).toEqual([[true], [false]]);
  });

  it('ponuku označí ako znova recenzovateľnú: `already_reviewed` false a `can_review` true, ostatné polia nechá', async () => {
    const { params, confirm } = setup();

    await confirm();

    const updater = params.setOffer.mock.calls[0][0] as (prev: OfferLike | null) => OfferLike | null;
    expect(updater({ id: 3, already_reviewed: true, can_review: false })).toEqual({
      id: 3,
      already_reviewed: false,
      can_review: true,
    });
    expect(updater(null)).toBeNull();
  });

  it('text toastu úspechu je z prekladu `reviews.deleteReviewSuccess`', async () => {
    mockTranslations = { 'reviews.deleteReviewSuccess': 'The review was deleted.' };
    const { confirm } = setup();

    await confirm();

    expect(toast.success).toHaveBeenCalledWith('The review was deleted.');
  });

  it.each([
    ['bez prihláseného používateľa sa zneplatní len cache vlastníka ponuky', { viewerUserId: null }, [5]],
    ['bez ID vlastníka ponuky sa zneplatní len cache prihláseného používateľa', { offerOwnerUserId: undefined }, [1]],
  ])('%s', async (_label, overrides, expectedIds) => {
    const { confirm } = setup(overrides);

    await confirm();

    expect((invalidateOffersCache as jest.Mock).mock.calls.map((call) => call[0])).toEqual(expectedIds);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });
});

describe('useConfirmDeleteReview: nič sa nemaže', () => {
  it.each([
    ['bez ID recenzie', { reviewIdToDelete: null }],
    ['bez ID ponuky', { offerId: null }],
  ])('%s: nič sa nezavolá, nič sa neukáže a príznak mazania sa nezmení', async (_label, overrides) => {
    const { params, confirm } = setup(overrides);

    await confirm();

    expect(mockApiDelete).not.toHaveBeenCalled();
    expect(params.reloadReviews).not.toHaveBeenCalled();
    expect(params.setIsDeletingReview).not.toHaveBeenCalled();
    expect(params.setReviewIdToDelete).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('useConfirmDeleteReview: zlyhanie', () => {
  it('zlyhanie zmazania so serverovým textom: toast s týmto textom, bez toastu úspechu, zoznam sa nenačíta a potvrdenie ostane', async () => {
    mockApiDelete.mockRejectedValue({ response: { data: { error: 'Recenziu nemožno zmazať.' } } });
    const { params, confirm } = setup();

    await confirm();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Recenziu nemožno zmazať.');
    expect(toast.success).not.toHaveBeenCalled();
    expect(params.reloadReviews).not.toHaveBeenCalled();
    expect(params.setOffer).not.toHaveBeenCalled();
    expect(invalidateOffersCache).not.toHaveBeenCalled();
    expect(params.setReviewIdToDelete).not.toHaveBeenCalled();
    expect(params.setIsDeletingReview.mock.calls).toEqual([[true], [false]]);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('sieťová chyba: preložený záložný text `reviews.deleteReviewFailed`, nie anglické „Network Error“', async () => {
    mockTranslations = { 'reviews.deleteReviewFailed': 'Could not delete the review.' };
    mockApiDelete.mockRejectedValue({ isAxiosError: true, message: 'Network Error' });
    const { confirm } = setup();

    await confirm();

    expect(toast.error).toHaveBeenCalledWith('Could not delete the review.');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('bez prekladu a bez textu servera: pôvodný slovenský záložný text', async () => {
    mockApiDelete.mockRejectedValue(new Error('boom'));
    const { confirm } = setup();

    await confirm();

    expect(toast.error).toHaveBeenCalledWith('Nepodarilo sa vymazať recenziu.');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('zmazanie prejde, no zoznam sa nenačíta: chyba ako doteraz, bez toastu úspechu, bez zmeny ponuky a cache, potvrdenie ostane', async () => {
    const reloadReviews = jest.fn().mockRejectedValue(new Error('reload failed'));
    const { params, confirm } = setup({ reloadReviews });

    await confirm();

    expect(mockApiDelete).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Nepodarilo sa vymazať recenziu.');
    expect(toast.success).not.toHaveBeenCalled();
    expect(params.setOffer).not.toHaveBeenCalled();
    expect(invalidateOffersCache).not.toHaveBeenCalled();
    expect(params.setReviewIdToDelete).not.toHaveBeenCalled();
    expect(params.setIsDeletingReview.mock.calls).toEqual([[true], [false]]);
  });
});

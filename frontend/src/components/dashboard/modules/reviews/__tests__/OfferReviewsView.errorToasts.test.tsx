import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';

import type { Review } from '../ReviewCard';

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

/** Preklady, ktoré test dosadí: kľúč, ktorý tu nie je, vráti záložný text z kódu. */
let mockTranslations: Record<string, string> = {};
const mockT = (key: string, fallback: string) => mockTranslations[key] ?? fallback;

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { error: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    patch: jest.fn(),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
  endpoints: {
    skills: { detail: (id: number) => `skills/${id}` },
    reviews: { list: (id: number) => `reviews/${id}`, like: (id: number) => `reviews/${id}/like` },
  },
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: mockT }) }));
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../../profile/profileOffersCache', () => ({ invalidateOffersCache: jest.fn() }));

type DesktopStubProps = {
  reviews: Review[];
  hasMoreReviews: boolean;
  loadingMoreReviews: boolean;
  onLoadMoreReviews?: () => void;
  onToggleReviewLike?: (review: Review) => void;
  pendingReviewLikeIds?: Set<number>;
};

// Ľahké náhrady podstromov: desktop ukáže počet recenzií, tlačidlo „Zobraziť ďalšie“ a pri každej recenzii tlačidlo
// „Páči sa mi“ so stavom (príznak a počet), ostatné nič.
jest.mock('../OfferReviewsDesktop', () => ({
  OfferReviewsDesktop: ({
    reviews,
    hasMoreReviews,
    loadingMoreReviews,
    onLoadMoreReviews,
    onToggleReviewLike,
    pendingReviewLikeIds,
  }: DesktopStubProps) => (
    <div>
      <span data-testid="review-count">{reviews.length}</span>
      {reviews.map((item) => (
        <button
          key={item.id}
          type="button"
          data-testid={`like-${item.id}`}
          data-liked={String(Boolean(item.is_liked_by_me))}
          data-likes={String(item.likes_count)}
          disabled={pendingReviewLikeIds?.has(item.id)}
          onClick={() => onToggleReviewLike?.(item)}
        >
          Páči sa mi
        </button>
      ))}
      <button
        type="button"
        data-testid="load-more"
        data-loading={String(loadingMoreReviews)}
        disabled={!hasMoreReviews}
        onClick={onLoadMoreReviews}
      >
        Zobraziť ďalšie
      </button>
    </div>
  ),
}));
jest.mock('../OfferReviewsMobile', () => ({ OfferReviewsMobile: () => <div /> }));
jest.mock('../AddReviewModal', () => ({ AddReviewModal: () => null }));
jest.mock('../DeleteReviewConfirmModal', () => ({ DeleteReviewConfirmModal: () => null }));
jest.mock('../ReportReviewModal', () => ({ ReportReviewModal: () => null }));
jest.mock('../../profile/ProfileOpeningHoursMobileModal', () => ({
  ProfileOpeningHoursMobileModal: () => null,
}));

import OfferReviewsView from '../OfferReviewsView';

/**
 * Chyby v `OfferReviewsView` (nález 302, osem natívnych `alert()` v troch súboroch nad 500 riadkov). Tri chyby
 * (donačítanie ďalších recenzií, „Páči sa mi“ a zmazanie recenzie) ukazovali natívne okno prehliadača, ktoré blokuje
 * stránku. Majú ukázať toast a ostatné správanie (stav, tlačidlá, modal) nechať ako bolo.
 */
const review = (id: number, liked = false): Review => ({
  id,
  reviewer_id: 2,
  reviewer_display_name: 'Prvý Používateľ',
  reviewer_avatar_url: null,
  rating: 4,
  text: `Recenzia ${id}`,
  pros: [],
  cons: [],
  likes_count: 3,
  is_liked_by_me: liked,
  created_at: '2026-05-01T10:00:00.000Z',
  updated_at: '2026-05-01T10:00:00.000Z',
});

/** Prvá strana: jedna recenzia a ďalšia strana, takže tlačidlo „Zobraziť ďalšie“ je aktívne. */
const pageWith = (results: Review[]) => ({
  results,
  total: 20,
  page: 1,
  page_size: 10,
  total_pages: 2,
  stats: { average: 4, breakdown: {} },
});
const firstPage = pageWith([review(1)]);

async function renderView() {
  // Vykreslenie v `act`: načítanie ponuky a recenzií (okamžite vyriešené sľuby) mení stav hneď po mounte.
  await act(async () => {
    render(<OfferReviewsView offerId={3} />);
  });
  await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2));
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockTranslations = {};
  window.history.replaceState(null, '', '/dashboard/offers/3/reviews');
  alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  mockApiGet.mockReset();
  mockApiPost.mockReset();
  mockApiDelete.mockReset();
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe('OfferReviewsView: zlyhané donačítanie ďalších recenzií (miesto 5)', () => {
  /** Prvá strana a detail ponuky prejdú, druhá strana recenzií zlyhá danou chybou. */
  const failSecondPageWith = (error: unknown) => {
    mockApiGet.mockImplementation((url: string, config?: { params?: { page?: number } }) => {
      if (url.startsWith('skills/')) return Promise.resolve({ data: {} });
      if (config?.params?.page === 2) return Promise.reject(error);
      return Promise.resolve({ data: firstPage });
    });
  };

  const clickLoadMore = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('load-more'));
    });
  };

  it('ukáže toast s textom zo servera, nie natívne okno; tlačidlo sa uvoľní a zoznam ostane', async () => {
    failSecondPageWith({ response: { data: { error: 'Limit požiadaviek.' } } });
    await renderView();
    expect(screen.getByTestId('review-count')).toHaveTextContent('1');

    await clickLoadMore();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Limit požiadaviek.');
    expect(screen.getByTestId('load-more')).toHaveAttribute('data-loading', 'false');
    expect(screen.getByTestId('review-count')).toHaveTextContent('1');
  });

  it('pri sieťovej chybe ukáže preložený záložný text, nie anglické „Network Error“', async () => {
    mockTranslations = { 'reviews.loadMoreError': 'Failed to load more reviews.' };
    failSecondPageWith({ isAxiosError: true, message: 'Network Error' });
    await renderView();

    await clickLoadMore();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Failed to load more reviews.');
  });

  it('úspešné donačítanie nič neukáže ani natívnym oknom, ani toastom', async () => {
    mockApiGet.mockImplementation((url: string, config?: { params?: { page?: number } }) => {
      if (url.startsWith('skills/')) return Promise.resolve({ data: {} });
      if (config?.params?.page === 2) {
        return Promise.resolve({ data: { ...firstPage, results: [review(2)], page: 2 } });
      }
      return Promise.resolve({ data: firstPage });
    });
    await renderView();

    await clickLoadMore();

    expect(screen.getByTestId('review-count')).toHaveTextContent('2');
    expect(toast.error).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('OfferReviewsView: zlyhané „Páči sa mi“ pri recenzii (miesto 6)', () => {
  /** Zoznam s jednou recenziou, ktorá je (ne)označená ako páčiaca sa; detail ponuky prejde. */
  const loadReviewWith = (liked: boolean) => {
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve({ data: url.startsWith('skills/') ? {} : pageWith([review(1, liked)]) }),
    );
  };

  const clickLike = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('like-1'));
    });
  };

  it('pridanie lajku zlyhá: toast s textom zo servera, nie natívne okno; lajk aj počet sa vrátia a tlačidlo sa uvoľní', async () => {
    loadReviewWith(false);
    mockApiPost.mockRejectedValue({ response: { data: { error: 'Najprv sa prihlás.' } } });
    await renderView();
    expect(screen.getByTestId('like-1')).toHaveAttribute('data-likes', '3');

    await clickLike();

    expect(mockApiPost).toHaveBeenCalledWith('reviews/1/like');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Najprv sa prihlás.');
    const button = screen.getByTestId('like-1');
    expect(button).toHaveAttribute('data-liked', 'false');
    expect(button).toHaveAttribute('data-likes', '3');
    expect(button).toBeEnabled();
  });

  it('odobratie lajku zlyhá sieťovou chybou: preložený záložný text, lajk aj počet sa vrátia', async () => {
    mockTranslations = { 'reviews.likeUpdateFailed': 'Could not update the like.' };
    loadReviewWith(true);
    mockApiDelete.mockRejectedValue({ isAxiosError: true, message: 'Network Error' });
    await renderView();
    expect(screen.getByTestId('like-1')).toHaveAttribute('data-liked', 'true');

    await clickLike();

    expect(mockApiDelete).toHaveBeenCalledWith('reviews/1/like');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Could not update the like.');
    const button = screen.getByTestId('like-1');
    expect(button).toHaveAttribute('data-liked', 'true');
    expect(button).toHaveAttribute('data-likes', '3');
    expect(button).toBeEnabled();
  });

  it('úspešný lajk prevezme stav zo servera a nič neukáže ani natívnym oknom, ani toastom', async () => {
    loadReviewWith(false);
    mockApiPost.mockResolvedValue({ data: { review_id: 1, is_liked_by_me: true, likes_count: 4 } });
    await renderView();

    await clickLike();

    const button = screen.getByTestId('like-1');
    expect(button).toHaveAttribute('data-liked', 'true');
    expect(button).toHaveAttribute('data-likes', '4');
    expect(toast.error).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

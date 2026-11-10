import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';

import type { Review } from '../ReviewCard';

const mockApiGet = jest.fn();

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
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  endpoints: {
    skills: { detail: (id: number) => `skills/${id}` },
    reviews: { list: (id: number) => `reviews/${id}` },
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
};

// Ľahké náhrady podstromov: desktop ukáže počet recenzií a tlačidlo „Zobraziť ďalšie“, ostatné nič.
jest.mock('../OfferReviewsDesktop', () => ({
  OfferReviewsDesktop: ({ reviews, hasMoreReviews, loadingMoreReviews, onLoadMoreReviews }: DesktopStubProps) => (
    <div>
      <span data-testid="review-count">{reviews.length}</span>
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
const review = (id: number): Review => ({
  id,
  reviewer_id: 2,
  reviewer_display_name: 'Prvý Používateľ',
  reviewer_avatar_url: null,
  rating: 4,
  text: `Recenzia ${id}`,
  pros: [],
  cons: [],
  likes_count: 3,
  is_liked_by_me: false,
  created_at: '2026-05-01T10:00:00.000Z',
  updated_at: '2026-05-01T10:00:00.000Z',
});

/** Prvá strana: jedna recenzia a ďalšia strana, takže tlačidlo „Zobraziť ďalšie“ je aktívne. */
const firstPage = {
  results: [review(1)],
  total: 20,
  page: 1,
  page_size: 10,
  total_pages: 2,
  stats: { average: 4, breakdown: {} },
};

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

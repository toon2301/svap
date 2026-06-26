import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockApiGet = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
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
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fb: string) => fb }),
}));
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock('../../profile/profileOffersCache', () => ({ invalidateOffersCache: jest.fn() }));

// Ľahké mocky child komponentov: desktop vykreslí ID recenzií + load-more tlačidlo.
jest.mock('../OfferReviewsDesktop', () => ({
  OfferReviewsDesktop: ({ reviews, onLoadMoreReviews }: any) => (
    <div>
      <span data-testid="ids">{reviews.map((r: any) => r.id).join(',')}</span>
      <button data-testid="loadmore" onClick={() => onLoadMoreReviews?.()}>
        more
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

function review(id: number) {
  return {
    id,
    reviewer_id: id,
    reviewer_display_name: 'X',
    reviewer_avatar_url: null,
    rating: 5,
    text: 't',
    pros: [],
    cons: [],
    likes_count: 0,
    is_liked_by_me: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function reviewsResponse(ids: number[], page: number, totalPages: number) {
  return {
    data: {
      results: ids.map(review),
      total: totalPages * 2,
      page,
      page_size: 2,
      total_pages: totalPages,
      stats: { average: 5, breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 2 } },
    },
  };
}

describe('OfferReviewsView – race condition pri prepnutí ponuky (BOD 8)', () => {
  it('zahodí výsledok load-more pre starú ponuku po prepnutí na inú', async () => {
    let resolveStalePage2: ((v: any) => void) | null = null;

    mockApiGet.mockImplementation((url: string, config?: any) => {
      if (url.startsWith('skills/')) return Promise.resolve({ data: {} }); // detail ponuky
      const offerId = Number(url.split('/')[1]);
      const page = config?.params?.page ?? 1;
      if (offerId === 1 && page === 1) return Promise.resolve(reviewsResponse([1, 2], 1, 3));
      if (offerId === 1 && page === 2) {
        return new Promise((res) => {
          resolveStalePage2 = res; // necháme visieť – dokončíme až po prepnutí ponuky
        });
      }
      if (offerId === 2 && page === 1) return Promise.resolve(reviewsResponse([101, 102], 1, 1));
      return Promise.resolve(reviewsResponse([], 1, 1));
    });

    const { rerender } = render(<OfferReviewsView offerId={1} />);
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('1,2'));

    // Spusti load-more pre ponuku 1 (page 2 ostane pending).
    fireEvent.click(screen.getByTestId('loadmore'));

    // Over, že load-more request pre page 2 sa naozaj odoslal a resolver je
    // nastavený. Bez tejto kontroly by optional chaining nižšie ticho preskočilo
    // volanie a test by falošne prešiel aj keby sa request vôbec neodoslal.
    await waitFor(() => expect(resolveStalePage2).not.toBeNull());

    // Používateľ medzitým prejde na ponuku 2.
    rerender(<OfferReviewsView offerId={2} />);
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('101,102'));

    // Až teraz dobehne starý request pre ponuku 1 – musí byť zahodený.
    await act(async () => {
      resolveStalePage2!(reviewsResponse([3, 4], 2, 3));
      await Promise.resolve();
    });

    // Stav stále patrí ponuke 2 (žiadne pripojenie 3,4 z cudzej ponuky).
    // Exact match (nie substring) – inak by "101,102,3,4" falošne prešlo.
    expect(screen.getByTestId('ids').textContent).toBe('101,102');
  });
});

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockApiGet = jest.fn();
const mockToast = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  endpoints: {
    skills: { detail: (id: number) => `skills/${id}` },
    reviews: {
      list: (id: number) => `reviews-list/${id}`,
      detail: (id: number) => `review-detail/${id}`,
      like: (id: number) => `review-like/${id}`,
    },
  },
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
// Stabilná referencia t (ako reálny LanguageContext, kde je t memoizované cez useCallback).
jest.mock('@/contexts/LanguageContext', () => {
  const t = (_k: string, fb: string) => fb;
  return { useLanguage: () => ({ t }) };
});
// review_id (a prípadne modal=owner_response pre reply) v URL simuluje príchod
// z notifikácie o recenzii. mockSearch je konfigurovateľné per test.
let mockSearch = 'review_id=5';
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ push: mockRouterPush }),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: (...a: any[]) => mockToast(...a) }));
jest.mock('../../profile/profileOffersCache', () => ({ invalidateOffersCache: jest.fn() }));

jest.mock('../OfferReviewsDesktop', () => ({
  OfferReviewsDesktop: ({ offer }: any) => (
    <div data-testid="offer-state">{offer ? 'offer-loaded' : 'no-offer'}</div>
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

function reviewsResponse() {
  return {
    data: {
      results: [],
      total: 0,
      page: 1,
      page_size: 10,
      total_pages: 1,
      stats: { average: 0, breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
    },
  };
}

function goToUserProfileIdentifiers(spy: jest.SpyInstance): string[] {
  return spy.mock.calls
    .map(([evt]) => evt as Event)
    .filter((evt): evt is CustomEvent => evt instanceof CustomEvent && evt.type === 'goToUserProfile')
    .map((evt) => String((evt.detail as { identifier?: string })?.identifier ?? ''));
}

describe('OfferReviewsView – notifikácia na recenziu so zmazanou ponukou', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockToast.mockReset();
    mockRouterPush.mockReset();
    mockSearch = 'review_id=5';
  });

  // Všetky tri typy notifikácií (review_created, review_liked, review_reply_created)
  // zdieľajú tú istú target_url vetvu → /dashboard/offers/<id>/reviews?review_id=<id>
  // (reply pridá &modal=owner_response). OfferReviewsView je type-agnostická: číta len
  // offerId + review_id (+ modal) z URL, takže presmerovanie funguje rovnako pre všetky.
  it.each([
    ['review_created', 'review_id=5'],
    ['review_liked', 'review_id=5'],
    ['review_reply_created', 'review_id=5&modal=owner_response'],
  ])(
    'príchod z %s + zmazaná ponuka → presmeruje na profil reviewed_user + toast',
    async (_type, search) => {
      mockSearch = search;
      // skills/<id> aj reviews-list 404 (ponuka zmazaná), review-detail vráti offer=null.
      mockApiGet.mockImplementation((url: string) => {
        if (url.startsWith('skills/')) return Promise.reject({ response: { status: 404 } });
        if (url.startsWith('review-detail/')) {
          return Promise.resolve({ data: { offer: null, reviewed_user_id: 42 } });
        }
        if (url.startsWith('reviews-list/')) return Promise.reject({ response: { status: 404 } });
        return Promise.resolve({ data: {} });
      });
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      render(<OfferReviewsView offerId={5} />);

      await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
      // Presmerovanie na profil recenzovaného používateľa (reviewed_user_id=42).
      await waitFor(() => expect(goToUserProfileIdentifiers(dispatchSpy)).toContain('42'));

      dispatchSpy.mockRestore();
    },
  );

  it('existujúca ponuka → funguje ako doteraz (žiadny toast, žiadne presmerovanie)', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.startsWith('skills/')) {
        return Promise.resolve({ data: { id: 5, user_id: 9, category_label: 'IT' } });
      }
      if (url.startsWith('reviews-list/')) return Promise.resolve(reviewsResponse());
      return Promise.resolve({ data: {} });
    });
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    render(<OfferReviewsView offerId={5} />);

    // Ponuka sa načíta normálne.
    await waitFor(() => expect(screen.getByTestId('offer-state')).toHaveTextContent('offer-loaded'));
    // Žiadny review-detail fetch, žiadny toast, žiadne presmerovanie.
    const fetchedReviewDetail = mockApiGet.mock.calls.some(([url]) =>
      String(url).startsWith('review-detail/'),
    );
    expect(fetchedReviewDetail).toBe(false);
    expect(mockToast).not.toHaveBeenCalled();
    expect(goToUserProfileIdentifiers(dispatchSpy)).toHaveLength(0);

    dispatchSpy.mockRestore();
  });

  it('neskorá odpoveď po prepnutí ponuky → žiadny toast/redirect (stale)', async () => {
    // review-detail necháme visieť; medzitým používateľ prejde na inú ponuku.
    let resolveReviewDetail: ((v: unknown) => void) | null = null;
    mockApiGet.mockImplementation((url: string) => {
      if (url === 'skills/5') return Promise.reject({ response: { status: 404 } });
      if (url === 'skills/7') {
        return Promise.resolve({ data: { id: 7, user_id: 9, category_label: 'IT' } });
      }
      if (url.startsWith('review-detail/')) {
        return new Promise((res) => {
          resolveReviewDetail = res; // odložená odpoveď – dokončíme až po prepnutí
        });
      }
      if (url.startsWith('reviews-list/')) return Promise.reject({ response: { status: 404 } });
      return Promise.resolve({ data: {} });
    });
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const { rerender } = render(<OfferReviewsView offerId={5} />);

    // Over, že review-detail request pre zmazanú ponuku 5 sa naozaj odoslal.
    await waitFor(() => expect(resolveReviewDetail).not.toBeNull());

    // Používateľ sa medzitým presunie na inú (platnú) ponuku 7.
    rerender(<OfferReviewsView offerId={7} />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-state')).toHaveTextContent('offer-loaded'),
    );

    // Až teraz dorazí neskorá odpoveď pre pôvodnú ponuku 5 (offer=null).
    await act(async () => {
      resolveReviewDetail!({ data: { offer: null, reviewed_user_id: 42 } });
      await Promise.resolve();
    });

    // Kontext sa zmenil (offerId je už 7) → žiadny toast, žiadne presmerovanie.
    expect(mockToast).not.toHaveBeenCalled();
    expect(goToUserProfileIdentifiers(dispatchSpy)).toHaveLength(0);

    dispatchSpy.mockRestore();
  });

  // Nedostupná recenzia (403/404) → neutrálna hláška + návrat na nástenku, NIE na profil.
  it.each([404, 403])(
    '%s z reviews.detail → toast "obsah nedostupný" + redirect na /dashboard (nie profil)',
    async (statusCode) => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.startsWith('skills/')) return Promise.reject({ response: { status: 404 } });
        if (url.startsWith('review-detail/')) {
          return Promise.reject({ response: { status: statusCode } });
        }
        if (url.startsWith('reviews-list/')) return Promise.reject({ response: { status: 404 } });
        return Promise.resolve({ data: {} });
      });
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      render(<OfferReviewsView offerId={5} />);

      await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/dashboard'));
      expect(mockToast).toHaveBeenCalledWith('Tento obsah už nie je dostupný.');
      // Žiadne presmerovanie na profil recenzovaného.
      expect(goToUserProfileIdentifiers(dispatchSpy)).toHaveLength(0);

      dispatchSpy.mockRestore();
    },
  );

  it('200 + offer=null bez reviewed_user_id → toast "obsah nedostupný" + /dashboard', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.startsWith('skills/')) return Promise.reject({ response: { status: 404 } });
      if (url.startsWith('review-detail/')) {
        return Promise.resolve({ data: { offer: null, reviewed_user_id: null } });
      }
      if (url.startsWith('reviews-list/')) return Promise.reject({ response: { status: 404 } });
      return Promise.resolve({ data: {} });
    });
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    render(<OfferReviewsView offerId={5} />);

    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/dashboard'));
    expect(mockToast).toHaveBeenCalledWith('Tento obsah už nie je dostupný.');
    expect(goToUserProfileIdentifiers(dispatchSpy)).toHaveLength(0);

    dispatchSpy.mockRestore();
  });

  it('neskorá 404 odpoveď po prepnutí ponuky → žiadny toast/redirect (stale, nová vetva)', async () => {
    let rejectReviewDetail: ((e: unknown) => void) | null = null;
    mockApiGet.mockImplementation((url: string) => {
      if (url === 'skills/5') return Promise.reject({ response: { status: 404 } });
      if (url === 'skills/7') {
        return Promise.resolve({ data: { id: 7, user_id: 9, category_label: 'IT' } });
      }
      if (url.startsWith('review-detail/')) {
        return new Promise((_res, rej) => {
          rejectReviewDetail = rej; // odložené 404 – zamietneme až po prepnutí
        });
      }
      if (url.startsWith('reviews-list/')) return Promise.reject({ response: { status: 404 } });
      return Promise.resolve({ data: {} });
    });
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const { rerender } = render(<OfferReviewsView offerId={5} />);
    await waitFor(() => expect(rejectReviewDetail).not.toBeNull());

    rerender(<OfferReviewsView offerId={7} />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-state')).toHaveTextContent('offer-loaded'),
    );

    // Až teraz dorazí neskoré 404 pre pôvodnú ponuku 5.
    await act(async () => {
      rejectReviewDetail!({ response: { status: 404 } });
      await Promise.resolve();
      await Promise.resolve();
    });

    // Stale kontext → catch vetva nič nespraví.
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(goToUserProfileIdentifiers(dispatchSpy)).toHaveLength(0);

    dispatchSpy.mockRestore();
  });
});

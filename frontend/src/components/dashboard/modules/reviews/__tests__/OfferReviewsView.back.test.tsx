import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OfferReviewsBackProvider } from '../../../contexts/OfferReviewsBackContext';
import {
  markOfferReviewsPending,
  resetOfferReviewsOrigin,
  returnToOfferReviewsOrigin,
} from '../offerReviewsOrigin';

const mockApiGet = jest.fn();

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
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fb: string) => fb }),
}));
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../../profile/profileOffersCache', () => ({ invalidateOffersCache: jest.fn() }));

// Ľahké mocky podstromov: desktop ukáže, či dostal šípku späť.
jest.mock('../OfferReviewsDesktop', () => ({
  OfferReviewsDesktop: ({ onBack }: { onBack?: () => void }) =>
    onBack ? (
      <button type="button" data-testid="desktop-back" onClick={onBack}>
        späť
      </button>
    ) : (
      <span data-testid="desktop-no-back" />
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

const REVIEWS_PATH = '/dashboard/offers/3/reviews';

async function renderView(ui: React.ReactElement) {
  let result!: ReturnType<typeof render>;
  // Vykreslenie v `act`: načítanie ponuky a recenzií (okamžite vyriešené sľuby)
  // mení stav hneď po mounte a nesmie skončiť mimo `act`.
  await act(async () => {
    result = render(ui);
  });
  await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2));
  return result;
}

beforeEach(() => {
  resetOfferReviewsOrigin();
  window.history.replaceState(null, '', REVIEWS_PATH);
  mockApiGet.mockReset();
  mockApiGet.mockImplementation((url: string) =>
    Promise.resolve(
      url.startsWith('skills/')
        ? { data: {} }
        : {
            data: {
              results: [],
              total: 0,
              page: 1,
              page_size: 10,
              total_pages: 1,
              stats: { average: 0, breakdown: {} },
            },
          },
    ),
  );
});

describe('OfferReviewsView – pôvod stránky a šípka späť', () => {
  it('po zobrazení prevezme pôvod, ktorý si zapamätalo otvorenie z karty ponuky', async () => {
    markOfferReviewsPending(`${REVIEWS_PATH}?returnTo=%2Fdashboard%2Fusers%2Fpeter`);
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});

    try {
      await renderView(<OfferReviewsView offerId={3} />);

      expect(returnToOfferReviewsOrigin()).toBe(true);
      expect(backSpy).toHaveBeenCalledTimes(1);
    } finally {
      backSpy.mockRestore();
    }
  });

  it('bez otvorenia z karty (priamy vstup, notifikácia) pôvod nevznikne', async () => {
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});

    try {
      await renderView(<OfferReviewsView offerId={3} />);

      expect(returnToOfferReviewsOrigin()).toBe(false);
      expect(backSpy).not.toHaveBeenCalled();
    } finally {
      backSpy.mockRestore();
    }
  });

  it('desktopová verzia dostane šípku z dashboardu a kliknutie volá jeho handler', async () => {
    const onBack = jest.fn();
    await renderView(
      <OfferReviewsBackProvider onBack={onBack}>
        <OfferReviewsView offerId={3} />
      </OfferReviewsBackProvider>,
    );

    fireEvent.click(screen.getByTestId('desktop-back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('bez dashboardu (bez providera) desktopová verzia šípku nedostane', async () => {
    await renderView(<OfferReviewsView offerId={3} />);

    expect(screen.queryByTestId('desktop-back')).not.toBeInTheDocument();
    expect(screen.getByTestId('desktop-no-back')).toBeInTheDocument();
  });
});

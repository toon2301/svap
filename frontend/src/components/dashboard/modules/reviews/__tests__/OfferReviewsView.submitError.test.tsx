import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { Review } from '../ReviewCard';

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiPatch = jest.fn();
const mockInvalidateOffersCache = jest.fn();

/** Preklady, ktoré test dosadí: kľúč, ktorý tu nie je, vráti záložný text z kódu. */
let mockTranslations: Record<string, string> = {};
const mockT = (key: string, fallback: string) => mockTranslations[key] ?? fallback;

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    patch: (...args: unknown[]) => mockApiPatch(...args),
    delete: jest.fn(),
  },
  endpoints: {
    skills: { detail: (id: number) => `skills/${id}` },
    reviews: {
      list: (id: number) => `reviews/${id}`,
      like: (id: number) => `reviews/${id}/like`,
      detail: (id: number) => `reviews/detail/${id}`,
    },
  },
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: mockT }) }));
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../../profile/profileOffersCache', () => ({
  invalidateOffersCache: (...args: unknown[]) => mockInvalidateOffersCache(...args),
}));

type DesktopStubProps = {
  reviews: Review[];
  can_review?: boolean;
  already_reviewed?: boolean;
  onAddReviewClick?: () => void;
  onEditReview?: (review: Review) => void;
};

// Ľahká náhrada desktopového podstromu: počet recenzií, príznaky ponuky, tlačidlo „Pridať recenziu“ a pri každej
// recenzii tlačidlo „Upraviť“. Okno „Pridať recenziu“ (`AddReviewModal`) je skutočné, aby sa overila celá cesta od
// `catch` v `onSubmit` po text v okne.
jest.mock('../OfferReviewsDesktop', () => ({
  OfferReviewsDesktop: ({ reviews, can_review, already_reviewed, onAddReviewClick, onEditReview }: DesktopStubProps) => (
    <div>
      <span data-testid="review-count">{reviews.length}</span>
      <span
        data-testid="offer-flags"
        data-can-review={String(can_review)}
        data-already-reviewed={String(already_reviewed)}
      />
      <button type="button" data-testid="open-add" onClick={onAddReviewClick}>
        Pridať recenziu
      </button>
      {reviews.map((item) => (
        <button key={item.id} type="button" data-testid={`edit-${item.id}`} onClick={() => onEditReview?.(item)}>
          Upraviť
        </button>
      ))}
    </div>
  ),
}));
jest.mock('../OfferReviewsMobile', () => ({ OfferReviewsMobile: () => <div /> }));
jest.mock('../DeleteReviewConfirmModal', () => ({ DeleteReviewConfirmModal: () => null }));
jest.mock('../ReportReviewModal', () => ({ ReportReviewModal: () => null }));
jest.mock('../../profile/ProfileOpeningHoursMobileModal', () => ({
  ProfileOpeningHoursMobileModal: () => null,
}));

import OfferReviewsView from '../OfferReviewsView';

/**
 * Odoslanie recenzie v `OfferReviewsView` (nález 336): okno „Pridať recenziu“ (desktopové aj mobilné) ukáže text, ktorý
 * vyhodí `onSubmit`. Tento súbor drží cesty, ktoré sa opravou nemajú zmeniť: text zo servera (`data.error` a chyby polí
 * `rating`, `text`, `pros`, `cons`) sa ukáže v okne; pridanie volá `POST` a úprava `PATCH` s telom z formulára, po úspechu
 * sa zoznam načíta odznova od 1. strany a okno sa zatvorí. Prechádzajú pred opravou aj po nej.
 */
type WindowKind = 'desktop' | 'mobile';

const KINDS: WindowKind[] = ['desktop', 'mobile'];

const review = (id: number, rating = 4, text = `Recenzia ${id}`): Review => ({
  id,
  reviewer_id: 1,
  reviewer_display_name: 'Prvý Používateľ',
  reviewer_avatar_url: null,
  rating,
  text,
  pros: [],
  cons: [],
  likes_count: 0,
  is_liked_by_me: false,
  created_at: '2026-05-01T10:00:00.000Z',
  updated_at: '2026-05-01T10:00:00.000Z',
});

/** Stav „servera“: zoznam, ktorý vráti `GET` na zoznam recenzií (po úspešnom odoslaní ho test zmení). */
let serverReviews: Review[] = [];

const reviewsPage = () => ({
  results: serverReviews,
  total: serverReviews.length,
  page: 1,
  page_size: 10,
  total_pages: 1,
  stats: { average: 4, breakdown: {} },
});

/** Chyba axiosu s odpoveďou servera. */
const serverError = (status: number, data: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });

const originalMatchMedia = window.matchMedia;

/** Okno „Pridať recenziu“ je na šírke od 1024 px desktopové, inak mobilné (`matchMedia` sa v jsdom napodobňuje). */
function chooseWindow(kind: WindowKind) {
  (window as unknown as { matchMedia: unknown }).matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: kind === 'desktop',
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

async function renderView() {
  mockApiGet.mockImplementation((url: string) => {
    if (url.startsWith('skills/')) return Promise.resolve({ data: { can_review: true, already_reviewed: false } });
    return Promise.resolve({ data: reviewsPage() });
  });
  // Vykreslenie v `act`: načítanie ponuky a recenzií (okamžite vyriešené sľuby) mení stav hneď po mounte.
  await act(async () => {
    render(<OfferReviewsView offerId={3} />);
  });
  await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2));
}

/** Otvorí okno tlačidlom „Pridať recenziu“ alebo „Upraviť“ pri recenzii a overí, že je to očakávané (desktopové či mobilné) okno. */
async function openWindow(kind: WindowKind, trigger: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(trigger));
  });
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAttribute('aria-labelledby', `add-review-modal-title-${kind}`);
  return dialog;
}

const rate = (dialog: HTMLElement, stars: number) =>
  fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(`^${stars} `) }));

/** Tlačidlo na odoslanie: „Pridať“ pri novej recenzii, „Uložiť“ pri úprave. */
const submitButton = (dialog: HTMLElement, editing: boolean) =>
  within(dialog).getByRole('button', {
    name: editing ? mockT('common.save', 'Uložiť') : mockT('reviews.submit', 'Pridať'),
  });

async function submit(dialog: HTMLElement, editing = false) {
  await act(async () => {
    fireEvent.click(submitButton(dialog, editing));
  });
}

/** Text chyby, ktorý okno ukazuje (alebo `null`, keď chyba nie je). */
const shownError = (dialog: HTMLElement) => dialog.querySelector('.error-alert-modern')?.textContent ?? null;

/** Vypíše do poľa plusov alebo mínusov jednu položku a potvrdí ju klávesom Enter. */
function addItem(dialog: HTMLElement, placeholder: string, value: string) {
  const input = within(dialog).getByPlaceholderText(placeholder);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

/** Neúspešné odoslanie sa loguje do konzoly (`console.error`), test ju tlmí a overuje, že sa zalogovalo. */
let consoleError: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockTranslations = {};
  serverReviews = [];
  window.history.replaceState(null, '', '/dashboard/offers/3/reviews');
  mockApiGet.mockReset();
  mockApiPost.mockReset();
  mockApiPatch.mockReset();
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleError.mockRestore();
  (window as unknown as { matchMedia: unknown }).matchMedia = originalMatchMedia;
});

describe.each(KINDS)('OfferReviewsView: odoslanie recenzie, okno %s', (kind) => {
  beforeEach(() => {
    chooseWindow(kind);
  });

  describe('chyba s textom zo servera (nemení sa)', () => {
    it('`data.error`: okno ukáže tento text a ostane otvorené; zoznam sa nenačíta odznova', async () => {
      mockApiPost.mockRejectedValue(serverError(400, { error: 'Túto ponuku ste už hodnotili.' }));
      await renderView();
      const dialog = await openWindow(kind, 'open-add');
      rate(dialog, 4);

      await submit(dialog);

      expect(shownError(dialog)).toBe('Túto ponuku ste už hodnotili.');
      expect(screen.getByRole('dialog')).toBe(dialog);
      expect(submitButton(dialog, false)).toBeEnabled();
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(mockInvalidateOffersCache).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith('Chyba pri ukladaní recenzie:', expect.anything());
    });

    it.each(['rating', 'text', 'pros', 'cons'])('chyba poľa `%s`: okno ukáže jej prvú položku', async (field) => {
      mockApiPost.mockRejectedValue(serverError(400, { [field]: ['Prvá chyba poľa.', 'Druhá chyba poľa.'] }));
      await renderView();
      const dialog = await openWindow(kind, 'open-add');
      rate(dialog, 4);

      await submit(dialog);

      expect(shownError(dialog)).toBe('Prvá chyba poľa.');
      expect(mockApiPost).toHaveBeenCalledTimes(1);
    });

    it('chyba pri úprave (`PATCH`): okno ukáže text zo servera', async () => {
      serverReviews = [review(7, 3, 'Pôvodný text')];
      mockApiPatch.mockRejectedValue(serverError(403, { error: 'Cudziu recenziu upraviť nemožno.' }));
      await renderView();
      const dialog = await openWindow(kind, 'edit-7');

      await submit(dialog, true);

      expect(shownError(dialog)).toBe('Cudziu recenziu upraviť nemožno.');
      expect(mockApiPatch).toHaveBeenCalledTimes(1);
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('po chybe sa druhý, úspešný pokus odošle a okno sa zatvorí', async () => {
      mockApiPost
        .mockRejectedValueOnce(serverError(400, { error: 'Skúste to o chvíľu.' }))
        .mockImplementationOnce(async () => {
          serverReviews = [review(10, 4, 'Recenzia 10')];
          return { data: {} };
        });
      await renderView();
      const dialog = await openWindow(kind, 'open-add');
      rate(dialog, 4);
      await submit(dialog);
      expect(shownError(dialog)).toBe('Skúste to o chvíľu.');

      await submit(dialog);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mockApiPost).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('review-count')).toHaveTextContent('1');
    });
  });

  describe('úspešné odoslanie (nemení sa)', () => {
    it('pridanie: `POST` s telom z formulára, potom zoznam od 1. strany, okno sa zatvorí a ponuka je „už hodnotená“', async () => {
      mockApiPost.mockImplementation(async () => {
        serverReviews = [review(10, 4, 'Skvelá služba')];
        return { data: {} };
      });
      await renderView();
      expect(screen.getByTestId('offer-flags')).toHaveAttribute('data-already-reviewed', 'false');
      const dialog = await openWindow(kind, 'open-add');
      rate(dialog, 4);
      fireEvent.change(within(dialog).getByPlaceholderText('Napíšte svoju recenziu...'), {
        target: { value: '  Skvelá služba  ' },
      });
      addItem(dialog, 'Napíšte plus a stlačte Enter', 'Rýchlo');
      addItem(dialog, 'Napíšte mínus a stlačte Enter', 'Drahé');

      await submit(dialog);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockApiPost).toHaveBeenCalledWith('reviews/3', {
        rating: 4,
        text: 'Skvelá služba',
        pros: ['Rýchlo'],
        cons: ['Drahé'],
      });
      expect(mockApiPatch).not.toHaveBeenCalled();
      expect(mockApiGet).toHaveBeenCalledTimes(3);
      expect(mockApiGet).toHaveBeenLastCalledWith('reviews/3', { params: { page: 1, page_size: 10 } });
      expect(screen.getByTestId('review-count')).toHaveTextContent('1');
      expect(screen.getByTestId('offer-flags')).toHaveAttribute('data-already-reviewed', 'true');
      expect(screen.getByTestId('offer-flags')).toHaveAttribute('data-can-review', 'false');
      expect(mockInvalidateOffersCache).toHaveBeenCalledWith(1);
    });

    it('úprava: `PATCH` na detail recenzie (nie `POST`), potom zoznam od 1. strany, okno sa zatvorí a príznaky ponuky ostanú', async () => {
      serverReviews = [review(7, 3, 'Pôvodný text')];
      mockApiPatch.mockImplementation(async () => {
        serverReviews = [review(7, 5, 'Nový text')];
        return { data: {} };
      });
      await renderView();
      const dialog = await openWindow(kind, 'edit-7');
      expect(within(dialog).getByRole('heading', { name: 'Upraviť recenziu' })).toBeInTheDocument();
      expect(within(dialog).getByPlaceholderText('Napíšte svoju recenziu...')).toHaveValue('Pôvodný text');
      rate(dialog, 5);
      fireEvent.change(within(dialog).getByPlaceholderText('Napíšte svoju recenziu...'), {
        target: { value: 'Nový text' },
      });

      await submit(dialog, true);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mockApiPatch).toHaveBeenCalledTimes(1);
      expect(mockApiPatch).toHaveBeenCalledWith('reviews/detail/7', { rating: 5, text: 'Nový text', pros: [], cons: [] });
      expect(mockApiPost).not.toHaveBeenCalled();
      expect(mockApiGet).toHaveBeenCalledTimes(3);
      expect(mockApiGet).toHaveBeenLastCalledWith('reviews/3', { params: { page: 1, page_size: 10 } });
      expect(screen.getByTestId('offer-flags')).toHaveAttribute('data-already-reviewed', 'false');
      expect(mockInvalidateOffersCache).toHaveBeenCalledWith(1);
    });
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OfferWatchApiError } from '../offerWatchApi';
import type { OfferWatch, OfferWatchMatch } from '../types';
import { useOfferWatchMatches, type UseOfferWatchMatchesResult } from '../useOfferWatchMatches';
import OfferWatchResultsMatchesPanel from './OfferWatchResultsMatchesPanel';

jest.mock('../useOfferWatchMatches', () => ({ useOfferWatchMatches: jest.fn() }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));
jest.mock('./OfferWatchMatchGrid', () => ({
  __esModule: true,
  default: ({ matches, watchUpdatedAt }: {
    matches: OfferWatchMatch[];
    watchUpdatedAt: string;
  }) => (
    <div data-testid='matches-grid' data-updated-at={watchUpdatedAt}>
      {matches.map(({ offer }) => <article key={offer.id}>Karta {offer.id}</article>)}
    </div>
  ),
}));

const mockedHook = jest.mocked(useOfferWatchMatches);
const onWatchUnavailable = jest.fn();
const watch: OfferWatch = {
  id: 7,
  category: 'Domácnosť a služby',
  subcategory: 'Maliarske práce',
  isSeeking: false,
  countryCode: 'SK',
  districtCode: '',
  districtLabel: '',
  priceMin: null,
  priceMax: null,
  priceCurrency: '',
  createdAt: '2026-09-01T08:00:00Z',
  updatedAt: '2026-09-02T08:00:00Z',
};

function matches(count = 2): OfferWatchMatch[] {
  return Array.from({ length: count }, (_, index) => ({
    offer: { id: count - index, category: watch.category, subcategory: watch.subcategory, description: '' },
    createdAt: watch.createdAt,
  }));
}

function hookResult(overrides: Partial<UseOfferWatchMatchesResult> = {}): UseOfferWatchMatchesResult {
  return {
    matches: [],
    nextCursor: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    refresh: jest.fn().mockResolvedValue({ ok: true, value: null }),
    loadMore: jest.fn().mockResolvedValue({ ok: true, value: null }),
    clearError: jest.fn(),
    ...overrides,
  };
}

function renderPanel(state: UseOfferWatchMatchesResult) {
  mockedHook.mockReturnValue(state);
  return render(<OfferWatchResultsMatchesPanel watch={watch} onWatchUnavailable={onWatchUnavailable} />);
}

function expectBefore(first: Element, second: Element) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe('OfferWatchResultsMatchesPanel error placement', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([1, 10, 20])('places one page-error notice after ALL %i preserved cards', (count) => {
    const state = hookResult({
      matches: matches(count),
      nextCursor: 'failed-page',
      error: new OfferWatchApiError('network'),
    });
    renderPanel(state);

    const cards = screen.getAllByRole('article');
    const alert = screen.getByRole('alert');
    expect(cards.map((card) => card.textContent)).toEqual(state.matches.map(({ offer }) => `Karta ${offer.id}`));
    expectBefore(cards[cards.length - 1], alert);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Skúsiť znova' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Zobraziť ďalšie' })).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Skúsiť znova' }));
    expect(state.loadMore).toHaveBeenCalledTimes(1);
    expect(state.refresh).not.toHaveBeenCalled();
  });

  it('keeps a first-page error above the content and retries refresh', () => {
    const state = hookResult({ error: new OfferWatchApiError('network') });
    renderPanel(state);

    expect(screen.getByRole('alert')).toHaveClass('border-red-200');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText('Zatiaľ žiadne zhody')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skúsiť znova' }));
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(state.loadMore).not.toHaveBeenCalled();
  });

  it('keeps a refresh error above preserved cards and does not retry pagination', () => {
    const state = hookResult({ matches: matches(), error: new OfferWatchApiError('network') });
    renderPanel(state);

    const alert = screen.getByRole('alert');
    expectBefore(alert, screen.getAllByRole('article')[0]);
    expect(alert).toHaveClass('border-amber-200');
    fireEvent.click(within(alert).getByRole('button', { name: 'Skúsiť znova' }));
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(state.loadMore).not.toHaveBeenCalled();
  });

  it.each([{ isLoading: true }, { isLoadingMore: true }])('disables refresh and retry while a request is pending (%j)', (pending) => {
    const state = hookResult({
      matches: matches(), nextCursor: 'next', error: new OfferWatchApiError('network'), ...pending,
    });
    renderPanel(state);
    const retry = screen.getByRole('button', { name: 'Skúsiť znova' });
    expect(retry).toBeDisabled();
    expect(screen.getByRole('button', { name: pending.isLoading ? 'Obnovujem...' : 'Obnoviť' })).toBeDisabled();
    fireEvent.click(retry);
    expect(state.loadMore).not.toHaveBeenCalled();
    expect(state.refresh).not.toHaveBeenCalled();
  });

  it('shows loading-more during retry, then one bottom notice on repeated failure and no notice after success', () => {
    const original = matches(10);
    const state = hookResult({ matches: original, nextCursor: 'next', error: new OfferWatchApiError('network') });
    const { rerender } = renderPanel(state);
    const update = (overrides: Partial<UseOfferWatchMatchesResult>) => {
      mockedHook.mockReturnValue({ ...state, ...overrides });
      rerender(<OfferWatchResultsMatchesPanel watch={watch} onWatchUnavailable={onWatchUnavailable} />);
    };

    update({ error: null, isLoadingMore: true });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Načítavam ďalšie...' })).toBeDisabled();
    expect(screen.getAllByRole('article')).toHaveLength(10);
    update({ error: new OfferWatchApiError('network') });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expectBefore(screen.getAllByRole('article')[9], screen.getByRole('alert'));
    expect(screen.getByRole('button', { name: 'Skúsiť znova' })).toBeEnabled();
    update({ error: null, matches: [...original, { ...original[0], offer: { ...original[0].offer, id: 11 } }] });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(11);
    expect(screen.getByRole('button', { name: 'Zobraziť ďalšie' })).toBeEnabled();
    update({ error: null, nextCursor: null });
    expect(screen.queryByRole('button', { name: 'Zobraziť ďalšie' })).not.toBeInTheDocument();
  });

  it('shows an accessible initial loading state without an empty state or cards', () => {
    renderPanel(hookResult({ isLoading: true }));
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Načítavam výsledky...')).toHaveClass('sr-only');
    expect(screen.queryByText('Zatiaľ žiadne zhody')).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Obnoviť' })).toBeDisabled();
  });

  it('shows the existing empty state only after a successful empty response', () => {
    renderPanel(hookResult());
    expect(screen.getByText('Zatiaľ žiadne zhody')).toBeInTheDocument();
    expect(screen.getByText('Keď pribudne zodpovedajúca ponuka alebo dopyt, zobrazí sa tu.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps normal refresh and pagination actions wired independently', () => {
    const state = hookResult({ matches: matches(), nextCursor: 'next' });
    renderPanel(state);
    expect(mockedHook).toHaveBeenCalledWith(watch.id);
    expect(screen.getByTestId('matches-grid')).toHaveAttribute('data-updated-at', watch.updatedAt);
    fireEvent.click(screen.getByRole('button', { name: 'Obnoviť' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zobraziť ďalšie' }));
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(state.loadMore).toHaveBeenCalledTimes(1);
  });

  it('preserves cards while refreshing and disables pagination until it completes', () => {
    renderPanel(hookResult({ matches: matches(), nextCursor: 'next', isLoading: true }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Obnovujem...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zobraziť ďalšie' })).toBeDisabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('recovers a missing watch once despite subsequent error and callback identities', () => {
    const { rerender } = renderPanel(hookResult({ error: new OfferWatchApiError('not_found') }));
    expect(onWatchUnavailable).toHaveBeenCalledTimes(1);
    mockedHook.mockReturnValue(hookResult({ error: new OfferWatchApiError('not_found') }));
    const secondCallback = jest.fn();
    rerender(<OfferWatchResultsMatchesPanel watch={watch} onWatchUnavailable={secondCallback} />);
    expect(secondCallback).not.toHaveBeenCalled();
    expect(onWatchUnavailable).toHaveBeenCalledTimes(1);
  });
});

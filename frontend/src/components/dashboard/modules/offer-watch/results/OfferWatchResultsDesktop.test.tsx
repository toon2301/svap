import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OfferWatchApiError } from '../offerWatchApi';
import type { OfferWatch, OfferWatchMatch } from '../types';
import type { UseOfferWatchesResult } from '../useOfferWatches';
import { useOfferWatches } from '../useOfferWatches';
import type { UseOfferWatchMatchesResult } from '../useOfferWatchMatches';
import { useOfferWatchMatches } from '../useOfferWatchMatches';
import OfferWatchResultsDesktop from './OfferWatchResultsDesktop';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
jest.mock('../useOfferWatches', () => ({ useOfferWatches: jest.fn() }));
jest.mock('../useOfferWatchMatches', () => ({ useOfferWatchMatches: jest.fn() }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    country: 'SK',
    setCountry: jest.fn(),
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));
jest.mock('../../profile/ProfileOfferCard', () => ({
  __esModule: true,
  default: ({ offer }: { offer: { id: number; subcategory: string } }) => (
    <div data-testid={`offer-card-${offer.id}`}>{offer.subcategory}</div>
  ),
}));
jest.mock('../../profile/ProfileOfferCardSkeleton', () => ({
  ProfileOfferCardSkeleton: () => <div data-testid='offer-card-skeleton' />,
}));
jest.mock('@/components/search/SearchOfferCardAuthorHeader', () => ({
  SearchOfferCardAuthorHeader: ({
    displayName,
    onProfileClick,
  }: {
    displayName: string;
    onProfileClick: () => void;
  }) => <button type='button' onClick={onProfileClick}>{displayName}</button>,
}));
jest.mock('../../profile/openUserProfileFromSearch', () => ({
  openUserProfileFromSearch: jest.fn(),
}));

const mockedUseOfferWatches = jest.mocked(useOfferWatches);
const mockedUseOfferWatchMatches = jest.mocked(useOfferWatchMatches);
const onManage = jest.fn();

function watch(id: number, createdAt: string, subcategory: string): OfferWatch {
  return {
    id,
    category: 'Domácnosť a služby',
    subcategory,
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    districtLabel: '',
    priceMin: null,
    priceMax: null,
    priceCurrency: '',
    createdAt,
    updatedAt: createdAt,
  };
}

function match(id: number, ageHours = 1): OfferWatchMatch {
  return {
    offer: {
      id,
      category: 'Domácnosť a služby',
      subcategory: `Ponuka ${id}`,
      description: '',
      user_id: 100 + id,
      user_display_name: `Používateľ ${id}`,
      owner_user_type: 'individual',
    },
    createdAt: new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString(),
  };
}

function watchesResult(
  overrides: Partial<UseOfferWatchesResult> = {},
): UseOfferWatchesResult {
  return {
    watches: [],
    isLoading: false,
    mutation: null,
    error: null,
    reload: jest.fn().mockResolvedValue({ ok: true, value: [] }),
    createWatch: jest.fn(),
    updateWatch: jest.fn(),
    deleteWatch: jest.fn(),
    clearError: jest.fn(),
    ...overrides,
  } as UseOfferWatchesResult;
}

function matchesResult(
  overrides: Partial<UseOfferWatchMatchesResult> = {},
): UseOfferWatchMatchesResult {
  return {
    matches: [],
    nextCursor: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    refresh: jest.fn().mockResolvedValue({
      ok: true,
      value: { results: [], nextCursor: null, previousCursor: null },
    }),
    loadMore: jest.fn().mockResolvedValue({ ok: true, value: null }),
    clearError: jest.fn(),
    ...overrides,
  };
}

describe('OfferWatchResultsDesktop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/dashboard/watches');
    mockedUseOfferWatches.mockReturnValue(watchesResult());
    mockedUseOfferWatchMatches.mockReturnValue(matchesResult());
  });

  it('shows a non-interactive skeleton while the watch list initially loads', () => {
    mockedUseOfferWatches.mockReturnValue(watchesResult({ isLoading: true }));

    render(<OfferWatchResultsDesktop onManage={onManage} />);

    expect(screen.getByTestId('offer-watch-results-skeleton')).toHaveAttribute('aria-busy', 'true');
    expect(mockedUseOfferWatchMatches).not.toHaveBeenCalled();
  });

  it('selects the newest watch by default and persists it in the URL', async () => {
    const older = watch(1, '2026-09-01T08:00:00Z', 'Staršie sledovanie');
    const newest = watch(2, '2026-09-02T08:00:00Z', 'Najnovšie sledovanie');
    mockedUseOfferWatches.mockReturnValue(watchesResult({ watches: [older, newest] }));

    render(<OfferWatchResultsDesktop onManage={onManage} />);

    const newestButton = await screen.findByRole('button', { name: /Najnovšie sledovanie/ });
    expect(newestButton).toHaveAttribute('aria-pressed', 'true');
    expect(mockedUseOfferWatchMatches).toHaveBeenLastCalledWith(2);
    await waitFor(() => expect(window.location.search).toBe('?watch=2'));
  });

  it('restores a valid URL selection and changes it explicitly without pushing history', async () => {
    window.history.replaceState({}, '', '/dashboard/watches?watch=1&from=test#matches');
    const older = watch(1, '2026-09-01T08:00:00Z', 'Staršie sledovanie');
    const newest = watch(2, '2026-09-02T08:00:00Z', 'Najnovšie sledovanie');
    mockedUseOfferWatches.mockReturnValue(watchesResult({ watches: [older, newest] }));

    render(<OfferWatchResultsDesktop onManage={onManage} />);

    const olderButton = screen.getByRole('button', { name: /Staršie sledovanie/ });
    expect(olderButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Najnovšie sledovanie/ }));

    await waitFor(() => expect(mockedUseOfferWatchMatches).toHaveBeenLastCalledWith(2));
    expect(window.location.search).toContain('watch=2');
    expect(window.location.search).toContain('from=test');
    expect(window.location.hash).toBe('#matches');
    expect(push).not.toHaveBeenCalled();
  });

  it('shows an actionable empty state and a retry for a blocking list error', async () => {
    const reload = jest.fn().mockResolvedValue({ ok: true, value: [] });
    const { rerender } = render(<OfferWatchResultsDesktop onManage={onManage} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Spravovať sledovania' })[1]);
    expect(onManage).toHaveBeenCalledTimes(1);

    mockedUseOfferWatches.mockReturnValue(watchesResult({
      error: new OfferWatchApiError('network'),
      reload,
    }));
    rerender(<OfferWatchResultsDesktop onManage={onManage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skúsiť znova' }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('preserves a deep-linked watch, extra query and hash while the list retry is needed', async () => {
    window.history.replaceState(
      { internal: 'kept' },
      '',
      '/dashboard/watches?watch=41&from=email#matches',
    );
    mockedUseOfferWatches.mockReturnValue(watchesResult({
      error: new OfferWatchApiError('network'),
    }));

    const { rerender } = render(<OfferWatchResultsDesktop onManage={onManage} />);

    await waitFor(() => {
      expect(window.location.search).toBe('?watch=41&from=email');
      expect(window.location.hash).toBe('#matches');
    });

    mockedUseOfferWatches.mockReturnValue(watchesResult({
      watches: [watch(41, '2026-09-02T08:00:00Z', 'Obnovené sledovanie')],
    }));
    rerender(<OfferWatchResultsDesktop onManage={onManage} />);

    expect(await screen.findByRole('button', { name: /Obnovené sledovanie/ }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(mockedUseOfferWatchMatches).toHaveBeenLastCalledWith(41);
    expect(window.location.search).toBe('?watch=41&from=email');
    expect(window.location.hash).toBe('#matches');
  });

  it('recovers once from a deleted selected watch and selects the next newest one', async () => {
    const fallbackWatch = watch(8, '2026-09-01T08:00:00Z', 'Náhradné sledovanie');
    const reload = jest.fn().mockResolvedValue({ ok: true, value: [fallbackWatch] });
    mockedUseOfferWatches.mockReturnValue(watchesResult({
      watches: [watch(7, '2026-09-02T08:00:00Z', 'Zmazané sledovanie')],
      reload,
    }));
    mockedUseOfferWatchMatches.mockReturnValue(matchesResult({
      error: new OfferWatchApiError('not_found'),
    }));

    const { rerender } = render(<OfferWatchResultsDesktop onManage={onManage} />);

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    mockedUseOfferWatches.mockReturnValue(watchesResult({
      watches: [fallbackWatch],
      reload,
    }));
    mockedUseOfferWatchMatches.mockReturnValue(matchesResult());
    rerender(<OfferWatchResultsDesktop onManage={onManage} />);

    expect(reload).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Náhradné sledovanie/ }))
        .toHaveAttribute('aria-pressed', 'true');
      expect(window.location.search).toBe('?watch=8');
    });

    mockedUseOfferWatches.mockReturnValue(watchesResult({ reload }));
    rerender(<OfferWatchResultsDesktop onManage={onManage} />);
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('keeps loaded cards visible after a page error and retries the failed cursor', async () => {
    const loadMore = jest.fn().mockResolvedValue({ ok: true, value: null });
    mockedUseOfferWatches.mockReturnValue(watchesResult({
      watches: [watch(7, '2026-09-02T08:00:00Z', 'Maliarske práce')],
    }));
    mockedUseOfferWatchMatches.mockReturnValue(matchesResult({
      matches: [match(11)],
      nextCursor: 'next-page',
      error: new OfferWatchApiError('network'),
      loadMore,
    }));

    render(<OfferWatchResultsDesktop onManage={onManage} />);

    expect(await screen.findByTestId('offer-card-11')).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Výsledky sa nepodarilo načítať.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zobraziť ďalšie' })).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Skúsiť znova' }));
    await waitFor(() => expect(loadMore).toHaveBeenCalledTimes(1));
  });

  it('refreshes, loads another page and marks only matches younger than 12 hours as new', async () => {
    const refresh = jest.fn().mockResolvedValue({ ok: true, value: null });
    const loadMore = jest.fn().mockResolvedValue({ ok: true, value: null });
    mockedUseOfferWatches.mockReturnValue(watchesResult({
      watches: [watch(7, '2026-09-02T08:00:00Z', 'Maliarske práce')],
    }));
    mockedUseOfferWatchMatches.mockReturnValue(matchesResult({
      matches: [match(11, 1), match(12, 13)],
      nextCursor: 'next-page',
      refresh,
      loadMore,
    }));

    render(<OfferWatchResultsDesktop onManage={onManage} />);

    expect(await screen.findByTestId('offer-card-11')).toBeInTheDocument();
    expect(screen.getAllByText('Nové')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Obnoviť' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zobraziť ďalšie' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});

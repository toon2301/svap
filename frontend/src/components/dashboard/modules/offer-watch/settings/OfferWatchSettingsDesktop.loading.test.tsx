import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import type { OfferWatch } from '../types';
import type { UseOfferWatchesResult } from '../useOfferWatches';
import { useOfferWatches } from '../useOfferWatches';
import OfferWatchSettingsDesktop from './OfferWatchSettingsDesktop';
import OfferWatchSettingsSkeleton from './OfferWatchSettingsSkeleton';

jest.mock('../useOfferWatches', () => ({ useOfferWatches: jest.fn() }));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    country: 'SK',
    setCountry: jest.fn(),
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

/**
 * Kostra v desktopovom Sledovaní (nález 310). Pri prvom načítaní sa celá stránka ukáže ako kostra hneď a pri rýchlej
 * odpovedi problikla pred prázdnym stavom. Teraz je kostra v DOM od prvého snímku, no neviditeľná (drží miesto) a ukáže
 * sa až po 200 ms; rovnako ako na mobile od nálezu 286. Obsah, ktorý príde po načítavaní, sa krátko vyfaduje, otvorenie
 * dialógov ho nevyfaduje.
 */
const mockedUseOfferWatches = jest.mocked(useOfferWatches);

function watch(id: number): OfferWatch {
  return {
    id,
    category: 'Domácnosť',
    subcategory: 'Upratovanie',
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    districtLabel: '',
    priceMin: null,
    priceMax: null,
    priceCurrency: '',
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-04T08:00:00Z',
  };
}

function hookResult(overrides: Partial<UseOfferWatchesResult> = {}): UseOfferWatchesResult {
  return {
    watches: [],
    isLoading: false,
    mutation: null,
    error: null,
    reload: jest.fn().mockResolvedValue({ ok: true, value: [] }),
    createWatch: jest.fn().mockResolvedValue({ ok: true, value: watch(1) }),
    updateWatch: jest.fn().mockResolvedValue({ ok: true, value: watch(1) }),
    deleteWatch: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    clearError: jest.fn(),
    ...overrides,
  };
}

const advance = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

const pageLoading = () => screen.getByTestId('offer-watch-settings-loading');
const pageSkeleton = () => screen.getByTestId('offer-watch-settings-skeleton');
const listLoading = () => screen.getByTestId('offer-watch-desktop-list-loading');
const formSection = () => screen.getByLabelText('Nastavenie sledovania');
const savedSection = () => screen.getByRole('region', { name: 'Uložené sledovania' });

describe('OfferWatchSettingsDesktop: kostra pri načítavaní (nález 310)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'SK');
    mockedUseOfferWatches.mockReturnValue(hookResult());
  });

  afterEach(() => {
    jest.useRealTimers();
    window.localStorage.clear();
  });

  it('počas úvodného načítania je kostra stránky v DOM od prvého snímku, neviditeľná, s aria-busy a textom pre čítače', () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({ isLoading: true }));

    render(<OfferWatchSettingsDesktop />);

    expect(pageLoading()).toHaveAttribute('aria-busy', 'true');
    expect(pageLoading()).toHaveAttribute('data-visible', 'false');
    expect(pageLoading()).toHaveTextContent('Načítavam...');
    expect(pageSkeleton().parentElement).toHaveClass('invisible');
    expect(pageSkeleton().parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: 'Uložiť sledovanie' })).not.toBeInTheDocument();
  });

  it('kostra sa ukáže po 200 ms a obal nepridá druhý pulz, lebo kostra pulzuje sama', () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({ isLoading: true }));
    render(<OfferWatchSettingsDesktop />);

    advance(199);
    expect(pageLoading()).toHaveAttribute('data-visible', 'false');
    advance(1);

    expect(pageLoading()).toHaveAttribute('data-visible', 'true');
    expect(pageSkeleton().parentElement).not.toHaveClass('invisible');
    expect(pageSkeleton().parentElement).not.toHaveClass('animate-pulse');
    expect(pageSkeleton().querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('rýchla odpoveď (pred 200 ms): kostra sa neukáže a rovno je formulár s prázdnym stavom', () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({ isLoading: true }));
    const { rerender } = render(<OfferWatchSettingsDesktop />);
    advance(100);
    expect(pageLoading()).toHaveAttribute('data-visible', 'false');

    mockedUseOfferWatches.mockReturnValue(hookResult());
    rerender(<OfferWatchSettingsDesktop />);

    expect(screen.queryByTestId('offer-watch-settings-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('offer-watch-settings-skeleton')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložiť sledovanie' })).toBeEnabled();
    expect(screen.getByText('Zatiaľ nemáš žiadne sledovanie')).toBeInTheDocument();
    advance(1000);
    expect(screen.queryByTestId('offer-watch-settings-loading')).not.toBeInTheDocument();
  });

  it('kostra je len dekoratívna: rolu status, aria-busy a text nesie obal, nie samotná kostra', () => {
    const view = render(<OfferWatchSettingsSkeleton />);

    expect(screen.getByTestId('offer-watch-settings-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('offer-watch-form-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('offer-watch-list-skeleton')).toBeInTheDocument();
    expect(view.container.querySelector('[role="status"]')).toBeNull();
    expect(view.container.querySelector('[aria-busy]')).toBeNull();
    expect(view.container).not.toHaveTextContent('Načítavam');
  });

  it('počas úvodného načítania je pre čítače jediný stavový obal so skrytou kostrou', () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({ isLoading: true }));

    render(<OfferWatchSettingsDesktop />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toBe(pageLoading());
  });

  it('obsah, ktorý príde po načítavaní, sa vloží s krátkym prechodom: formulár aj zoznam', () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({ isLoading: true }));
    const { rerender } = render(<OfferWatchSettingsDesktop />);

    mockedUseOfferWatches.mockReturnValue(hookResult({ watches: [watch(1), watch(2)] }));
    rerender(<OfferWatchSettingsDesktop />);

    expect(formSection()).toHaveClass('animate-content-in');
    expect(savedSection()).toHaveClass('animate-content-in');
  });

  it('keď údaje už sú a nič sa nenačítavalo, nič sa nevyfaduje ani po zmene stavu', () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({ watches: [watch(1)] }));
    const { rerender } = render(<OfferWatchSettingsDesktop />);
    expect(formSection()).not.toHaveClass('animate-content-in');
    expect(savedSection()).not.toHaveClass('animate-content-in');

    mockedUseOfferWatches.mockReturnValue(hookResult({ watches: [watch(1)], mutation: { kind: 'delete', watchId: 1 } }));
    rerender(<OfferWatchSettingsDesktop />);

    expect(formSection()).not.toHaveClass('animate-content-in');
    expect(savedSection()).not.toHaveClass('animate-content-in');
  });

  it('pri neskoršom načítavaní ostáva formulár a kostra zoznamu sa ukáže až po 200 ms', () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({ watches: [watch(1)], isLoading: true }));

    render(<OfferWatchSettingsDesktop />);

    expect(screen.queryByTestId('offer-watch-settings-loading')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložiť sledovanie' })).toBeDisabled();
    expect(listLoading()).toHaveAttribute('data-visible', 'false');
    expect(listLoading()).toHaveAttribute('aria-busy', 'true');
    expect(listLoading()).toHaveTextContent('Načítavam sledovania...');
    advance(200);
    expect(listLoading()).toHaveAttribute('data-visible', 'true');
  });

  it('rýchle opätovné načítanie zoznamu kostru neukáže vôbec', () => {
    mockedUseOfferWatches.mockReturnValue(hookResult({ watches: [watch(1)], isLoading: true }));
    const { rerender } = render(<OfferWatchSettingsDesktop />);
    advance(100);
    expect(listLoading()).toHaveAttribute('data-visible', 'false');

    mockedUseOfferWatches.mockReturnValue(hookResult({ watches: [watch(1)] }));
    rerender(<OfferWatchSettingsDesktop />);

    expect(screen.queryByTestId('offer-watch-desktop-list-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('offer-watch-list-skeleton')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});

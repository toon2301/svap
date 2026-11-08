import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { OfferWatch } from '../types';
import OfferWatchMobileListScreen from './OfferWatchMobileListScreen';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

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
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  };
}

describe('OfferWatchMobileListScreen', () => {
  const commonProps = {
    isLoading: false,
    hasLoadError: false,
    mutation: null,
    onBack: jest.fn(),
    onCreate: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onRetry: jest.fn(),
  } as const;

  it('hides create at 5/5 and restores it when a slot becomes available', () => {
    const fullList = Array.from({ length: 5 }, (_, index) => watch(index + 1));
    const { rerender } = render(
      <OfferWatchMobileListScreen {...commonProps} watches={fullList} />,
    );

    expect(screen.queryByRole('button', { name: 'Vytvoriť sledovanie' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Dosiahol si limit 5 sledovaní');

    rerender(<OfferWatchMobileListScreen {...commonProps} watches={fullList.slice(0, 4)} />);
    expect(screen.getByRole('button', { name: 'Vytvoriť sledovanie' })).toBeEnabled();
  });
});

/**
 * Prechodné stavy pri vstupe do Sledovaní na mobile (nález 286): kostra sa ukáže až po 200 ms (rýchla odpoveď ju
 * neukáže vôbec, predtým problikla pred prázdnym stavom) a obsah, ktorý príde po načítavaní, sa vyfaduje. Návrat
 * z formulára, keď údaje už sú, zoznam znova nevyfaduje.
 */
describe('OfferWatchMobileListScreen: prechodné stavy pri vstupe (nález 286)', () => {
  const props = {
    watches: [] as OfferWatch[],
    isLoading: false,
    hasLoadError: false,
    mutation: null,
    onBack: jest.fn(),
    onCreate: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onRetry: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advance = (ms: number) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  const loadingRegion = () => screen.getByTestId('offer-watch-list-loading');
  const skeleton = () => screen.getByTestId('offer-watch-list-skeleton');
  const emptyState = () => screen.getByText('Zatiaľ nemáš žiadne sledovanie').parentElement as HTMLElement;

  it('počas načítavania je kostra v DOM od prvého snímku, neviditeľná, s aria-busy a textom pre čítače', () => {
    render(<OfferWatchMobileListScreen {...props} isLoading />);

    expect(loadingRegion()).toHaveAttribute('aria-busy', 'true');
    expect(loadingRegion()).toHaveAttribute('data-visible', 'false');
    expect(loadingRegion()).toHaveTextContent('Načítavam sledovania...');
    expect(skeleton().parentElement).toHaveClass('invisible');
    expect(skeleton().parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('kostra sa ukáže po 200 ms a obal nepridá druhý pulz, lebo karty pulzujú samy', () => {
    render(<OfferWatchMobileListScreen {...props} isLoading />);

    advance(199);
    expect(loadingRegion()).toHaveAttribute('data-visible', 'false');
    advance(1);

    expect(loadingRegion()).toHaveAttribute('data-visible', 'true');
    expect(skeleton().parentElement).not.toHaveClass('invisible');
    expect(skeleton().parentElement).not.toHaveClass('animate-pulse');
    expect(skeleton().querySelectorAll('.animate-pulse')).toHaveLength(2);
  });

  it('rýchla odpoveď (pred 200 ms): kostra sa neukáže a rovno je prázdny stav', () => {
    const { rerender } = render(<OfferWatchMobileListScreen {...props} isLoading />);
    advance(100);
    expect(loadingRegion()).toHaveAttribute('data-visible', 'false');

    rerender(<OfferWatchMobileListScreen {...props} isLoading={false} />);

    expect(screen.queryByTestId('offer-watch-list-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('offer-watch-list-skeleton')).not.toBeInTheDocument();
    expect(emptyState()).toBeInTheDocument();
    advance(1000);
    expect(screen.queryByTestId('offer-watch-list-loading')).not.toBeInTheDocument();
  });

  it('prázdny stav, zoznam aj chyba, ktoré prídu po načítavaní, sa vložia s krátkym prechodom', () => {
    const empty = render(<OfferWatchMobileListScreen {...props} isLoading />);
    empty.rerender(<OfferWatchMobileListScreen {...props} isLoading={false} />);
    expect(emptyState()).toHaveClass('animate-content-in');
    empty.unmount();

    const list = render(<OfferWatchMobileListScreen {...props} isLoading />);
    list.rerender(<OfferWatchMobileListScreen {...props} isLoading={false} watches={[watch(1), watch(2)]} />);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getAllByRole('article')[0].parentElement?.parentElement).toHaveClass('animate-content-in');
    list.unmount();

    const failed = render(<OfferWatchMobileListScreen {...props} isLoading />);
    failed.rerender(<OfferWatchMobileListScreen {...props} isLoading={false} hasLoadError />);
    expect(screen.getByRole('alert')).toHaveClass('animate-content-in');
  });

  it('návrat z formulára, keď údaje už sú, obsah znova nevyfaduje', () => {
    const empty = render(<OfferWatchMobileListScreen {...props} />);
    expect(emptyState()).not.toHaveClass('animate-content-in');
    empty.unmount();

    const list = render(<OfferWatchMobileListScreen {...props} watches={[watch(1)]} />);
    expect(list.container.querySelector('.animate-content-in')).toBeNull();
  });

  it('pri „Skúsiť znova“ sa oneskorenie kostry počíta odznova a výsledok sa vyfaduje', () => {
    const { rerender } = render(<OfferWatchMobileListScreen {...props} hasLoadError />);
    expect(screen.getByRole('alert')).not.toHaveClass('animate-content-in');

    fireEvent.click(screen.getByRole('button', { name: 'Skúsiť znova' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    rerender(<OfferWatchMobileListScreen {...props} isLoading hasLoadError={false} />);

    expect(loadingRegion()).toHaveAttribute('data-visible', 'false');
    advance(200);
    expect(loadingRegion()).toHaveAttribute('data-visible', 'true');

    rerender(<OfferWatchMobileListScreen {...props} isLoading={false} />);
    expect(emptyState()).toHaveClass('animate-content-in');
  });

  it('tlačidlo „Vytvoriť sledovanie“ ostáva počas načítavania zakázané', () => {
    render(<OfferWatchMobileListScreen {...props} isLoading />);

    expect(screen.getByRole('button', { name: 'Vytvoriť sledovanie' })).toBeDisabled();
  });
});

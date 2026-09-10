import { render, screen } from '@testing-library/react';
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

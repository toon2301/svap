import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { OfferWatchDraft } from '../types';
import OfferWatchForm from './OfferWatchForm';

const setCountry = jest.fn();

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'en',
    setCountry,
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

function pricedDraft(overrides: Partial<OfferWatchDraft> = {}): OfferWatchDraft {
  return {
    category: '',
    subcategory: '',
    isSeeking: false,
    countryCode: 'SK',
    districtCode: 'bratislava-i',
    priceMin: '10',
    priceMax: '',
    priceCurrency: '',
    ...overrides,
  };
}

describe('OfferWatchForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears a stale currency error when country selection supplies a default currency', () => {
    const onChange = jest.fn();
    render(
      <OfferWatchForm
        idPrefix='watch-form'
        draft={pricedDraft()}
        errors={{ priceCurrency: 'currency_required' }}
        onChange={onChange}
        onSubmit={jest.fn()}
        submitLabel='Uložiť'
        submittingLabel='Ukladám'
        isSubmitting={false}
      />,
    );

    const country = screen.getByRole('combobox', { name: 'Krajina' });
    fireEvent.focus(country);
    fireEvent.change(country, { target: { value: 'Czechia' } });
    fireEvent.click(screen.getByRole('option', { name: /Czechia/ }));

    expect(setCountry).toHaveBeenCalledWith('CZ');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: 'CZ',
        districtCode: '',
        priceCurrency: 'Kč',
      }),
      ['countryCode', 'districtCode', 'priceCurrency'],
    );
  });

  it('passes a manually selected supported currency through the controlled draft', () => {
    const onChange = jest.fn();
    render(
      <OfferWatchForm
        idPrefix='watch-form'
        draft={pricedDraft({ priceCurrency: '€' })}
        errors={{}}
        onChange={onChange}
        onSubmit={jest.fn()}
        submitLabel='Uložiť'
        submittingLabel='Ukladám'
        isSubmitting={false}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Mena' }), {
      target: { value: '$' },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceCurrency: '$' }),
      ['priceCurrency'],
    );
  });
});

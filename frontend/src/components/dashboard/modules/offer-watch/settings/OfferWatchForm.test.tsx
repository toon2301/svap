import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('passes a manually selected supported currency through the controlled draft', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole('combobox', { name: 'Mena' }));
    await user.click(screen.getByRole('option', { name: '$' }));

    expect(screen.getByRole('button', { name: 'Uložiť' })).toHaveClass('min-w-40');
    expect(screen.getByRole('button', { name: 'Uložiť' })).not.toHaveClass('w-full');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceCurrency: '$' }),
      ['priceCurrency'],
    );
  });

  it('uses three mobile picker triggers and an app-styled non-searchable currency menu', () => {
    const onOpenMobilePicker = jest.fn();
    render(
      <OfferWatchForm
        idPrefix='watch-form'
        draft={pricedDraft({
          category: 'IT a technológie',
          subcategory: 'Programovanie embedded systémov',
          priceCurrency: '€',
        })}
        errors={{}}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        submitLabel='Uložiť'
        submittingLabel='Ukladám'
        isSubmitting={false}
        onOpenMobilePicker={onOpenMobilePicker}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Podkategória:/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Krajina:/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Okres \(voliteľný\):/ }));

    expect(onOpenMobilePicker.mock.calls.map(([picker]) => picker)).toEqual([
      'category',
      'country',
      'district',
    ]);
    expect(screen.getByRole('button', { name: /^Krajina:/ })).toHaveAccessibleName(
      'Krajina: Slovakia',
    );
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: 'Mena' }).tagName).toBe('INPUT');
    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveAttribute('readonly');

    fireEvent.click(screen.getByRole('combobox', { name: 'Mena' }));
    expect(screen.getByRole('listbox').parentElement).toHaveAttribute('data-placement', 'above');
  });
});

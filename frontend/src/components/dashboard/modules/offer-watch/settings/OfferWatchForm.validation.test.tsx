import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import OfferWatchForm from './OfferWatchForm';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk', setCountry: jest.fn(), t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

function renderVariant(overrides: Partial<ComponentProps<typeof OfferWatchForm>> = {}) {
  const props: ComponentProps<typeof OfferWatchForm> = {
    idPrefix: 'validation-watch',
    draft: {
      category: '', subcategory: '', isSeeking: true, countryCode: 'SK',
      districtCode: '', priceMin: '10', priceMax: '100', priceCurrency: '€',
    },
    errors: {}, onChange: jest.fn(), onSubmit: jest.fn(), submitLabel: 'Uložiť',
    submittingLabel: 'Ukladám', isSubmitting: false, ...overrides,
  };
  render(<OfferWatchForm {...props} />);
  return props;
}

describe('shared form validation remains intact after zero normalization', () => {
  it('keeps location and price validation visible and associated with each input', () => {
    renderVariant({ errors: {
      category: 'required', countryCode: 'required', districtCode: 'invalid_district',
      priceMin: 'invalid_price', priceMax: 'price_order', priceCurrency: 'currency_required',
    } });
    expect(screen.getByRole('combobox', { name: 'Podkategória' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox', { name: 'Krajina' })).toHaveAttribute('aria-describedby', 'validation-watch-country-error');
    expect(screen.getByRole('combobox', { name: 'Okres (voliteľný)' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Cena od')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Cena do')).toHaveAttribute('aria-describedby', 'validation-watch-price-max-error');
    expect(screen.getAllByRole('alert')).toHaveLength(6);
  });

  it('keeps a historical district warning visible until a valid district is selected', () => {
    const base = renderVariant({ draft: {
      category: '', subcategory: '', isSeeking: false, countryCode: 'CZ',
      districtCode: 'valasske-mezirici', priceMin: '', priceMax: '', priceCurrency: '',
    } });
    expect(screen.getByRole('alert')).toHaveTextContent('Vyber platný okres zo zoznamu.');
    expect(base.onChange).not.toHaveBeenCalled();
  });

  it('still changes the card type and canonical district through controlled callbacks', () => {
    const props = renderVariant();
    fireEvent.click(screen.getByRole('button', { name: 'Ponuky' }));
    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ isSeeking: false }));
    const district = screen.getByRole('combobox', { name: 'Okres (voliteľný)' });
    fireEvent.focus(district);
    fireEvent.change(district, { target: { value: 'Bratislava I' } });
    fireEvent.click(screen.getByRole('option', { name: /^Bratislava I$/ }));
    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ districtCode: 'bratislava-i' }), ['districtCode'],
    );
  });

  it('cannot submit while saving and exposes the disabled message and saving state', () => {
    const props = renderVariant({ isSubmitting: true, disabledMessage: 'Limit test' });
    expect(screen.getByRole('status')).toHaveTextContent('Limit test');
    const submit = screen.getByRole('button', { name: 'Ukladám' });
    expect(submit).toBeDisabled();
    expect(submit.querySelector('.animate-spin')).toBeInTheDocument();
    fireEvent.submit(submit.closest('form')!);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
});

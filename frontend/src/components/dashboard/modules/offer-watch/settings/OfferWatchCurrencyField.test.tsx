import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchCurrencyField from './OfferWatchCurrencyField';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'en',
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

describe('OfferWatchCurrencyField', () => {
  it('finds a supported currency by its ISO code in the same combobox', () => {
    const onChange = jest.fn();
    render(
      <OfferWatchCurrencyField
        id='watch-currency'
        currency='€'
        onChange={onChange}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Mena' });
    expect(combobox).toHaveValue('€');
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: 'HUF' } });
    fireEvent.click(screen.getByRole('option', { name: /Ft.*Hungarian Forint/i }));

    expect(onChange).toHaveBeenCalledWith('Ft');
  });
});

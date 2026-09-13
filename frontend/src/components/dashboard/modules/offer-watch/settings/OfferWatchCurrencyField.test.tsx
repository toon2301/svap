import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchCurrencyField from './OfferWatchCurrencyField';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'en',
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

describe('OfferWatchCurrencyField', () => {
  it('renders only the supported currencies in a native non-searchable select', () => {
    const onChange = jest.fn();
    render(
      <OfferWatchCurrencyField
        id='watch-currency'
        currency='€'
        onChange={onChange}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Mena' });
    expect(combobox.tagName).toBe('SELECT');
    expect(combobox).toHaveValue('€');
    expect(
      within(combobox).getAllByRole('option').map((option) => ({
        value: (option as HTMLOptionElement).value,
        disabled: (option as HTMLOptionElement).disabled,
      })),
    ).toEqual([
      { value: '', disabled: true },
      { value: '€', disabled: false },
      { value: 'Kč', disabled: false },
      { value: '$', disabled: false },
      { value: 'zł', disabled: false },
      { value: 'Ft', disabled: false },
    ]);
    fireEvent.focus(combobox);
    fireEvent.click(combobox);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    for (const currency of ['€', 'Kč', '$', 'zł', 'Ft']) {
      fireEvent.change(combobox, { target: { value: currency } });
    }

    expect(onChange.mock.calls.map(([currency]) => currency)).toEqual([
      '€', 'Kč', '$', 'zł', 'Ft',
    ]);
  });

  it('preserves disabled and validation accessibility state', () => {
    render(
      <OfferWatchCurrencyField
        id='watch-currency'
        currency=''
        onChange={jest.fn()}
        disabled
        invalid
        describedBy='watch-currency-error'
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Mena' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveAttribute(
      'aria-describedby',
      'watch-currency-error',
    );
  });

  it('visually distinguishes an enabled empty selection from a chosen currency', () => {
    const { rerender } = render(
      <OfferWatchCurrencyField
        id='watch-currency'
        currency=''
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveClass(
      'text-gray-500',
      'dark:text-gray-400',
    );

    rerender(
      <OfferWatchCurrencyField
        id='watch-currency'
        currency='Kč'
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Mena' })).toHaveClass(
      'text-gray-900',
      'dark:text-white',
    );
  });
});

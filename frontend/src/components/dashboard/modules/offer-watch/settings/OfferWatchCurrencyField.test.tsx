import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(combobox).toHaveClass('appearance-none', 'bg-none');
    expect(combobox).toHaveStyle({ backgroundImage: 'none' });
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

  it('renders the supported currencies in the custom desktop selector', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <OfferWatchCurrencyField
        id='watch-currency'
        currency='Kč'
        onChange={onChange}
        presentation='custom'
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Mena' });
    expect(combobox.tagName).toBe('INPUT');
    expect(combobox).toHaveAttribute('readonly');

    await user.click(combobox);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '€', 'Kč', '$', 'zł', 'Ft',
    ]);

    await user.click(screen.getByRole('option', { name: '$' }));
    expect(onChange).toHaveBeenCalledWith('$');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveFocus();
  });

  it('opens the app-styled mobile currency menu above the field with an upward chevron', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <OfferWatchCurrencyField
        id='watch-currency'
        currency='€'
        onChange={onChange}
        presentation='custom-above'
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Mena' });
    jest.spyOn(combobox, 'getBoundingClientRect').mockReturnValue({
      x: 20,
      y: 500,
      top: 500,
      right: 300,
      bottom: 544,
      left: 20,
      width: 280,
      height: 44,
      toJSON: () => ({}),
    } as DOMRect);

    expect(combobox).toHaveAttribute('readonly');
    expect(combobox.parentElement?.querySelector('svg')).toHaveClass('rotate-180');

    await user.click(combobox);
    const popup = screen.getByRole('listbox').parentElement as HTMLElement;
    expect(popup).toHaveAttribute('data-placement', 'above');
    expect(popup).toHaveClass(
      'rounded-t-xl',
      'rounded-b-none',
      'border-purple-400',
    );
    expect(screen.getAllByRole('option')).toHaveLength(5);

    await user.click(screen.getByRole('option', { name: 'Kč' }));
    expect(onChange).toHaveBeenCalledWith('Kč');
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

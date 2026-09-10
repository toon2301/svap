import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchCountryField from './OfferWatchCountryField';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'en',
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

describe('OfferWatchCountryField', () => {
  it('searches and selects in one combobox above the edit-dialog layer', () => {
    const onChange = jest.fn();
    render(
      <OfferWatchCountryField
        id='watch-country'
        countryCode='SK'
        onChange={onChange}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Krajina' });
    expect(combobox).toHaveValue('Slovakia');

    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: 'Italy' } });
    expect(screen.getAllByRole('combobox')).toHaveLength(1);

    const listbox = screen.getByRole('listbox');
    expect(listbox.parentElement).toHaveClass('z-[10050]');
    fireEvent.click(screen.getByRole('option', { name: /Italy/ }));

    expect(onChange).toHaveBeenCalledWith('IT');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

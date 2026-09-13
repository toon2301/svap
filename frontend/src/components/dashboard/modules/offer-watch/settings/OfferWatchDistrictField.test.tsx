import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchDistrictField from './OfferWatchDistrictField';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

describe('OfferWatchDistrictField', () => {
  it('fully closes and clears its popup after a blurred pointer selection', async () => {
    const onChange = jest.fn();

    function ControlledDistrictField() {
      const [districtCode, setDistrictCode] = useState('');
      return (
        <OfferWatchDistrictField
          id='watch-district'
          countryCode='CZ'
          districtCode={districtCode}
          onChange={(nextDistrictCode) => {
            onChange(nextDistrictCode);
            setDistrictCode(nextDistrictCode);
          }}
        />
      );
    }

    render(<ControlledDistrictField />);

    const combobox = screen.getByRole('combobox', { name: 'Okres (voliteľný)' });
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: 'Bene' } });

    const option = screen.getByRole('option', { name: 'Benešov' });
    fireEvent.pointerDown(option);
    fireEvent.blur(combobox, { relatedTarget: option });
    fireEvent.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('benesov');
      expect(combobox).toHaveValue('Benešov');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });
    expect(combobox).toHaveFocus();

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(combobox).toHaveValue('');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option').every(
      (item) => !item.hasAttribute('data-active'),
    )).toBe(true);
  });
});

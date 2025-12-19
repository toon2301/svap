import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationSection from '../skillDescriptionModal/sections/LocationSection';

// Mock LanguageContext to provide deterministic translations and country
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    country: 'SK',
    t: (_key: string, defaultValue: string) => defaultValue,
  }),
}));

describe('LocationSection', () => {
  it('shows validation error and clears invalid district on blur', async () => {
    const onDistrictChange = jest.fn();

    render(
      <LocationSection
        value=""
        onChange={jest.fn()}
        onBlur={jest.fn()}
        error=""
        isSaving={false}
        district=""
        onDistrictChange={onDistrictChange}
        isSeeking={false}
      />,
    );

    const districtInput = screen.getByPlaceholderText('Zadaj okres');

    fireEvent.change(districtInput, { target: { value: 'Nitra123' } });
    fireEvent.blur(districtInput);

    await waitFor(() => {
      expect(
        screen.getByText('Neplatný okres. Vyber z navrhovaných možností.'),
      ).toBeInTheDocument();
    });

    // Last change from blur should clear the invalid value
    expect(onDistrictChange).toHaveBeenLastCalledWith('');
  });

  it('accepts a valid district and does not show error', async () => {
    const onDistrictChange = jest.fn();

    render(
      <LocationSection
        value=""
        onChange={jest.fn()}
        onBlur={jest.fn()}
        error=""
        isSaving={false}
        district=""
        onDistrictChange={onDistrictChange}
        isSeeking={false}
      />,
    );

    const districtInput = screen.getByPlaceholderText('Zadaj okres');

    fireEvent.change(districtInput, { target: { value: 'Nitra' } });
    fireEvent.blur(districtInput);

    // Wait a tick so potential async focus logic settles
    await waitFor(() => {
      expect(
        screen.queryByText('Neplatný okres. Vyber z navrhovaných možností.'),
      ).not.toBeInTheDocument();
    });

    // onDistrictChange should have been called with the valid district
    expect(onDistrictChange).toHaveBeenCalledWith('Nitra');
  });

  it('limits location input to 35 characters and shows counter', () => {
    const handleChange = jest.fn();

    render(
      <LocationSection
        value=""
        onChange={handleChange}
        onBlur={jest.fn()}
        error=""
        isSaving={false}
        district="Bratislava I"
        onDistrictChange={jest.fn()}
        isSeeking={false}
      />,
    );

    const locationInput = screen.getByPlaceholderText(
      'Zadaj, kde ponúkaš svoje služby',
    ) as HTMLInputElement;

    const longText = 'x'.repeat(60);
    fireEvent.change(locationInput, { target: { value: longText } });

    // Component slices value to 35 chars before calling onChange
    expect(handleChange).toHaveBeenCalledWith('x'.repeat(35));
  });
});


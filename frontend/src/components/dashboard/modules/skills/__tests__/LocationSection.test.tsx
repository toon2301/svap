import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationSection from '../skillDescriptionModal/sections/LocationSection';
import { resolveInitialOfferDistrictSelection } from '@/shared/districtRegistry';

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

  it('limits location input to 25 characters and shows counter', () => {
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

    // Component slices value to 25 chars before calling onChange
    expect(handleChange).toHaveBeenCalledWith('x'.repeat(25));
  });

  it('accepts a country-specific district and stores canonical district code in offer mode', async () => {
    const onDistrictChange = jest.fn();
    const onDistrictCodeChange = jest.fn();

    render(
      <LocationSection
        value=""
        onChange={jest.fn()}
        onBlur={jest.fn()}
        error=""
        isSaving={false}
        district=""
        countryCode="CZ"
        districtCode=""
        onCountryCodeChange={jest.fn()}
        onDistrictChange={onDistrictChange}
        onDistrictCodeChange={onDistrictCodeChange}
        showCountrySelector
        isSeeking={false}
      />,
    );

    const districtInput = screen.getByPlaceholderText('Zadaj okres');

    fireEvent.change(districtInput, { target: { value: 'Brno-město' } });
    fireEvent.blur(districtInput);

    await waitFor(() => {
      expect(
        screen.queryByText('NeplatnÃ½ okres. Vyber z navrhovanÃ½ch moÅ¾nostÃ­.'),
      ).not.toBeInTheDocument();
    });

    expect(onDistrictChange).toHaveBeenLastCalledWith('Brno-město');
    expect(onDistrictCodeChange).toHaveBeenLastCalledWith('brno-mesto');
  });

  it('clears stale district selection when offer country changes', () => {
    const onDistrictChange = jest.fn();
    const onDistrictCodeChange = jest.fn();
    const onCountryCodeChange = jest.fn();

    render(
      <LocationSection
        value=""
        onChange={jest.fn()}
        onBlur={jest.fn()}
        error=""
        isSaving={false}
        district="Nitra"
        countryCode="SK"
        districtCode="nitra"
        onCountryCodeChange={onCountryCodeChange}
        onDistrictChange={onDistrictChange}
        onDistrictCodeChange={onDistrictCodeChange}
        showCountrySelector
        isSeeking={false}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CZ' } });

    expect(onCountryCodeChange).toHaveBeenCalledWith('CZ');
    expect(onDistrictChange).toHaveBeenLastCalledWith('');
    expect(onDistrictCodeChange).toHaveBeenLastCalledWith('');
  });

  it('infers legacy district selection for existing offer data without explicit country code', () => {
    expect(
      resolveInitialOfferDistrictSelection({
        countryCode: '',
        districtCode: '',
        districtLabel: 'Brno-město',
        fallbackCountryCode: 'SK',
      }),
    ).toEqual({
      countryCode: 'CZ',
      districtCode: 'brno-mesto',
      districtLabel: 'Brno-město',
    });
  });
});


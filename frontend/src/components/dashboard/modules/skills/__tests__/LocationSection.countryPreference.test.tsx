import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  LAST_MANUAL_OFFER_COUNTRY_KEY,
  writeLastManualOfferCountry,
} from '@/shared/offerCountryPreference';
import LocationSection from '../skillDescriptionModal/sections/LocationSection';

const mockSetCountry = jest.fn((country: string) => {
  writeLastManualOfferCountry(country);
});

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    country: null,
    setCountry: mockSetCountry,
    t: (_key: string, fallback: string) => fallback,
  }),
}));

describe('LocationSection country preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSetCountry.mockClear();
  });

  it('shows an empty country instead of silently falling back to Slovakia', () => {
    render(
      <LocationSection
        value=""
        onChange={jest.fn()}
        onBlur={jest.fn()}
        error=""
        isSaving={false}
        district=""
        countryCode=""
        districtCode=""
        onCountryCodeChange={jest.fn()}
        onDistrictChange={jest.fn()}
        onDistrictCodeChange={jest.fn()}
        showCountrySelector
      />,
    );

    expect(screen.getByRole('button', { name: 'Krajina ponuky' })).toHaveTextContent(
      'Vyber krajinu',
    );
    expect(
      screen.queryByText(
        'Pre túto krajinu zatiaľ okresy nevyberáme. Môžeš zadať mesto alebo obec.',
      ),
    ).not.toBeInTheDocument();
  });

  it('remembers an explicitly selected country and clears the district', () => {
    const onCountryCodeChange = jest.fn();
    const onDistrictChange = jest.fn();
    const onDistrictCodeChange = jest.fn();

    render(
      <LocationSection
        value=""
        onChange={jest.fn()}
        onBlur={jest.fn()}
        error=""
        isSaving={false}
        district="Nitra"
        countryCode=""
        districtCode="nitra"
        onCountryCodeChange={onCountryCodeChange}
        onDistrictChange={onDistrictChange}
        onDistrictCodeChange={onDistrictCodeChange}
        showCountrySelector
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Krajina ponuky' }));
    fireEvent.click(screen.getByRole('option', { name: /Taliansko|Italy/ }));

    expect(mockSetCountry).toHaveBeenCalledWith('IT');
    expect(onCountryCodeChange).toHaveBeenCalledWith('IT');
    expect(onDistrictChange).toHaveBeenLastCalledWith('');
    expect(onDistrictCodeChange).toHaveBeenLastCalledWith('');
    expect(window.localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('IT');
  });
});

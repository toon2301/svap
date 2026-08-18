import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LocationSection from '../skillDescriptionModal/sections/LocationSection';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    country: 'SK',
    t: (_key: string, defaultValue: string) => defaultValue,
  }),
}));

describe('LocationSection scroll behavior', () => {
  const renderGermanLocation = () => {
    render(
      <LocationSection
        value=""
        onChange={jest.fn()}
        onBlur={jest.fn()}
        error=""
        isSaving={false}
        district=""
        countryCode="DE"
        districtCode=""
        onCountryCodeChange={jest.fn()}
        onDistrictChange={jest.fn()}
        onDistrictCodeChange={jest.fn()}
        showCountrySelector
        isSeeking={false}
      />,
    );

    const districtInput = document.querySelector(
      '[data-offer-district-input="true"]',
    ) as HTMLInputElement;
    act(() => districtInput.focus());
    fireEvent.change(districtInput, { target: { value: 'Munchen' } });
  };

  it('closes portaled district suggestions when an ancestor scrolls', async () => {
    renderGermanLocation();

    expect(
      await screen.findByRole('button', { name: 'M\u00fcnchen (Stadt)' }),
    ).toBeInTheDocument();

    fireEvent.scroll(window);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'M\u00fcnchen (Stadt)' }),
      ).not.toBeInTheDocument();
    });
  });

  it('keeps suggestions open while their own list is scrolled', async () => {
    renderGermanLocation();

    const suggestion = await screen.findByRole('button', {
      name: 'M\u00fcnchen (Stadt)',
    });
    const dropdown = suggestion.closest('.district-dropdown-scrollbar');
    expect(dropdown).not.toBeNull();

    fireEvent.scroll(dropdown as Element);

    expect(suggestion).toBeInTheDocument();
  });
});

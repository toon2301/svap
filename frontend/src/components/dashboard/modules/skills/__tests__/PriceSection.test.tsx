import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import PriceSection from '../skillDescriptionModal/sections/PriceSection';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, defaultValue: string) => defaultValue,
  }),
}));

describe('PriceSection', () => {
  it('hides the numeric price input when price is negotiable', () => {
    render(
      <PriceSection
        value="25"
        onChange={jest.fn()}
        currency="€"
        onCurrencyChange={jest.fn()}
        isNegotiable
        onNegotiableChange={jest.fn()}
        error=""
      />,
    );

    expect(screen.getByText('Dohodou')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /€/ })).not.toBeInTheDocument();
  });

  it('notifies parent when negotiable option is toggled', () => {
    const onNegotiableChange = jest.fn();

    render(
      <PriceSection
        value=""
        onChange={jest.fn()}
        currency="€"
        onCurrencyChange={jest.fn()}
        isNegotiable={false}
        onNegotiableChange={onNegotiableChange}
        error=""
      />,
    );

    // Prepínač je od PR 258 `role="switch"` s názvom z viditeľného textu a oznamuje stav (zdieľaný komponent MasterToggle).
    const toggle = screen.getByRole('switch', { name: 'Dohodou' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);

    expect(onNegotiableChange).toHaveBeenCalledWith(true);
  });
});

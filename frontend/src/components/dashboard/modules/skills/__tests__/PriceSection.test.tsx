import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';

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

    const row = screen.getByText('Dohodou').closest('div');
    expect(row).not.toBeNull();
    fireEvent.click(within(row!).getByRole('button'));

    expect(onNegotiableChange).toHaveBeenCalledWith(true);
  });
});

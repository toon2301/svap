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

    expect(screen.getByLabelText('Dohodou')).toBeChecked();
    expect(screen.queryByPlaceholderText('0')).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByLabelText('Dohodou'));

    expect(onNegotiableChange).toHaveBeenCalledWith(true);
  });
});

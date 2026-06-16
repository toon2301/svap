import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ProfileOfferDetailMobile } from '../ProfileOfferDetailMobile';
import type { Offer } from '../profileOffersTypes';

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    locale: 'sk-SK',
    t: (_key: string, fallback: string) => fallback,
  }),
}));

const offer: Offer = {
  id: 1,
  category: 'Domácnosť',
  subcategory: 'Upratovanie',
  description: 'Test offer',
  detailed_description: 'Detail text',
  is_seeking: false,
  likes_count: 0,
  reviews_count: 0,
};

describe('ProfileOfferDetailMobile', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app-root"></div>';
  });

  it('renders bottom sheet with Popis header inside the sheet', () => {
    render(
      <ProfileOfferDetailMobile
        offer={offer}
        accountType="personal"
        onClose={jest.fn()}
        onShowHours={jest.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Popis' })).toBeInTheDocument();
    expect(screen.getByText('Potiahni nadol pre zatvorenie')).toBeInTheDocument();
    expect(screen.getByText('Detail text')).toBeInTheDocument();
  });

  it('closes when chevron button is clicked', () => {
    const onClose = jest.fn();

    render(
      <ProfileOfferDetailMobile
        offer={offer}
        accountType="personal"
        onClose={onClose}
        onShowHours={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zavrieť' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when backdrop is clicked', () => {
    const onClose = jest.fn();

    render(
      <ProfileOfferDetailMobile
        offer={offer}
        accountType="personal"
        onClose={onClose}
        onShowHours={jest.fn()}
      />,
    );

    const backdrop = document.querySelector('#app-root .fixed.inset-0');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

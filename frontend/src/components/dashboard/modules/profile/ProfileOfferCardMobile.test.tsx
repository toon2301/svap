import React from 'react';
import { render, screen } from '@testing-library/react';

import { ProfileOfferCardMobile } from './ProfileOfferCardMobile';
import type { Offer } from './profileOffersTypes';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div data-testid="offer-image-carousel">{alt}</div>,
}));

jest.mock('../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: () => null,
}));

const offer: Offer = {
  id: 1,
  category: 'Design',
  subcategory: 'Logo',
  description: 'Logo design',
  images: [],
  price_from: null,
  price_currency: 'EUR',
  is_seeking: false,
};

describe('ProfileOfferCardMobile', () => {
  it('shows the mobile flip hint when requested', () => {
    render(
      <ProfileOfferCardMobile
        offer={offer}
        accountType="personal"
        isTapped={false}
        onCardClick={jest.fn()}
        showFlipHint
      />,
    );

    expect(screen.getByText('Otoč kartu pre detail')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
  });

  it('does not show the mobile flip hint by default', () => {
    render(
      <ProfileOfferCardMobile
        offer={offer}
        accountType="personal"
        isTapped={false}
        onCardClick={jest.fn()}
      />,
    );

    expect(screen.queryByText('Otoč kartu pre detail')).not.toBeInTheDocument();
  });

  it('shows manage buttons on own profile cards', () => {
    render(
      <ProfileOfferCardMobile
        offer={offer}
        accountType="personal"
        isTapped={false}
        onCardClick={jest.fn()}
        onEditOffer={jest.fn()}
        onDeleteOffer={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Upraviť kartu')).toBeInTheDocument();
    expect(screen.getByLabelText('Vymazať kartu')).toBeInTheDocument();
  });

  it('hides manage buttons on other user profile cards', () => {
    render(
      <ProfileOfferCardMobile
        offer={offer}
        accountType="personal"
        isTapped={false}
        onCardClick={jest.fn()}
        isOtherUserProfile
        onEditOffer={jest.fn()}
        onDeleteOffer={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('Upraviť kartu')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Vymazať kartu')).not.toBeInTheDocument();
  });
});

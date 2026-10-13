import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  adoptOfferReviewsOrigin,
  resetOfferReviewsOrigin,
  returnToOfferReviewsOrigin,
} from '../../reviews/offerReviewsOrigin';
import type { Offer } from '../profileOffersTypes';
import { OfferCardBack, type OfferCardBackProps } from './OfferCardBack';

const offer: Offer = {
  id: 7,
  category: 'Domácnosť a služby',
  subcategory: 'Maliarske práce',
  description: '',
  is_seeking: false,
};

function props(overrides: Partial<OfferCardBackProps> = {}): OfferCardBackProps {
  return {
    offer,
    accountType: 'personal',
    t: (_key, fallback) => fallback,
    onToggleFlip: jest.fn(),
    isFlipped: true,
    ...overrides,
  };
}

const REVIEWS_HREF = '/dashboard/offers/7/reviews?returnTo=%2Fdashboard%2Fusers%2Fpeter';

describe('OfferCardBack – odkaz na všetky recenzie', () => {
  beforeEach(() => {
    resetOfferReviewsOrigin();
    window.history.replaceState(null, '', '/dashboard/users/peter');
  });

  it('is a plain link to the reviews', () => {
    render(<OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />);

    expect(screen.getByRole('link', { name: /Všetky recenzie/ })).toHaveAttribute('href', REVIEWS_HREF);
  });

  it('tells the app that the reviews are opened from the card, so the page can step back', () => {
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});
    try {
      render(<OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />);

      fireEvent.click(screen.getByRole('link', { name: /Všetky recenzie/ }));

      // Navigáciu robí samotný odkaz; stránka recenzií sa zobrazila a prevezme pôvod.
      window.history.replaceState(null, '', REVIEWS_HREF);
      adoptOfferReviewsOrigin();
      expect(returnToOfferReviewsOrigin()).toBe(true);
      expect(backSpy).toHaveBeenCalledTimes(1);
    } finally {
      backSpy.mockRestore();
    }
  });

  it('does not flip the card back when the link is clicked', () => {
    const onToggleFlip = jest.fn();
    render(
      <div onClick={onToggleFlip}>
        <OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />
      </div>,
    );

    fireEvent.click(screen.getByRole('link', { name: /Všetky recenzie/ }));

    expect(onToggleFlip).not.toHaveBeenCalled();
  });

  it('has no link without an address of the reviews', () => {
    render(<OfferCardBack {...props()} />);

    expect(screen.queryByRole('link', { name: /Všetky recenzie/ })).not.toBeInTheDocument();
  });
});

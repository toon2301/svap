import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Offer } from '../profileOffersTypes';
import { OfferCardFront, type OfferCardFrontProps } from './OfferCardFront';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
jest.mock('../../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: () => <div data-testid='image-carousel' />,
}));

const offer: Offer = {
  id: 7,
  category: 'Domácnosť a služby',
  subcategory: 'Maliarske práce',
  description: '',
  is_seeking: false,
};

function props(overrides: Partial<OfferCardFrontProps> = {}): OfferCardFrontProps {
  return {
    offer,
    accountType: 'personal',
    t: (_key, fallback) => fallback,
    onToggleFlip: jest.fn(),
    isFlipped: false,
    isHidden: false,
    isHighlighted: false,
    imageAlt: 'Maliarske práce',
    label: 'Ponúkam',
    headline: 'Maliarske práce',
    priceLabel: null,
    displayLocationText: null,
    hasMultipleImages: false,
    hasImages: false,
    imageCount: 0,
    isOtherUserProfile: true,
    ...overrides,
  };
}

describe('OfferCardFront optional actions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render enabled actions that have no handler or destination', () => {
    const { container } = render(<OfferCardFront {...props()} />);

    expect(container.querySelector('[data-default-cta="true"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-message-cta="true"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pridať recenziu' })).not.toBeInTheDocument();
  });

  it('renders and invokes only actions with a real handler or destination', () => {
    const onRequestClick = jest.fn();
    const onMessageClick = jest.fn();
    const { container } = render(
      <OfferCardFront
        {...props({
          onRequestClick,
          onMessageClick,
          reviewsHref: '/dashboard/offers/7/reviews',
        })}
      />,
    );

    fireEvent.click(container.querySelector('[data-default-cta="true"]')!);
    fireEvent.click(container.querySelector('[data-message-cta="true"]')!);
    fireEvent.click(screen.getByRole('button', { name: 'Pridať recenziu' }));

    expect(onRequestClick).toHaveBeenCalledWith(7);
    expect(onMessageClick).toHaveBeenCalledWith(7);
    expect(push).toHaveBeenCalledWith('/dashboard/offers/7/reviews');
  });
});

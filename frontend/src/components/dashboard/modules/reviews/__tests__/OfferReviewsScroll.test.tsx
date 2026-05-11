import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { OfferReviewsDesktop } from '../OfferReviewsDesktop';
import { OfferReviewsMobile } from '../OfferReviewsMobile';
import type { Review } from '../ReviewCard';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('../../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: () => <div data-testid="offer-image-carousel" />,
}));

const reviews: Review[] = [
  {
    id: 11,
    reviewer_id: 2,
    reviewer_display_name: 'First User',
    reviewer_avatar_url: null,
    rating: 4,
    text: 'First review',
    pros: [],
    cons: [],
    likes_count: 0,
    is_liked_by_me: false,
    created_at: '2026-05-01T10:00:00.000Z',
    updated_at: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 22,
    reviewer_id: 3,
    reviewer_display_name: 'Target User',
    reviewer_avatar_url: null,
    rating: 5,
    text: 'Target review',
    pros: ['Great'],
    cons: [],
    likes_count: 1,
    is_liked_by_me: false,
    created_at: '2026-05-02T10:00:00.000Z',
    updated_at: '2026-05-02T10:00:00.000Z',
  },
];

const baseProps = {
  offer: null,
  loading: false,
  reviews,
  reviewsLoading: false,
  isOwnOffer: true,
  isBusinessOwner: true,
  can_review: false,
  already_reviewed: true,
  displayName: 'Owner',
  imageAlt: 'offer',
  locationText: null,
  experienceText: null,
  priceLabel: null,
  headingText: 'Offer',
  todayHoursText: null,
  currentUserId: 1,
  onAddReviewClick: jest.fn(),
  onEditReview: jest.fn(),
  onDeleteReviewClick: jest.fn(),
  onOpenHoursClick: jest.fn(),
  onOwnerResponseSaved: jest.fn(),
};

const reviewsWithOwnerResponse = reviews.map((review) =>
  review.id === 22
    ? {
        ...review,
        owner_response: 'Owner reply text',
        owner_responded_at: '2026-05-03T10:00:00.000Z',
      }
    : review,
);

describe('offer review target scrolling', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const originalGetClientRects = Element.prototype.getClientRects;
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    Element.prototype.getClientRects = jest.fn(() => ({ length: 1 } as DOMRectList));
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    Element.prototype.getClientRects = originalGetClientRects;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    jest.clearAllMocks();
  });

  it('centers the target review on desktop after reviews are rendered', async () => {
    render(<OfferReviewsDesktop {...baseProps} targetReviewId={22} />);

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  });

  it('centers the target review on mobile after reviews are rendered', async () => {
    render(<OfferReviewsMobile {...baseProps} targetReviewId={22} />);

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  });

  it('does not scroll when the target review is not in the loaded list', () => {
    render(<OfferReviewsDesktop {...baseProps} targetReviewId={999} />);

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('opens the owner response modal on desktop when requested by the URL target', async () => {
    render(
      <OfferReviewsDesktop
        {...baseProps}
        reviews={reviewsWithOwnerResponse}
        targetReviewId={22}
        targetOwnerResponseReviewId={22}
      />,
    );

    expect(await screen.findByText('Owner reply text')).toBeInTheDocument();
  });

  it('opens the owner response modal on mobile when requested by the URL target', async () => {
    render(
      <OfferReviewsMobile
        {...baseProps}
        reviews={reviewsWithOwnerResponse}
        targetReviewId={22}
        targetOwnerResponseReviewId={22}
      />,
    );

    expect(await screen.findByText('Owner reply text')).toBeInTheDocument();
  });

  it('does not open the owner response modal when the target review has no response', async () => {
    render(
      <OfferReviewsDesktop
        {...baseProps}
        targetReviewId={22}
        targetOwnerResponseReviewId={22}
      />,
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

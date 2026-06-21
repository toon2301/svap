import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { OfferReviewsDesktop } from '../OfferReviewsDesktop';
import { OfferReviewsMobile } from '../OfferReviewsMobile';
import type { Review } from '../ReviewCard';
import type { ReviewsStats } from '../reviewsSummary';

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
    id: 1,
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
];

// total 50 zámerne väčší než počet načítaných (1) – overuje, že súhrn/počet
// vychádza z backend agregátu, nie z dĺžky načítaného poľa.
const stats: ReviewsStats = {
  total: 50,
  average: 4.2,
  breakdown: { 1: 1, 2: 2, 3: 3, 4: 14, 5: 30 },
};

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

describe('reviews pagination – "Zobraziť ďalšie"', () => {
  afterEach(() => jest.clearAllMocks());

  it('desktop: shows total count from stats, not loaded length', () => {
    render(<OfferReviewsDesktop {...baseProps} reviewsStats={stats} hasMoreReviews />);
    // Hlavička obsahuje (50), nie (1).
    expect(screen.getByText(/Recenzie \(50\)/)).toBeInTheDocument();
  });

  it('desktop: renders load-more button and calls handler on click', () => {
    const onLoadMoreReviews = jest.fn();
    render(
      <OfferReviewsDesktop
        {...baseProps}
        reviewsStats={stats}
        hasMoreReviews
        onLoadMoreReviews={onLoadMoreReviews}
      />,
    );
    const button = screen.getByRole('button', { name: 'Zobraziť ďalšie' });
    fireEvent.click(button);
    expect(onLoadMoreReviews).toHaveBeenCalledTimes(1);
  });

  it('desktop: hides load-more button when no further page', () => {
    render(<OfferReviewsDesktop {...baseProps} reviewsStats={stats} hasMoreReviews={false} />);
    expect(screen.queryByRole('button', { name: 'Zobraziť ďalšie' })).not.toBeInTheDocument();
  });

  it('desktop: disables button and shows loading text while fetching', () => {
    render(
      <OfferReviewsDesktop
        {...baseProps}
        reviewsStats={stats}
        hasMoreReviews
        loadingMoreReviews
        onLoadMoreReviews={jest.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: 'Načítavam…' });
    expect(button).toBeDisabled();
  });

  it('mobile: renders load-more button and calls handler on click', () => {
    const onLoadMoreReviews = jest.fn();
    render(
      <OfferReviewsMobile
        {...baseProps}
        reviewsStats={stats}
        hasMoreReviews
        onLoadMoreReviews={onLoadMoreReviews}
      />,
    );
    const button = screen.getByRole('button', { name: 'Zobraziť ďalšie' });
    fireEvent.click(button);
    expect(onLoadMoreReviews).toHaveBeenCalledTimes(1);
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { OfferReviewsDesktop } from '../OfferReviewsDesktop';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('../../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: () => <div data-testid="offer-image-carousel" />,
}));

const baseProps = {
  offer: null,
  loading: false,
  reviews: [],
  reviewsLoading: false,
  isOwnOffer: false,
  isBusinessOwner: false,
  can_review: false,
  already_reviewed: false,
  displayName: 'Owner',
  imageAlt: 'offer',
  locationText: null,
  experienceText: null,
  priceLabel: null,
  headingText: 'Detail ponuky',
  todayHoursText: null,
  currentUserId: 1,
  onAddReviewClick: jest.fn(),
  onEditReview: jest.fn(),
  onDeleteReviewClick: jest.fn(),
  onOpenHoursClick: jest.fn(),
  onOwnerResponseSaved: jest.fn(),
};

describe('šípka späť na stránke recenzií (desktop)', () => {
  it('stojí vľavo od nadpisu a kliknutie zavolá handler', () => {
    const onBack = jest.fn();
    render(<OfferReviewsDesktop {...baseProps} onBack={onBack} />);

    const back = screen.getByRole('button', { name: 'Späť' });
    const heading = screen.getByRole('heading', { level: 1, name: 'Detail ponuky' });

    // Šípka je pred nadpisom a v tom istom riadku.
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(back.parentElement).toBe(heading.parentElement);

    fireEvent.click(back);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('je to okrúhle tlačidlo len so šípkou: text „Späť“ má len pre čítačky a popis', () => {
    render(<OfferReviewsDesktop {...baseProps} onBack={jest.fn()} />);

    const back = screen.getByRole('button', { name: 'Späť' });

    expect(back).toHaveAttribute('type', 'button');
    expect(back).toHaveAttribute('aria-label', 'Späť');
    expect(back).toHaveAttribute('title', 'Späť');
    expect(back.textContent).toBe('');
    expect(back.querySelector('svg')).not.toBeNull();
  });

  it('bez handlera sa šípka nevykreslí a nadpis ostáva', () => {
    render(<OfferReviewsDesktop {...baseProps} />);

    expect(screen.queryByRole('button', { name: 'Späť' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Detail ponuky' })).toBeInTheDocument();
  });
});

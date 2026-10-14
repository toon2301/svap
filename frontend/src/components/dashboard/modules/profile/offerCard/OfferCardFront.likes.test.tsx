import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OfferCardFront, type OfferCardFrontProps } from './OfferCardFront';
import { resetOfferReviewsOrigin } from '../../reviews/offerReviewsOrigin';

const push = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('../../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: () => <div data-testid='image-carousel' />,
}));

function props(overrides: Partial<OfferCardFrontProps> = {}): OfferCardFrontProps {
  return {
    offer: { id: 7, category: 'Domácnosť', subcategory: 'Maliarske práce', description: '' },
    accountType: 'personal',
    t: (_key, fallback) => fallback,
    isFlipped: false,
    isHidden: false,
    isHighlighted: false,
    onToggleFlip: jest.fn(),
    imageAlt: 'Maliarske práce',
    label: 'Maliarske práce',
    headline: 'Vymaľujem byt',
    priceLabel: null,
    displayLocationText: null,
    hasMultipleImages: false,
    hasImages: false,
    imageCount: 0,
    ...overrides,
  };
}

describe('OfferCardFront scoped Like visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetOfferReviewsOrigin();
    window.history.replaceState(null, '', '/dashboard/watches');
  });

  it.each([false, true])('removes Like from the DOM for seeking=%s without losing flip', (isSeeking) => {
    const onToggleLike = jest.fn();
    const cardProps = props({ showLikes: false, onToggleLike });
    cardProps.offer = { ...cardProps.offer, is_seeking: isSeeking, is_liked_by_me: true, likes_count: 17 };
    render(<OfferCardFront {...cardProps} />);

    expect(screen.queryByRole('button', { name: 'Páči sa mi to' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Páči sa mi to')).not.toBeInTheDocument();
    expect(screen.getByText('Vymaľujem byt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Otočiť' }));
    expect(cardProps.onToggleFlip).toHaveBeenCalledTimes(1);
    expect(onToggleLike).not.toHaveBeenCalled();
  });

  it.each([undefined, true])('keeps the Like control working when showLikes is %s', (showLikes) => {
    const onToggleLike = jest.fn();
    const onParentClick = jest.fn();
    render(<div onClick={onParentClick}><OfferCardFront {...props({ showLikes, onToggleLike })} /></div>);

    const button = screen.getByRole('button', { name: 'Páči sa mi to' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('aria-busy', 'false');
    expect(button.querySelector('svg')).toHaveAttribute('fill', 'none');
    fireEvent.click(button);
    expect(onToggleLike).toHaveBeenCalledWith(7);
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('keeps an existing liked and pending state when Likes are enabled', () => {
    const onToggleLike = jest.fn();
    const cardProps = props({ isLikePending: true, onToggleLike });
    cardProps.offer.is_liked_by_me = true;
    render(<OfferCardFront {...cardProps} />);

    const button = screen.getByRole('button', { name: 'Páči sa mi to' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
    fireEvent.click(button);
    expect(onToggleLike).not.toHaveBeenCalled();
  });

  it.each(['missing handler', 'invalid id'])('keeps Like guarded for %s', (guard) => {
    const onToggleLike = jest.fn();
    const cardProps = props({ onToggleLike: guard === 'missing handler' ? undefined : onToggleLike });
    if (guard === 'invalid id') cardProps.offer.id = undefined as unknown as number;
    render(<OfferCardFront {...cardProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Páči sa mi to' }));
    expect(onToggleLike).not.toHaveBeenCalled();
  });

  it('can restore the same Like when a shared card opts back in', () => {
    const cardProps = props();
    cardProps.offer.is_liked_by_me = true;
    const { rerender } = render(<OfferCardFront {...cardProps} showLikes={false} />);
    expect(screen.queryByRole('button', { name: 'Páči sa mi to' })).not.toBeInTheDocument();
    rerender(<OfferCardFront {...cardProps} showLikes={true} />);
    expect(screen.getByRole('button', { name: 'Páči sa mi to' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves photos, sharing, review navigation, and flip available without Like', () => {
    const onOpenImageGallery = jest.fn();
    const onShareClick = jest.fn();
    const onParentClick = jest.fn();
    const onParentKeyDown = jest.fn();
    const cardProps = props({
      showLikes: false,
      isOtherUserProfile: true,
      reviewsHref: '/dashboard/offers/7/reviews',
      onShareClick,
      onOpenImageGallery,
      hasImages: true,
      hasMultipleImages: true,
      imageCount: 2,
    });
    cardProps.offer.already_reviewed = true;
    const { container } = render(
      <div onClick={onParentClick} onKeyDown={onParentKeyDown}><OfferCardFront {...cardProps} /></div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fotky' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Fotky' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Zdieľať ponuku' }));
    const reviews = screen.getByRole('button', { name: 'Pridať recenziu' });
    expect(reviews.querySelector('polygon')).toHaveAttribute('fill', 'currentColor');
    fireEvent.click(reviews);
    fireEvent.click(screen.getByRole('button', { name: 'Otočiť' }));

    expect(onOpenImageGallery).toHaveBeenCalledTimes(1);
    expect(onShareClick).toHaveBeenCalledWith(cardProps.offer);
    expect(push).toHaveBeenCalledWith('/dashboard/offers/7/reviews');
    expect(cardProps.onToggleFlip).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
    expect(onParentKeyDown).not.toHaveBeenCalled();
    expect(container.querySelector('path[d^="M20.84 4.61"]')).not.toBeInTheDocument();
  });

  it('keeps offer edit and delete controls on an owned card without Like', () => {
    const onEditOffer = jest.fn();
    const onDeleteOffer = jest.fn();
    const onParentClick = jest.fn();
    const onParentKeyDown = jest.fn();
    const cardProps = props({ showLikes: false, onEditOffer, onDeleteOffer });
    render(<div onClick={onParentClick} onKeyDown={onParentKeyDown}><OfferCardFront {...cardProps} /></div>);

    for (const name of ['Upraviť kartu', 'Vymazať kartu']) {
      fireEvent.click(screen.getByRole('button', { name }));
      fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' });
    }
    expect(onEditOffer).toHaveBeenCalledWith(cardProps.offer);
    expect(onDeleteOffer).toHaveBeenCalledWith(cardProps.offer);
    expect(onParentClick).not.toHaveBeenCalled();
    expect(onParentKeyDown).not.toHaveBeenCalled();
  });

  it.each([false, true])('retains request and message front actions for seeking=%s', (isSeeking) => {
    const onRequestClick = jest.fn();
    const onMessageClick = jest.fn();
    const onParentClick = jest.fn();
    const cardProps = props({ showLikes: false, isOtherUserProfile: true, onRequestClick, onMessageClick });
    cardProps.offer.is_seeking = isSeeking;
    render(<div onClick={onParentClick}><OfferCardFront {...cardProps} /></div>);

    fireEvent.click(screen.getByRole('button', { name: isSeeking ? 'Pomôcť' : 'Mám záujem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Správa' }));
    expect(onRequestClick).toHaveBeenCalledWith(7);
    expect(onMessageClick).toHaveBeenCalledWith(7);
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('retains custom labels and disabled CTA states independently of Like', () => {
    const onRequestClick = jest.fn();
    const onMessageClick = jest.fn();
    render(<OfferCardFront {...props({
      showLikes: false,
      isOtherUserProfile: true,
      onRequestClick,
      onMessageClick,
      requestLabel: 'Záujem odoslaný',
      messageLabel: 'Otváram…',
      isRequestDisabled: true,
      isMessageDisabled: true,
    })} />);

    const request = screen.getByRole('button', { name: 'Záujem odoslaný' });
    const message = screen.getByRole('button', { name: 'Otváram…' });
    expect(request).toBeDisabled();
    expect(message).toBeDisabled();
    fireEvent.click(request);
    fireEvent.click(message);
    expect(onRequestClick).not.toHaveBeenCalled();
    expect(onMessageClick).not.toHaveBeenCalled();
  });

  it.each(['request', 'message'])('does not manufacture the missing action beside %s', (action) => {
    const onRequestClick = action === 'request' ? jest.fn() : undefined;
    const onMessageClick = action === 'message' ? jest.fn() : undefined;
    const { container } = render(<OfferCardFront {...props({ showLikes: false, isOtherUserProfile: true, onRequestClick, onMessageClick })} />);
    expect(container.querySelector('[data-default-cta]')).toBe(action === 'request' ? screen.getByText('Mám záujem') : null);
    expect(container.querySelector('[data-message-cta]')).toBe(action === 'message' ? screen.getByText('Správa') : null);
  });

  it('does not invoke request/message handlers for an offer without a numeric id', () => {
    const onRequestClick = jest.fn();
    const onMessageClick = jest.fn();
    const cardProps = props({ showLikes: false, isOtherUserProfile: true, onRequestClick, onMessageClick });
    cardProps.offer.id = undefined as unknown as number;
    render(<OfferCardFront {...cardProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mám záujem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Správa' }));
    expect(onRequestClick).not.toHaveBeenCalled();
    expect(onMessageClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Pridať recenziu' })).not.toBeInTheDocument();
  });

  it('keeps management and profile CTAs scoped to the correct owner', () => {
    const onEditOffer = jest.fn();
    const onDeleteOffer = jest.fn();
    const onRequestClick = jest.fn();
    const onMessageClick = jest.fn();
    const { rerender } = render(<OfferCardFront {...props({ showLikes: false, isOtherUserProfile: true, onEditOffer, onDeleteOffer })} />);
    expect(screen.queryByRole('button', { name: 'Upraviť kartu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vymazať kartu' })).not.toBeInTheDocument();
    rerender(<OfferCardFront {...props({ showLikes: false, onRequestClick, onMessageClick })} />);
    expect(screen.queryByRole('button', { name: 'Mám záujem' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Správa' })).not.toBeInTheDocument();
  });

  it('does not enable a hidden share action without its handler', () => {
    const { container } = render(<OfferCardFront {...props({ showLikes: false })} />);
    const button = container.querySelector<HTMLButtonElement>('button[aria-label="Zdieľať ponuku"]')!;
    expect(button).toHaveClass('hidden');
    fireEvent.click(button);
    expect(push).not.toHaveBeenCalled();
  });

  it.each([undefined, 0, 1])('retains the own-profile review fill for reviews_count=%s', (reviewsCount) => {
    const cardProps = props({ showLikes: false, reviewsHref: '/dashboard/offers/7/reviews' });
    cardProps.offer.reviews_count = reviewsCount;
    render(<OfferCardFront {...cardProps} />);
    expect(screen.getByRole('button', { name: 'Pridať recenziu' }).querySelector('polygon'))
      .toHaveAttribute('fill', reviewsCount ? 'currentColor' : 'none');
  });

  it.each([undefined, false])('keeps an unreviewed other-user icon for already_reviewed=%s', (alreadyReviewed) => {
    const cardProps = props({ showLikes: false, isOtherUserProfile: true, reviewsHref: '/dashboard/offers/7/reviews' });
    cardProps.offer.already_reviewed = alreadyReviewed;
    render(<OfferCardFront {...cardProps} />);
    expect(screen.getByRole('button', { name: 'Pridať recenziu' }).querySelector('polygon')).toHaveAttribute('fill', 'none');
  });

  it('does not add reviews to demand cards', () => {
    const cardProps = props({ showLikes: false, reviewsHref: '/dashboard/offers/7/reviews' });
    cardProps.offer.is_seeking = true;
    render(<OfferCardFront {...cardProps} />);
    expect(screen.queryByRole('button', { name: 'Pridať recenziu' })).not.toBeInTheDocument();
  });

  it.each(['years', 'months'] as const)('keeps the existing card content and %s experience', (unit) => {
    const cardProps = props({ showLikes: false, accountType: 'business', displayLocationText: 'Bratislava', priceLabel: '10 €', compactTop: true, showFlipHint: true });
    cardProps.offer = { ...cardProps.offer, is_seeking: unit === 'months', experience: { value: 2, unit } };
    const { container } = render(<OfferCardFront {...cardProps} />);
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('Bratislava')).toBeInTheDocument();
    expect(screen.getByText(unit === 'years' ? '2 rokov' : '2 mesiacov')).toBeInTheDocument();
    expect(screen.getByText(unit === 'years' ? 'Cena od:' : 'Cena do:')).toBeInTheDocument();
    expect(screen.getByText('10 €')).toBeInTheDocument();
    expect(container.querySelector('.rounded-t-none')).toBeInTheDocument();
    expect(container.querySelector('.desktop-card-flip-hint')).toBeInTheDocument();
    expect(container.querySelector('.h-52')).toBeInTheDocument();
  });

  it('preserves noninteractive multiple-image badges and an empty category label', () => {
    const { container } = render(<OfferCardFront {...props({ showLikes: false, label: '', hasMultipleImages: true, imageCount: 3 })} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fotky' })).not.toBeInTheDocument();
    expect(screen.queryByText('Maliarske práce')).not.toBeInTheDocument();
    expect(container.querySelector('.rounded-t-2xl')).toBeInTheDocument();
  });

  it('does not add a gallery button when the card has no usable images', () => {
    const onOpenImageGallery = jest.fn();
    render(<OfferCardFront {...props({ showLikes: false, onOpenImageGallery, hasImages: false })} />);
    expect(screen.queryByRole('button', { name: 'Fotky' })).not.toBeInTheDocument();
    expect(onOpenImageGallery).not.toHaveBeenCalled();
  });

  it('retains the front/back visibility class without changing the card dimensions', () => {
    const { container } = render(<OfferCardFront {...props({ showLikes: false, isFlipped: true })} />);
    expect(container.firstElementChild).toHaveClass('hidden');
    expect(container.querySelector('.h-52')).toBeInTheDocument();
  });
});

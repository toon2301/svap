import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OfferCardBack, type OfferCardBackProps } from './OfferCardBack';
import type { Offer } from '../profileOffersTypes';
import { resetOfferReviewsOrigin } from '../../reviews/offerReviewsOrigin';

function props(overrides: Partial<OfferCardBackProps> = {}): OfferCardBackProps {
  return {
    offer: {
      id: 7,
      category: 'Domácnosť',
      subcategory: 'Maliarske práce',
      description: '',
      detailed_description: 'Pôvodný podrobný opis',
      likes_count: 17,
      is_liked_by_me: true,
    },
    accountType: 'personal',
    t: (_key, fallback) => fallback,
    onToggleFlip: jest.fn(),
    isFlipped: true,
    ...overrides,
  };
}

describe('OfferCardBack scoped Like visibility', () => {
  beforeEach(() => {
    resetOfferReviewsOrigin();
    window.history.replaceState(null, '', '/dashboard/watches');
  });

  it.each([false, true])('removes the entire Like row for seeking=%s without adding a CTA', (isSeeking) => {
    const cardProps = props({ showLikes: false });
    cardProps.offer = { ...cardProps.offer, is_seeking: isSeeking };
    const { container } = render(<OfferCardBack {...cardProps} />);

    expect(screen.queryByText('Páči sa mi to')).not.toBeInTheDocument();
    expect(screen.queryByText('17')).not.toBeInTheDocument();
    expect(container.querySelector('path[d^="M20.84 4.61"]')).not.toBeInTheDocument();
    expect(screen.getByText('Pôvodný podrobný opis')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Správa|Mám záujem|Pomôcť/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Otočiť' }));
    expect(cardProps.onToggleFlip).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, true])('retains the complete Like row when showLikes is %s', (showLikes) => {
    const { container } = render(<OfferCardBack {...props({ showLikes })} />);
    expect(screen.getByText('Páči sa mi to')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(container.querySelector('path[d^="M20.84 4.61"]')?.parentElement).toHaveAttribute('fill', 'currentColor');
    expect(screen.queryByRole('button', { name: 'Páči sa mi to' })).not.toBeInTheDocument();
  });

  it.each([undefined, 0, -10, 1234])('retains count normalization for likes_count=%s', (likesCount) => {
    const cardProps = props();
    cardProps.offer = { ...cardProps.offer, likes_count: likesCount, is_liked_by_me: false };
    const { container } = render(<OfferCardBack {...cardProps} />);
    const expectedCount = new Intl.NumberFormat('sk-SK').format(Math.max(0, likesCount ?? 0));
    expect(screen.getByText((_text, element) => element?.tagName === 'SPAN' && element.textContent === expectedCount)).toBeInTheDocument();
    expect(container.querySelector('path[d^="M20.84 4.61"]')?.parentElement).toHaveAttribute('fill', 'none');
  });

  it('hides and restores the summary without resetting the offer data', () => {
    const cardProps = props();
    const { rerender } = render(<OfferCardBack {...cardProps} />);
    expect(screen.getByText('17')).toBeInTheDocument();
    rerender(<OfferCardBack {...cardProps} showLikes={false} />);
    expect(screen.queryByText('17')).not.toBeInTheDocument();
    rerender(<OfferCardBack {...cardProps} showLikes={true} />);
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('retains the default Like row for demand cards outside Sledovania', () => {
    const cardProps = props();
    cardProps.offer.is_seeking = true;
    render(<OfferCardBack {...cardProps} />);
    expect(screen.getByText('Páči sa mi to').parentElement).toHaveClass('mt-8');
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('retains rating stars, reviews, opening hours, tags and a genuine flip without Like', () => {
    const onOpenHoursClick = jest.fn();
    const onParentClick = jest.fn();
    const cardProps = props({ showLikes: false, accountType: 'business', onOpenHoursClick, reviewsHref: '/dashboard/offers/7/reviews', compactTop: true });
    cardProps.offer = { ...cardProps.offer, reviews_count: 8, average_rating: 4.5, tags: ['maliar', 'interiér'] };
    const { container } = render(<div onClick={onParentClick}><OfferCardBack {...cardProps} /></div>);

    expect(screen.getByText('Hodnotenia')).toBeInTheDocument();
    expect(screen.getByText('4.5 (8)')).toBeInTheDocument();
    const stars = [...container.querySelectorAll<SVGElement>('svg.text-yellow-400')];
    expect(stars).toHaveLength(5);
    expect(stars[0].style.clipPath).toBe('inset(0 0% 0 0)');
    expect(stars[4].style.clipPath).toBe('inset(0 50% 0 0)');
    expect(screen.getByText('#maliar')).toBeInTheDocument();
    expect(screen.getByText('#interiér')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Všetky recenzie' })).toHaveAttribute('href', '/dashboard/offers/7/reviews');
    fireEvent.click(screen.getByRole('button', { name: 'Otváracie hodiny' }));
    expect(onOpenHoursClick).toHaveBeenCalledTimes(1);
    // Opening-hours bubbling is unchanged; the flip control itself must stop propagation.
    onParentClick.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Otočiť' }));
    expect(cardProps.onToggleFlip).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
    expect(container.querySelector('.rounded-t-none')).toBeInTheDocument();
    expect(container.querySelector('.h-52')).toBeInTheDocument();
  });

  it.each([undefined, null, 0, 1.5, 3])('retains rating fallback and partial stars for rating=%s', (rating) => {
    const cardProps = props({ showLikes: false });
    cardProps.offer = { ...cardProps.offer, reviews_count: 2, average_rating: rating };
    const { container } = render(<OfferCardBack {...cardProps} />);
    expect(screen.getByText(`${(rating || 0).toFixed(1)} (2)`)).toBeInTheDocument();
    const stars = [...container.querySelectorAll<SVGElement>('svg.text-yellow-400')];
    const finalFill = rating === 1.5 ? '50%' : '100%';
    expect(stars[rating === 1.5 ? 1 : 4].style.clipPath).toBe(`inset(0 ${finalFill} 0 0)`);
  });

  it.each([undefined, 0])('retains the unrated empty state for count=%s', (reviewsCount) => {
    const cardProps = props({ showLikes: false });
    cardProps.offer.reviews_count = reviewsCount;
    render(<OfferCardBack {...cardProps} />);
    expect(screen.getByText('Zatiaľ bez hodnotenia')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Všetky recenzie' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Otváracie hodiny' })).not.toBeInTheDocument();
  });

  it.each([
    ['low', 'Nízka', 'one_time', 'Jednorazovo'],
    ['medium', 'Stredná', 'long_term', 'Dlhodobo'],
    ['high', 'Vysoká', 'project', 'Zákazka'],
  ] as const)('retains %s urgency and %s demand details without Like', (urgency, urgencyLabel, duration, durationLabel) => {
    const cardProps = props({ showLikes: false, accountType: 'business', reviewsHref: '/dashboard/offers/7/reviews' });
    cardProps.offer = { ...cardProps.offer, is_seeking: true, urgency, duration_type: duration, tags: ['pomoc'] };
    render(<OfferCardBack {...cardProps} />);
    expect(screen.getByText(urgencyLabel)).toBeInTheDocument();
    expect(screen.getByText(durationLabel)).toBeInTheDocument();
    expect(screen.getByText('#pomoc')).toBeInTheDocument();
    expect(screen.queryByText('Hodnotenia')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Všetky recenzie' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Otváracie hodiny' })).not.toBeInTheDocument();
  });

  it.each([undefined, '', '   '])('does not add empty demand details for value=%s', (value) => {
    const cardProps = props({ showLikes: false });
    cardProps.offer = { ...cardProps.offer, is_seeking: true, urgency: value as Offer['urgency'], duration_type: value as Offer['duration_type'], tags: [] };
    render(<OfferCardBack {...cardProps} />);
    expect(screen.queryByText('Urgentnosť:', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('Trvanie:', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
  });

  it.each([undefined, '', '   '])('retains the empty-description state for value=%s', (description) => {
    const cardProps = props({ showLikes: false });
    cardProps.offer.detailed_description = description;
    render(<OfferCardBack {...cardProps} />);
    expect(screen.getByText('Bez popisu')).toBeInTheDocument();
    expect(screen.queryByText('Popis', { exact: true })).not.toBeInTheDocument();
  });

  it('preserves hidden back state, card dimensions, and ordinary top corners', () => {
    const { container } = render(<OfferCardBack {...props({ showLikes: false, isFlipped: false })} />);
    expect(container.firstElementChild).toHaveClass('hidden');
    expect(container.querySelector('.h-52')).toBeInTheDocument();
    expect(container.querySelector('.rounded-t-2xl')).toBeInTheDocument();
  });
});

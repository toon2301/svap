import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfileOfferCardMobile } from './ProfileOfferCardMobile';
import type { Offer } from './profileOffersTypes';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'sk', t: (_key: string, fallback: string) => fallback }),
}));
jest.mock('../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
jest.mock('../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: ({ open, onClose, alt }: { open: boolean; onClose: () => void; alt: string }) => open
    ? <div role="dialog" aria-label={alt} onClick={(event) => event.stopPropagation()}><button onClick={onClose}>close gallery</button></div>
    : null,
}));

type CardProps = React.ComponentProps<typeof ProfileOfferCardMobile>;
const offer: Offer = {
  id: 17, category: 'Design', subcategory: 'Logo', description: 'Custom logo design',
  images: [], is_liked_by_me: false, likes_count: 4,
};

function renderCard(props: Partial<CardProps> = {}) {
  const onCardClick = jest.fn();
  const result = render(<ProfileOfferCardMobile
    offer={offer} accountType="personal" isTapped={false} onCardClick={onCardClick} {...props}
  />);
  return { ...result, onCardClick, card: result.container.firstElementChild as HTMLElement };
}

beforeEach(() => jest.clearAllMocks());

describe('shared mobile offer card defaults remain suitable for profile callers', () => {
  it('preserves the caller-supplied highlighted-card marker', () => {
    const { card } = renderCard({ isHighlighted: true });
    expect(card).toHaveClass('highlight-offer-card');
  });

  it('does not navigate from a visible review action for a malformed legacy offer id', () => {
    const { onCardClick } = renderCard({
      offer: { ...offer, id: 'legacy-id' as unknown as number },
      reviewsHref: '/dashboard/offers/17/reviews',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pridať recenziu' }));
    expect(mockPush).not.toHaveBeenCalled();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it.each([false, true])('suppresses only profile actions in search for seeking=%s', (isSeeking) => {
    const onShareClick = jest.fn();
    const onToggleLike = jest.fn();
    const { card, onCardClick } = renderCard({
      offer: { ...offer, is_seeking: isSeeking }, isOtherUserProfile: true,
      showProfileActions: false, compactTop: true, onShareClick, onToggleLike,
    });
    expect(card).toHaveClass('rounded-b-2xl', 'border-0', 'shadow-none');
    expect(card).not.toHaveClass('rounded-2xl');
    expect(screen.queryByRole('button', { name: 'Pridať recenziu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: isSeeking ? 'Pomôcť' : 'Mám záujem' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Správa' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zdieľať ponuku' }));
    fireEvent.click(screen.getByRole('button', { name: 'Páči sa mi to' }));
    expect(onShareClick).toHaveBeenCalledWith(expect.objectContaining({ id: 17 }));
    expect(onToggleLike).toHaveBeenCalledWith(17);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('retains management callbacks when a caller disables unrelated profile actions', () => {
    const onEditOffer = jest.fn();
    const onDeleteOffer = jest.fn();
    renderCard({ showProfileActions: false, onEditOffer, onDeleteOffer });
    fireEvent.click(screen.getByRole('button', { name: 'Upraviť kartu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vymazať kartu' }));
    expect(onEditOffer).toHaveBeenCalledWith(offer);
    expect(onDeleteOffer).toHaveBeenCalledWith(offer);
  });

  it.each([false, true])('preserves the offering/seeking strip for seeking=%s', (isSeeking) => {
    const { card, onCardClick } = renderCard({ offer: { ...offer, is_seeking: isSeeking } });
    expect(screen.getByText(isSeeking ? 'Hľadám' : 'Ponúkam', { exact: true })).toBeInTheDocument();
    expect(card).toHaveClass('rounded-2xl', 'border');
    fireEvent.click(card);
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('hides the strip after the caller records the first tap', () => {
    renderCard({ isTapped: true });
    expect(screen.queryByText('Ponúkam', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText(offer.description)).toBeInTheDocument();
  });

  it.each(['Enter', ' '])('retains keyboard activation of the card itself for %j', (key) => {
    const { card, onCardClick } = renderCard();
    fireEvent.keyDown(card, { key });
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated keyboard keys and keys from nested Like controls', () => {
    const { card, onCardClick } = renderCard();
    fireEvent.keyDown(card, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Páči sa mi to' }), { key: 'Enter' });
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it.each([false, true])('preserves Like state and invokes the caller without opening the card: %s', (isLiked) => {
    const onToggleLike = jest.fn();
    const { onCardClick } = renderCard({ offer: { ...offer, is_liked_by_me: isLiked }, onToggleLike });
    const like = screen.getByRole('button', { name: 'Páči sa mi to' });
    expect(like).toHaveAttribute('aria-pressed', String(isLiked));
    expect(like.querySelector('svg')).toHaveAttribute('fill', isLiked ? 'currentColor' : 'none');
    fireEvent.click(like);
    expect(onToggleLike).toHaveBeenCalledWith(17);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('keeps a pending Like disabled and busy', () => {
    const onToggleLike = jest.fn();
    renderCard({ isLikePending: true, onToggleLike });
    const like = screen.getByRole('button', { name: 'Páči sa mi to' });
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(like);
    expect(onToggleLike).not.toHaveBeenCalled();
  });

  it.each([undefined, 'invalid' as unknown as number])('does not call an absent/invalid Like callback for id=%s', (id) => {
    const { onCardClick } = renderCard({ offer: { ...offer, id: id as number } });
    fireEvent.click(screen.getByRole('button', { name: 'Páči sa mi to' }));
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('retains own-profile manage actions without allowing the card click to bubble', () => {
    const onEditOffer = jest.fn();
    const onDeleteOffer = jest.fn();
    const { onCardClick } = renderCard({ onEditOffer, onDeleteOffer });
    for (const label of ['Upraviť kartu', 'Vymazať kartu']) {
      const action = screen.getByRole('button', { name: label });
      fireEvent.keyDown(action, { key: 'Enter' });
      fireEvent.click(action);
    }
    expect(onEditOffer).toHaveBeenCalledWith(offer);
    expect(onDeleteOffer).toHaveBeenCalledWith(offer);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it.each(['Enter', ' ', 'Space'])('retains Share keyboard action for %j without opening the card', (key) => {
    const onShareClick = jest.fn();
    const { onCardClick } = renderCard({ onShareClick });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Zdieľať ponuku' }), { key });
    expect(onShareClick).toHaveBeenCalledWith(offer);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('retains Share click and ignores unrelated keys', () => {
    const onShareClick = jest.fn();
    const { onCardClick } = renderCard({ onShareClick });
    const share = screen.getByRole('button', { name: 'Zdieľať ponuku' });
    fireEvent.keyDown(share, { key: 'ArrowDown' });
    expect(onShareClick).not.toHaveBeenCalled();
    fireEvent.click(share);
    expect(onShareClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it.each([false, true])('keeps hidden-state visibility restricted to the owner: other=%s', (other) => {
    const { card } = renderCard({ offer: { ...offer, is_hidden: true }, isOtherUserProfile: other });
    expect(card.classList.contains('opacity-60')).toBe(!other);
    expect(Boolean(screen.queryByText('Skrytá'))).toBe(!other);
  });

  it.each([
    { category: 'Design', subcategory: 'Logo', description: '   ', expected: 'Logo' },
    { category: 'Design', subcategory: '', description: '', expected: 'Design' },
    { category: '', subcategory: 'Logo', description: '', expected: 'Logo' },
    { category: '', subcategory: '', description: '', expected: 'Bez popisu' },
  ])('preserves headline fallback for %j', ({ expected, ...fields }) => {
    renderCard({ offer: { ...offer, ...fields } });
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', expected === 'Bez popisu' ? 'Ponúkam' : expected);
  });

  it.each([
    { location: 'Bratislava', district: 'Nitra', expected: 'Bratislava' },
    { location: ' ', district: 'Nitra', expected: 'Nitra' },
    { location: '', district: '', expected: null },
  ])('preserves location fallbacks for %j', ({ expected, ...fields }) => {
    renderCard({ offer: { ...offer, ...fields } });
    if (expected) expect(screen.getByText(expected)).toBeInTheDocument();
    else expect(screen.queryByText('Miesto:')).not.toBeInTheDocument();
  });

  it.each(['years', 'months'] as const)('preserves %s experience and business badge', (unit) => {
    renderCard({ accountType: 'business', offer: { ...offer, experience: { value: 7, unit } } });
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText(unit === 'years' ? '7 rokov' : '7 mesiacov')).toBeInTheDocument();
  });

  it.each([
    { price_from: 0, price_currency: '', expected: '0 €' },
    { price_from: 12.5, price_currency: 'Kč', expected: '12,5 Kč' },
    { price_negotiable: true, expected: 'Dohodou' },
  ])('preserves price formatting and demand label for %j', ({ expected, ...fields }) => {
    renderCard({ offer: { ...offer, ...fields, is_seeking: true } });
    expect(screen.getByText('Cena do:')).toBeInTheDocument();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('retains price-from offer labels while omitting unavailable prices', () => {
    const view = renderCard({ offer: { ...offer, price_from: 3 } });
    expect(screen.getByText('Cena od:')).toBeInTheDocument();
    view.unmount();
    renderCard({ offer: { ...offer, price_from: null } });
    expect(screen.queryByText('Cena od:')).not.toBeInTheDocument();
  });

  it('preserves the enabled gallery and its close behavior without opening the card', () => {
    const images = [{ id: 1, image_url: '/a.webp' }, { id: 2, image: '/b.webp' }, { id: 3 }];
    const { onCardClick } = renderCard({ enableImageGallery: true, offer: { ...offer, images } });
    const photos = screen.getByRole('button', { name: 'Fotky' });
    expect(photos).toHaveTextContent('2');
    fireEvent.keyDown(photos, { key: 'Enter' });
    fireEvent.click(photos);
    expect(screen.getByRole('dialog', { name: offer.description })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close gallery' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('shows only the count for multiple images when the gallery is not enabled', () => {
    renderCard({ offer: { ...offer, images: [{ id: 1, image: '/a' }, { id: 2, image_url: '/b' }] } });
    expect(screen.getByText('2', { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fotky' })).not.toBeInTheDocument();
  });

  it.each([false, true])('preserves the review icon fill for reviewed=%s on a foreign profile', (reviewed) => {
    renderCard({ offer: { ...offer, already_reviewed: reviewed }, isOtherUserProfile: true });
    expect(screen.getByRole('button', { name: 'Pridať recenziu' }).querySelector('polygon'))
      .toHaveAttribute('fill', reviewed ? 'currentColor' : 'none');
  });

  it.each([false, true])('preserves the owner review icon count policy for reviews=%s', (hasReviews) => {
    renderCard({ offer: { ...offer, reviews_count: hasReviews ? 1 : 0 } });
    expect(screen.getByRole('button', { name: 'Pridať recenziu' }).querySelector('polygon'))
      .toHaveAttribute('fill', hasReviews ? 'currentColor' : 'none');
  });

  it.each([false, true])('preserves default foreign profile contact actions for seeking=%s', (isSeeking) => {
    const onRequestClick = jest.fn();
    const onMessageClick = jest.fn();
    const { onCardClick } = renderCard({ offer: { ...offer, is_seeking: isSeeking }, isOtherUserProfile: true, onRequestClick, onMessageClick });
    fireEvent.click(screen.getByRole('button', { name: isSeeking ? 'Pomôcť' : 'Mám záujem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Správa' }));
    expect(onRequestClick).toHaveBeenCalledWith(17);
    expect(onMessageClick).toHaveBeenCalledWith(17);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('preserves disabled custom contact labels and does not call disabled actions', () => {
    const onRequestClick = jest.fn();
    const onMessageClick = jest.fn();
    renderCard({ isOtherUserProfile: true, onRequestClick, onMessageClick, requestLabel: 'Waiting', messageLabel: 'Blocked', isRequestDisabled: true, isMessageDisabled: true });
    fireEvent.click(screen.getByRole('button', { name: 'Waiting' }));
    fireEvent.click(screen.getByRole('button', { name: 'Blocked' }));
    expect(onRequestClick).not.toHaveBeenCalled();
    expect(onMessageClick).not.toHaveBeenCalled();
  });
});

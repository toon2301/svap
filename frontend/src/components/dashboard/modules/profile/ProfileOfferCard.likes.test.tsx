import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import ProfileOfferCard from './ProfileOfferCard';
import { setOfferLikeState } from './offerLikesApi';
import type { Offer, OfferImage } from './profileOffersTypes';

jest.mock('./offerLikesApi', () => ({ setOfferLikeState: jest.fn() }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
jest.mock('../shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  /** Isolate the heavy gallery while keeping its real wrapper open/close callbacks. */
  default: ({ open, onClose, alt }: { open: boolean; onClose: () => void; alt: string }) => open
    ? <div role="dialog" aria-label={alt}><button onClick={onClose}>close gallery</button></div>
    : null,
}));

const toggleLike = jest.mocked(setOfferLikeState);
const translate = (_key: string, fallback: string) => fallback;
const offer: Offer = {
  id: 7, category: 'Domácnosť a služby', subcategory: 'Maliarske práce',
  description: 'Práca v interiéri', detailed_description: 'Detailný popis.',
  is_seeking: false, likes_count: 3, is_liked_by_me: false,
};

type CardProps = React.ComponentProps<typeof ProfileOfferCard>;

/** Render the real shared card with its own flip state and optional caller props. */
function CardHarness({ cardOffer = offer, ...overrides }: Partial<CardProps> & { cardOffer?: Offer }) {
  const [flipped, setFlipped] = useState(false);
  return <ProfileOfferCard
    offer={cardOffer} accountType="personal" t={translate}
    isFlipped={flipped} onToggleFlip={() => setFlipped((value) => !value)} {...overrides}
  />;
}

/** Scope clicks to the active side even though unit tests do not load Tailwind's hidden class. */
function activeSide(container: HTMLElement): HTMLElement {
  return Array.from(container.firstElementChild!.children)
    .find((element) => element.classList.contains('block')) as HTMLElement;
}

/** Read the entire summary row, including its count, rather than unrelated prices or ratings. */
function summary() {
  return screen.getByText('Páči sa mi to', { exact: true }).parentElement!;
}

beforeEach(() => {
  jest.clearAllMocks();
  toggleLike.mockResolvedValue({ offer_id: 7, is_liked_by_me: true, likes_count: 4 });
});

describe('shared offer card Like opt-out and default behavior', () => {
  it.each([false, true])('omits the front Like action but retains the read-only back count for seeking=%s', (isSeeking) => {
    const { container } = render(<CardHarness cardOffer={{ ...offer, is_seeking: isSeeking, is_liked_by_me: true, likes_count: 937 }} showLikeAction={false} />);
    expect(screen.queryByRole('button', { name: 'Páči sa mi to' })).not.toBeInTheDocument();
    expect(summary()).toHaveTextContent('937');
    fireEvent.click(within(activeSide(container)).getByRole('button', { name: 'Otočiť' }));
    expect(activeSide(container)).toHaveTextContent('Detailný popis.');
    expect(within(activeSide(container)).getByText('937', { exact: true })).toBeInTheDocument();
    expect(summary().closest('button')).toBeNull();
    fireEvent.click(summary());
    expect(container.querySelector('[data-default-cta]')).toBeNull();
    expect(container.querySelector('[data-message-cta]')).toBeNull();
    expect(toggleLike).not.toHaveBeenCalled();
  });

  it.each([undefined, true])('retains working Like when showLikeAction=%s', async (showLikeAction) => {
    render(<CardHarness showLikeAction={showLikeAction} />);
    const like = screen.getByRole('button', { name: 'Páči sa mi to' });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(like);
    expect(toggleLike).toHaveBeenCalledWith(7, true);
    await waitFor(() => expect(like).not.toBeDisabled());
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(summary()).toHaveTextContent('4');
  });

  it('retains unlike and clamps an inconsistent negative server count', async () => {
    toggleLike.mockResolvedValue({ offer_id: 7, is_liked_by_me: false, likes_count: -2 });
    render(<CardHarness cardOffer={{ ...offer, is_liked_by_me: true, likes_count: 0 }} />);
    const like = screen.getByRole('button', { name: 'Páči sa mi to' });
    fireEvent.click(like);
    expect(toggleLike).toHaveBeenCalledWith(7, false);
    await waitFor(() => expect(like).not.toBeDisabled());
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(summary()).toHaveTextContent('0');
  });

  it('preserves optimistic state, pending lock and authoritative server response', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof setOfferLikeState>>) => void;
    toggleLike.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<CardHarness />);
    const like = screen.getByRole('button', { name: 'Páči sa mi to' });
    fireEvent.click(like);
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(summary()).toHaveTextContent('4');
    fireEvent.click(like);
    expect(toggleLike).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ offer_id: 7, is_liked_by_me: true, likes_count: 12 }));
    expect(like).not.toBeDisabled();
    expect(summary()).toHaveTextContent('12');
  });

  it('keeps the existing rollback and human error toast on a failed Like', async () => {
    toggleLike.mockRejectedValue(new Error('Fixture failure'));
    render(<CardHarness />);
    const like = screen.getByRole('button', { name: 'Páči sa mi to' });
    fireEvent.click(like);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nepodarilo sa aktualizovať páči sa mi.'));
    expect(like).not.toBeDisabled();
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(summary()).toHaveTextContent('3');
  });

  it('uses the existing optimistic count fallback for a partial response', async () => {
    toggleLike.mockResolvedValue({ offer_id: 7, is_liked_by_me: true } as Awaited<ReturnType<typeof setOfferLikeState>>);
    render(<CardHarness />);
    const like = screen.getByRole('button', { name: 'Páči sa mi to' });
    fireEvent.click(like);
    await waitFor(() => expect(like).not.toBeDisabled());
    expect(summary()).toHaveTextContent('4');
  });

  it('preserves a controlled caller callback and pending/updated props', () => {
    const onToggleLike = jest.fn();
    const view = render(<CardHarness onToggleLike={onToggleLike} />);
    fireEvent.click(screen.getByRole('button', { name: 'Páči sa mi to' }));
    expect(onToggleLike).toHaveBeenCalledWith(7);
    expect(toggleLike).not.toHaveBeenCalled();
    view.rerender(<CardHarness cardOffer={{ ...offer, is_liked_by_me: true, likes_count: 5 }} onToggleLike={onToggleLike} isLikePending />);
    const like = screen.getByRole('button', { name: 'Páči sa mi to' });
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(summary()).toHaveTextContent('5');
    fireEvent.click(like);
    expect(onToggleLike).toHaveBeenCalledTimes(1);
  });

  it('updates the ordinary local Like state when refreshed offer data arrives', () => {
    const view = render(<CardHarness />);
    view.rerender(<CardHarness cardOffer={{ ...offer, id: 8, is_liked_by_me: true, likes_count: 9 }} />);
    expect(screen.getByRole('button', { name: 'Páči sa mi to' })).toHaveAttribute('aria-pressed', 'true');
    expect(summary()).toHaveTextContent('9');
    view.rerender(<CardHarness cardOffer={{ ...offer, id: 8 }} showLikeAction={false} />);
    expect(screen.queryByRole('button', { name: 'Páči sa mi to' })).not.toBeInTheDocument();
    expect(summary()).toHaveTextContent('3');
    expect(toggleLike).not.toHaveBeenCalled();
  });
});

describe('shared card content and existing non-Like actions remain intact', () => {
  it.each([
    [{ ...offer, description: '', category: 'Design', subcategory: '' }, 'Design'],
    [{ ...offer, description: '', category: '', subcategory: 'Custom label' }, 'Custom label'],
    [{ ...offer, description: '', category: '', subcategory: '' }, 'Bez popisu'],
  ] as Array<[Offer, string]>)('keeps translated/fallback card labels %#', (cardOffer, headline) => {
    render(<CardHarness cardOffer={cardOffer} showLikeAction={false} />);
    expect(screen.getAllByText(headline).length).toBeGreaterThan(0);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', headline === 'Bez popisu' ? 'Ponúkam' : headline);
  });

  it('preserves location, district fallback, prices and hidden/highlighted owner state', () => {
    const view = render(<CardHarness cardOffer={{ ...offer, price_from: 0, price_currency: 'Kč', location: 'Praha', district: 'Praha 1', is_hidden: true }} isHighlighted showLikeAction={false} />);
    expect(screen.getByText('0 Kč')).toBeInTheDocument();
    expect(screen.getByText('Praha')).toBeInTheDocument();
    expect(screen.queryByText('Praha 1')).not.toBeInTheDocument();
    expect(screen.getByText('Skrytá')).toBeInTheDocument();
    expect(view.container.firstChild).toHaveClass('highlight-offer-card', 'opacity-60');
    view.rerender(<CardHarness cardOffer={{ ...offer, price_from: 2, district: 'Bratislava', location: ' ', is_hidden: true }} isOtherUserProfile showLikeAction={false} compactTop />);
    expect(screen.getByText('2 €')).toBeInTheDocument();
    expect(screen.getByText('Bratislava')).toBeInTheDocument();
    expect(screen.queryByText('Skrytá')).not.toBeInTheDocument();
    expect(view.container.firstChild).toHaveClass('rounded-b-2xl');
    view.rerender(<CardHarness cardOffer={{ ...offer, price_negotiable: true, price_from: 2, location: '', district: '' }} showLikeAction={false} />);
    expect(screen.getByText('Dohodou')).toBeInTheDocument();
  });

  it('preserves image filtering and gallery open/close after opting out of Likes', () => {
    const view = render(<CardHarness cardOffer={{ ...offer, images: [{ id: 1, image: '/one.jpg' }, { id: 2, image_url: '/two.jpg' }, { id: 3 }] }} enableImageGallery showLikeAction={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fotky' }));
    expect(screen.getByRole('dialog', { name: 'Práca v interiéri' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close gallery' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<CardHarness cardOffer={{ ...offer, images: [{ id: 1, image_url: '/one.jpg' }] }} showLikeAction={false} />);
    expect(screen.queryByRole('button', { name: 'Fotky' })).not.toBeInTheDocument();
    // A malformed legacy image entry must still be ignored by the existing defensive filter.
    view.rerender(<CardHarness cardOffer={{ ...offer, images: [{ id: 1 }, null as unknown as OfferImage] }} enableImageGallery showLikeAction={false} />);
    expect(screen.queryByRole('button', { name: 'Fotky' })).not.toBeInTheDocument();
    expect(toggleLike).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SearchOfferCard from './SearchOfferCard';
import type ProfileOfferCard from '@/components/dashboard/modules/profile/ProfileOfferCard';

const mockDesktopCard = jest.fn();
const mockMobileCard = jest.fn();
let mockViewport = { isMobile: false, isResolved: true };
let mockSearchParams: URLSearchParams | null = new URLSearchParams('q=logo');

jest.mock('@/hooks/useIsMobile', () => ({ useIsMobileState: () => mockViewport }));
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearchParams }));
jest.mock('@/components/dashboard/modules/profile/ProfileOfferCard', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<typeof ProfileOfferCard>) => {
    mockDesktopCard(props);
    return <button onClick={props.onToggleFlip}>desktop flip</button>;
  },
}));
jest.mock('./SearchOfferCardMobile', () => ({
  SearchOfferCardMobile: (props: { offer: { id: number } }) => {
    mockMobileCard(props);
    const [opened, setOpened] = React.useState(false);
    return <button onClick={() => setOpened(true)}>{opened ? `open ${props.offer.id}` : `closed ${props.offer.id}`}</button>;
  },
}));

const props: React.ComponentProps<typeof ProfileOfferCard> = {
  offer: { id: 17, category: 'Design', subcategory: 'Logo', description: 'Search result' },
  accountType: 'business', t: (_key, fallback) => fallback,
  isFlipped: true, onToggleFlip: jest.fn(), isHighlighted: true, isOtherUserProfile: true,
  ownerDisplayName: 'Author', reviewsHref: '/dashboard/offers/17/reviews',
  onRequestClick: jest.fn(), onMessageClick: jest.fn(), onShareClick: jest.fn(),
  onEditOffer: jest.fn(), onDeleteOffer: jest.fn(), onToggleLike: jest.fn(),
  isLikePending: true, requestLabel: 'Waiting', isRequestDisabled: true,
  messageLabel: 'Unavailable', isMessageDisabled: true,
  onOpenHoursClick: jest.fn(), compactTop: true, enableImageGallery: true,
  showFlipHint: true, showLikeAction: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockViewport = { isMobile: false, isResolved: true };
  mockSearchParams = new URLSearchParams('q=logo');
});

describe('search card responsive delegation', () => {
  it('preserves every desktop prop and its existing flip handler', () => {
    render(<SearchOfferCard {...props} />);
    expect(mockDesktopCard).toHaveBeenLastCalledWith(props);
    expect(mockMobileCard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'desktop flip' }));
    expect(props.onToggleFlip).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('keeps unresolved markup hidden on mobile before isMobile=%s resolves', (isMobile) => {
    mockViewport = { isMobile, isResolved: false };
    const { container } = render(<SearchOfferCard {...props} />);
    expect(container.firstElementChild).toHaveClass('hidden', 'lg:block');
    expect(mockDesktopCard).toHaveBeenLastCalledWith(props);
    expect(mockMobileCard).not.toHaveBeenCalled();
  });

  it('passes only supported search data to the existing mobile presentation', () => {
    mockViewport = { isMobile: true, isResolved: true };
    render(<SearchOfferCard {...props} />);
    expect(mockDesktopCard).not.toHaveBeenCalled();
    expect(mockMobileCard).toHaveBeenLastCalledWith({
      offer: props.offer, accountType: 'business', t: props.t, compactTop: true,
    });
    expect(screen.queryByRole('button', { name: 'desktop flip' })).not.toBeInTheDocument();
  });

  it.each(['q=other', 'q=logo&page=2', 'q=logo&type=seeking'])('resets mobile detail state when the URL changes to %s', (query) => {
    mockViewport = { isMobile: true, isResolved: true };
    const { rerender } = render(<SearchOfferCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'closed 17' }));
    expect(screen.getByRole('button', { name: 'open 17' })).toBeInTheDocument();
    mockSearchParams = new URLSearchParams(query);
    rerender(<SearchOfferCard {...props} />);
    expect(screen.getByRole('button', { name: 'closed 17' })).toBeInTheDocument();
  });

  it('resets mobile state for another result while retaining it on an unrelated rerender', () => {
    mockViewport = { isMobile: true, isResolved: true };
    const { rerender } = render(<SearchOfferCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'closed 17' }));
    rerender(<SearchOfferCard {...props} ownerDisplayName="Updated" />);
    expect(screen.getByRole('button', { name: 'open 17' })).toBeInTheDocument();
    rerender(<SearchOfferCard {...props} offer={{ ...props.offer, id: 18 }} />);
    expect(screen.getByRole('button', { name: 'closed 18' })).toBeInTheDocument();
  });

  it('accepts nullable search params and resets after mobile/desktop/mobile handoff', () => {
    mockSearchParams = null;
    mockViewport = { isMobile: true, isResolved: true };
    const { rerender } = render(<SearchOfferCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'closed 17' }));
    mockViewport = { isMobile: false, isResolved: true };
    rerender(<SearchOfferCard {...props} />);
    expect(screen.getByRole('button', { name: 'desktop flip' })).toBeInTheDocument();
    mockViewport = { isMobile: true, isResolved: true };
    rerender(<SearchOfferCard {...props} />);
    expect(screen.getByRole('button', { name: 'closed 17' })).toBeInTheDocument();
  });
});

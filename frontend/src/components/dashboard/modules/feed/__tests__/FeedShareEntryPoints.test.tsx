/**
 * Vstupné body zdieľania na Nástenku (Fáza 4.5): ponuka a portfólio.
 *
 * Overuje sa FE strana – že sa dialóg otvorí, pošle správny `shared_*_id`
 * a nový príspevok sa dostane do feedu bez reloadu. Validáciu viditeľnosti
 * (skrytá/cudzia ponuka) rieši a testuje backend; tu sa kontroluje len to,
 * že chybu z BE FE zobrazí.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedShareDialog from '../FeedShareDialog';
import {
  FEED_POST_CREATED_EVENT,
  onFeedPostCreated,
} from '../feedShareEvents';
import { shareOfferToFeed, sharePortfolioItemToFeed, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  shareOfferToFeed: jest.fn(),
  sharePortfolioItemToFeed: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

const mockIsMobile = jest.fn(() => false);
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile(),
  useIsMobileState: () => ({ isMobile: mockIsMobile(), isResolved: true }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: ({
    onSelectedUsersChange,
  }: {
    onSelectedUsersChange: (users: { id: number }[]) => void;
  }) => (
    <button
      type="button"
      data-testid="pick-user"
      onClick={() => onSelectedUsersChange([{ id: 42 }])}
    >
      pick
    </button>
  ),
}));

const mockedShareOffer = shareOfferToFeed as jest.MockedFunction<typeof shareOfferToFeed>;
const mockedSharePortfolio = sharePortfolioItemToFeed as jest.MockedFunction<
  typeof sharePortfolioItemToFeed
>;
const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

const created = { id: 77, post_type: 'shared_offer' } as FeedPost;

describe('Zdieľanie ponuky a portfólia na Nástenku', () => {
  beforeEach(() => {
    mockedShareOffer.mockReset();
    mockedSharePortfolio.mockReset();
    mockedToastError.mockReset();
    mockIsMobile.mockReturnValue(false);
  });

  it('drops the emoji button on mobile, keeps it on desktop', async () => {
    const shareProps = {
      open: true as const,
      onClose: jest.fn(),
      preview: { heading: 'Moja ponuka', text: 'Bratislava' },
      onShare: jest.fn(),
    };

    const { unmount } = render(<FeedShareDialog {...shareProps} />);
    expect(screen.getByLabelText('Pridať emoji')).toBeInTheDocument();
    unmount();

    // Na mobile emoji ponúka systémová klávesnica – appkové tlačidlo by len
    // zaberalo miesto.
    mockIsMobile.mockReturnValue(true);
    render(<FeedShareDialog {...shareProps} />);
    expect(screen.queryByLabelText('Pridať emoji')).not.toBeInTheDocument();
  });

  it('sends the offer id and announces the new post to the feed', async () => {
    mockedShareOffer.mockResolvedValue(created);
    const received: FeedPost[] = [];
    const stop = onFeedPostCreated((post) => received.push(post));
    const onClose = jest.fn();

    render(
      <FeedShareDialog
        open
        onClose={onClose}
        preview={{ heading: 'Moja ponuka', text: 'Bratislava' }}
        onShare={(caption, tags) => shareOfferToFeed(5, caption, tags)}
      />,
    );

    await userEvent.type(screen.getByRole('textbox'), 'Pozrite sa');
    await userEvent.click(screen.getByTestId('feed-share-submit'));

    await waitFor(() => expect(mockedShareOffer).toHaveBeenCalledWith(5, 'Pozrite sa', []));
    // Feed nemusí byť namountovaný – prepojenie ide eventom.
    await waitFor(() => expect(received).toEqual([created]));
    expect(onClose).toHaveBeenCalled();
    stop();
  });

  it('sends the portfolio item id', async () => {
    mockedSharePortfolio.mockResolvedValue(created);

    render(
      <FeedShareDialog
        open
        onClose={jest.fn()}
        preview={{ heading: 'Moja práca' }}
        onShare={(caption, tags) => sharePortfolioItemToFeed(9, caption, tags)}
      />,
    );

    await userEvent.click(screen.getByTestId('pick-user'));
    await userEvent.click(screen.getByTestId('feed-share-submit'));

    await waitFor(() =>
      expect(mockedSharePortfolio).toHaveBeenCalledWith(9, '', [42]),
    );
  });

  it('shows the backend message when sharing is refused', async () => {
    // Skrytá/nedostupná ponuka – validáciu robí BE, FE ju len zobrazí.
    mockedShareOffer.mockRejectedValue({
      response: { data: { error: 'Zdielany obsah nie je dostupny.' } },
    });
    const onClose = jest.fn();

    render(
      <FeedShareDialog
        open
        onClose={onClose}
        preview={{ heading: 'Skrytá ponuka' }}
        onShare={(caption, tags) => shareOfferToFeed(5, caption, tags)}
      />,
    );

    await userEvent.click(screen.getByTestId('feed-share-submit'));

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith('Zdielany obsah nie je dostupny.'),
    );
    // Dialóg ostáva otvorený, nech sa dá skúsiť znova.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the preview without an avatar for non-person headings', () => {
    render(
      <FeedShareDialog
        open
        onClose={jest.fn()}
        preview={{ heading: 'Moja ponuka', text: 'Bratislava' }}
        onShare={jest.fn()}
      />,
    );

    const preview = screen.getByTestId('feed-share-preview');
    expect(preview).toHaveTextContent('Moja ponuka');
    expect(preview).toHaveTextContent('Bratislava');
    // Názov ponuky nie je meno človeka – avatar by pôsobil ako cudzí profil.
    expect(preview.querySelector('[data-testid="initials-avatar"]')).toBeNull();
    expect(preview.querySelector('img')).toBeNull();
  });

  it('ignores a malformed event payload', () => {
    const received: FeedPost[] = [];
    const stop = onFeedPostCreated((post) => received.push(post));

    window.dispatchEvent(new CustomEvent(FEED_POST_CREATED_EVENT, { detail: null }));

    expect(received).toEqual([]);
    stop();
  });
});

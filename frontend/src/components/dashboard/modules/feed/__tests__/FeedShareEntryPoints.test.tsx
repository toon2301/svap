/**
 * Vstupné body zdieľania na Nástenku (Fáza 4.5): ponuka a portfólio.
 *
 * Overuje sa FE strana – že sa dialóg otvorí, pošle správny `shared_*_id`
 * a nový príspevok sa dostane do feedu bez reloadu. Validáciu viditeľnosti
 * (skrytá/cudzia ponuka) rieši a testuje backend; tu sa kontroluje len to,
 * že chybu z BE FE zobrazí.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedShareDialog from '../FeedShareDialog';
import FeedPostShareModal from '../FeedPostShareModal';
import {
  FEED_POST_CREATED_EVENT,
  onFeedPostCreated,
} from '../feedShareEvents';
import { shareOfferToFeed, sharePortfolioItemToFeed, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  shareOfferToFeed: jest.fn(),
  sharePortfolioItemToFeed: jest.fn(),
  shareFeedPost: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

// Globalny mock v jest.setup.js vracia pri kazdom volani novy `jest.fn()`,
// takze sa nan neda tvrdit – tu potrebujeme jednu stabilnu referenciu.
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
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
    mockRouterPush.mockReset();
    mockIsMobile.mockReturnValue(false);
  });

  it('drops the emoji button on mobile, keeps it on desktop', async () => {
    const shareProps = {
      open: true as const,
      onClose: jest.fn(),
      preview: { type: 'offer', title: 'Moja ponuka', meta: 'Bratislava' },
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
        preview={{ type: 'offer', title: 'Moja ponuka', meta: 'Bratislava' }}
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
        preview={{ type: 'portfolio_item', title: 'Moja práca' }}
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
        preview={{ type: 'offer', title: 'Skrytá ponuka' }}
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

  it('shows an offer card without any avatar when no owner is given', () => {
    render(
      <FeedShareDialog
        open
        onClose={jest.fn()}
        preview={{ type: 'offer', title: 'Moja ponuka', meta: 'Bratislava' }}
        onShare={jest.fn()}
      />,
    );

    const preview = screen.getByTestId('feed-share-preview');
    expect(preview).toHaveTextContent('Moja ponuka');
    expect(preview).toHaveTextContent('Bratislava');
    // Bez vlastníka nie je nad kartou riadok s avatarom – a názov ponuky nie je
    // meno človeka, takže by tam avatar pôsobil ako cudzí profil.
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

describe('Zdieľanie príspevku, ktorý je sám zdieľaním', () => {
  const owner = {
    id: 30,
    display_name: 'Peter Malý',
    slug: 'peter',
    user_type: 'individual',
    avatar_url: null,
  };

  /** Medzičlánok: príspevok, ktorý je zdieľaním ponuky. */
  const resharedOffer = {
    id: 11,
    post_type: 'shared_offer',
    caption: 'Odporúčam.',
    author: { ...owner, id: 10, display_name: 'Jana Nováková', slug: 'jana' },
    images: [],
    shared_content: {
      type: 'offer',
      title: 'Programovanie',
      category: 'it-a-technologie',
      caption: '',
      id: 42,
      owner,
      owner_display_name: owner.display_name,
      thumbnail_url: null,
      is_seeking: false,
      price_negotiable: false,
      price_from: '25',
      price_currency: '€',
    },
    shared_content_unavailable: false,
  } as unknown as FeedPost;

  it('previews the flattened OFFER, not a plain text post', () => {
    render(<FeedPostShareModal open onClose={jest.fn()} post={resharedOffer} />);

    // Backend zdieľanie sploští priamo na ponuku (`_flatten_reshare`), takže
    // vo feede pristane karta ponuky. Náhľad pred potvrdením musí ukázať to
    // isté – inak sa používateľ rozhoduje podľa niečoho iného, než odošle.
    const preview = screen.getByTestId('feed-share-preview');
    const card = within(preview).getByTestId('feed-shared-card');
    expect(card).toHaveAttribute('data-shared-type', 'offer');
    expect(within(card).getByTestId('feed-shared-card-kind')).toHaveTextContent('Ponúkam');
    expect(within(card).getByTestId('feed-shared-card-price')).toHaveTextContent('25 €');
    expect(within(card).getByText('Programovanie')).toBeInTheDocument();
    // Názov ponuky ako obyčajný text príspevku – presne to, čo tu bolo zle.
    expect(within(preview).queryByTestId('feed-shared-post-preview')).toBeNull();
  });

  it('names the original owner above the previewed card', () => {
    render(<FeedPostShareModal open onClose={jest.fn()} post={resharedOffer} />);

    const preview = screen.getByTestId('feed-share-preview');
    expect(
      within(within(preview).getByTestId('feed-shared-card-owner')).getByText('Peter Malý'),
    ).toBeInTheDocument();
  });

  it('still previews a genuinely free post as a post', () => {
    const freePost = {
      id: 12,
      post_type: 'free_post',
      caption: 'Ahoj feed!',
      author: { ...owner, id: 10, display_name: 'Jana Nováková', slug: 'jana' },
      images: [],
      shared_content: null,
      shared_content_unavailable: false,
    } as unknown as FeedPost;

    render(<FeedPostShareModal open onClose={jest.fn()} post={freePost} />);

    const card = within(screen.getByTestId('feed-share-preview')).getByTestId(
      'feed-shared-card',
    );
    expect(card).toHaveAttribute('data-shared-type', 'feed_post');
    expect(card).toHaveTextContent('Ahoj feed!');
    expect(within(card).queryByTestId('feed-shared-card-kind')).toBeNull();
  });
});

describe('navigacia po uspesnom zdielani', () => {
  const mockedShareFeedPost = jest.requireMock('@/lib/feedApi')
    .shareFeedPost as jest.Mock;

  const sourcePost = {
    id: 3,
    post_type: 'free_post',
    caption: 'Ahoj feed!',
    author: { id: 10, display_name: 'Jana', slug: 'jana', avatar_url: null },
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
  } as unknown as FeedPost;

  beforeEach(() => {
    mockedShareOffer.mockReset();
    mockedSharePortfolio.mockReset();
    mockedShareFeedPost.mockReset();
    mockedToastError.mockReset();
    mockRouterPush.mockReset();
    mockIsMobile.mockReturnValue(false);
  });

  /** Odosle dialog a pocka na dokoncenie volania. */
  async function submitShare() {
    await userEvent.click(screen.getByTestId('feed-share-submit'));
  }

  it('goes to the new post after sharing an OFFER', async () => {
    mockedShareOffer.mockResolvedValue({ ...created, id: 101 });

    render(
      <FeedShareDialog
        open
        onClose={jest.fn()}
        preview={{ type: 'offer', title: 'Moja ponuka' }}
        onShare={(caption, tags) => shareOfferToFeed(5, caption, tags)}
      />,
    );
    await submitShare();

    // Zdielanie ponuky predtym len zavrelo modal a pouzivatel ostal stat na
    // profile – nemal ako zistit, ze prispevok vobec vznikol.
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/feed/101'),
    );
  });

  it('goes to the new post after sharing a PORTFOLIO item', async () => {
    mockedSharePortfolio.mockResolvedValue({ ...created, id: 102 });

    render(
      <FeedShareDialog
        open
        onClose={jest.fn()}
        preview={{ type: 'portfolio_item', title: 'Moja práca' }}
        onShare={(caption, tags) => sharePortfolioItemToFeed(9, caption, tags)}
      />,
    );
    await submitShare();

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/feed/102'),
    );
  });

  it('goes to the new post after sharing a POST', async () => {
    mockedShareFeedPost.mockResolvedValue({ ...created, id: 103 });

    render(
      <FeedPostShareModal open onClose={jest.fn()} post={sourcePost} />,
    );
    await submitShare();

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/feed/103'),
    );
  });

  it('closes the callers own modal BEFORE navigating away', async () => {
    mockedShareOffer.mockResolvedValue({ ...created, id: 104 });
    const order: string[] = [];
    mockRouterPush.mockImplementation(() => order.push('navigate'));

    render(
      <FeedShareDialog
        open
        onClose={() => order.push('close')}
        preview={{ type: 'offer', title: 'Moja ponuka' }}
        onShare={(caption, tags) => shareOfferToFeed(5, caption, tags)}
        onShared={() => order.push('onShared')}
      />,
    );
    await submitShare();

    // Volajuci si najprv upratal (zavrel svoj modal), az potom sa odchadza –
    // inak by nad novym prispevkom ostal visiet otvoreny dialog.
    await waitFor(() => expect(order).toContain('navigate'));
    expect(order).toEqual(['onShared', 'close', 'navigate']);
  });

  it('stays put when the share fails', async () => {
    mockedShareOffer.mockRejectedValue({
      response: { data: { error: 'Zdielany obsah nie je dostupny.' } },
    });

    render(
      <FeedShareDialog
        open
        onClose={jest.fn()}
        preview={{ type: 'offer', title: 'Skrytá ponuka' }}
        onShare={(caption, tags) => shareOfferToFeed(5, caption, tags)}
      />,
    );
    await submitShare();

    await waitFor(() => expect(mockedToastError).toHaveBeenCalled());
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('does not navigate to a broken path when the response carries no id', async () => {
    mockedShareOffer.mockResolvedValue({ post_type: 'shared_offer' } as unknown as FeedPost);

    render(
      <FeedShareDialog
        open
        onClose={jest.fn()}
        preview={{ type: 'offer', title: 'Moja ponuka' }}
        onShare={(caption, tags) => shareOfferToFeed(5, caption, tags)}
      />,
    );
    await submitShare();

    // Bez kontroly by tu vzniklo `/dashboard/feed/NaN`.
    await waitFor(() => expect(mockedShareOffer).toHaveBeenCalled());
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

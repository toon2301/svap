/**
 * Spúšťače okna detailu a zosúladenie počtov medzi kartami.
 *
 * Kľúčové je oddelenie desktopu od mobilu: na desktope klik na fotku aj na
 * komentáre OTVÁRA OKNO (rozbaľovanie v karte tam už nie je), na mobile
 * ostáva všetko presne ako predtým – komentáre sa rozbalia v karte a fotka
 * otvorí fullscreen prehliadač.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { FeedPostOverlayProvider } from '../../../contexts/FeedPostOverlayContext';
import { likeFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn().mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  }),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

/** Prepínač zariadenia – každý test si nastaví, kde sa nachádza. */
let mobile = false;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mobile,
  useIsMobileState: () => ({ isMobile: mobile, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedLike = likeFeedPost as jest.MockedFunction<typeof likeFeedPost>;

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [
      {
        id: 11,
        status: 'approved',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 3,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/** Karta v dashboarde – kontext okna je k dispozícii. */
function renderWithOverlay(post = makePost()) {
  const onTargetChange = jest.fn();
  render(
    <FeedPostOverlayProvider onTargetChange={onTargetChange}>
      <FeedPostCard post={post} />
    </FeedPostOverlayProvider>,
  );
  return { onTargetChange };
}

beforeEach(() => {
  jest.clearAllMocks();
  mobile = false;
});

describe('desktop', () => {
  it('opens the window when the photo is clicked', async () => {
    const { onTargetChange } = renderWithOverlay();

    await userEvent.click(screen.getByTestId('feed-image-open-11'));

    expect(onTargetChange).toHaveBeenCalledWith({ postId: 7 });
    // Fullscreen prehliadač sa z feedu už neotvára – fotku ukáže okno.
    expect(screen.queryByTestId('feed-image-lightbox')).not.toBeInTheDocument();
  });

  it('describes the photo click as opening the post detail', async () => {
    renderWithOverlay();

    // Popis musí sedieť s tým, čo sa naozaj stane – vo feede klik neotvára
    // fotku na celú obrazovku, ale detail príspevku.
    expect(screen.getByTestId('feed-image-open-11')).toHaveAttribute(
      'aria-label',
      'Otvoriť detail príspevku',
    );
  });

  it('opens the window when the comment count is clicked', async () => {
    const { onTargetChange } = renderWithOverlay();

    await userEvent.click(screen.getByTestId('feed-comments-button'));

    expect(onTargetChange).toHaveBeenCalledWith({ postId: 7 });
    // Rozbaľovanie v karte je na desktope preč – komentáre patria oknu.
    expect(screen.queryByTestId('feed-post-comments')).not.toBeInTheDocument();
  });

  it('keeps expanding in place when no window is available', async () => {
    // Karta vykreslená mimo dashboardu (bez kontextu) si musí poradiť sama.
    render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-comments-button'));

    expect(await screen.findByTestId('feed-post-comments')).toBeInTheDocument();
  });
});

describe('mobil ostáva nezmenený', () => {
  it('opens the mobile detail screen from the comments button', async () => {
    mobile = true;
    const { onTargetChange } = renderWithOverlay();

    await userEvent.click(screen.getByTestId('feed-comments-button'));

    // Mobil dostáva vlastnú obrazovku detailu – nie rozbalenie komentárov
    // v karte a ani desktopové okno.
    expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
    expect(onTargetChange).not.toHaveBeenCalled();
  });

  it('opens the photo viewer instead of the detail window', async () => {
    mobile = true;
    const { onTargetChange } = renderWithOverlay();

    // Popis ostáva o FOTKE – ťuk nevedie na stránku detailu ako na desktope.
    expect(screen.getByTestId('feed-image-open-11')).toHaveAttribute(
      'aria-label',
      'Otvoriť fotku na celú obrazovku',
    );
    await userEvent.click(screen.getByTestId('feed-image-open-11'));

    // Mobil dostáva bohatý prehliadač (fotka + hlavička, text, akcie),
    // nie okno detailu.
    expect(await screen.findByTestId('feed-photo-viewer')).toBeInTheDocument();
    expect(onTargetChange).not.toHaveBeenCalled();
  });

  it('keeps the photo tap on the immersive viewer, not the detail screen', async () => {
    mobile = true;
    renderWithOverlay();

    await userEvent.click(screen.getByTestId('feed-image-open-11'));

    // Fotka a komentáre vedú na mobile na DVE rôzne obrazovky – ťuk na fotku
    // ostáva pri imerznom prehliadači.
    expect(await screen.findByTestId('feed-photo-viewer')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });
});

describe('zdieľaný obsah', () => {
  function sharedPost() {
    return makePost({
      post_type: 'shared_post',
      caption: 'Toto stojí za pozretie.',
      images: [],
      shared_content: {
        type: 'offer',
        id: 55,
        title: 'Kurz gitary',
        owner: {
          id: 21,
          display_name: 'Peter',
          slug: 'peter',
          user_type: 'individual',
          avatar_url: null,
        },
      },
    } as Partial<FeedPost>);
  }

  it('closes the window together with the navigation', async () => {
    const onTargetChange = jest.fn();
    const navigations: unknown[] = [];
    const listener = (event: Event) =>
      navigations.push((event as CustomEvent).detail);
    window.addEventListener('goToUserProfile', listener);

    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={sharedPost()} variant="detail" />
      </FeedPostOverlayProvider>,
    );

    await userEvent.click(screen.getByTestId('feed-shared-compact-preview'));
    window.removeEventListener('goToUserProfile', listener);

    // Preklik vedie preč – okno nesmie ostať visieť nad novou stránkou…
    expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
    // …a navigácia sa naozaj stala.
    expect(navigations).toHaveLength(1);
  });

  it('keeps the sharer text below the preview on the feed card', async () => {
    renderWithOverlay(sharedPost());

    const caption = screen.getByTestId('feed-post-caption');
    const preview = screen.getByTestId('feed-shared-compact-preview');
    // Na karte je hlavným obsahom náhľad a text je komentár k nemu – toto
    // poradie sa zámerne nemení, otáča sa len v okne detailu.
    expect(preview.compareDocumentPosition(caption)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('still shortens the caption to three lines on the feed card', async () => {
    renderWithOverlay(makePost({ caption: 'Dlhý text.' }));

    // Okno detailu skracuje na desať riadkov; karta ostáva na troch.
    expect(screen.getByTestId('feed-post-caption').className).toContain(
      'line-clamp-3',
    );
  });

  it('collapses runs of blank lines on the feed card too', async () => {
    renderWithOverlay(makePost({ caption: 'Prvý.\n\n\n\nDruhý.' }));

    // Séria prázdnych riadkov robí v texte veľkú dieru, ktorá na karte tlačí
    // fotku aj ďalšie príspevky nižšie – rovnaká normalizácia ako v okne.
    expect(screen.getByTestId('feed-post-caption').textContent).toBe(
      'Prvý.\nDruhý.',
    );
  });

  it('keeps a single blank line as paragraph separation on the card', async () => {
    renderWithOverlay(makePost({ caption: 'Prvý.\n\nDruhý.' }));

    // Jeden prázdny riadok je bežné oddelenie odsekov – ten sa neruší.
    expect(screen.getByTestId('feed-post-caption').textContent).toBe(
      'Prvý.\n\nDruhý.',
    );
  });
});

describe('zosúladenie počtov medzi kartami', () => {
  it('mirrors a like onto the other card of the same post', async () => {
    mockedLike.mockResolvedValue({ likes_count: 3, is_liked_by_me: true } as never);
    // Dve karty toho istého príspevku = feed pod oknom detailu.
    render(
      <>
        <div data-testid="vo-feede">
          <FeedPostCard post={makePost()} />
        </div>
        <div data-testid="v-okne">
          <FeedPostCard post={makePost()} variant="detail" />
        </div>
      </>,
    );

    const [feedCount, detailCount] = screen.getAllByTestId('feed-like-count');
    expect(feedCount).toHaveTextContent('2');

    await userEvent.click(screen.getAllByTestId('feed-like-button')[1]);

    // Lajk v okne sa prejaví aj na karte pod ním – nie až po obnovení feedu.
    await waitFor(() => expect(detailCount).toHaveTextContent('3'));
    await waitFor(() => expect(feedCount).toHaveTextContent('3'));
  });

  it('does not touch the counts of a different post', async () => {
    mockedLike.mockResolvedValue({ likes_count: 3, is_liked_by_me: true } as never);
    render(
      <>
        <FeedPostCard post={makePost()} />
        <FeedPostCard post={makePost({ id: 8, likes_count: 9 })} />
      </>,
    );

    await userEvent.click(screen.getAllByTestId('feed-like-button')[0]);

    await waitFor(() =>
      expect(screen.getAllByTestId('feed-like-count')[0]).toHaveTextContent('3'),
    );
    expect(screen.getAllByTestId('feed-like-count')[1]).toHaveTextContent('9');
  });
});

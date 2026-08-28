/**
 * Text príspevku – poradie voči fotkám a skrátenie na tri riadky.
 *
 * jsdom nelayoutuje, takže „presahuje tri riadky?" sa v teste nastavuje
 * priamo na uzle (scrollHeight vs. clientHeight) – presne tie hodnoty, ktoré
 * v prehliadači porovnáva komponent.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
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
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
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

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Krátky text',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

function image(id: number) {
  return {
    id,
    thumbnail_url: `http://api.test/${id}-t.webp`,
    large_url: `http://api.test/${id}-l.webp`,
  } as FeedPost['images'][number];
}

/**
 * Nastaví, či sa text do troch riadkov zmestí. `clientHeight` je viditeľná
 * výška po orezaní, `scrollHeight` výška celého textu – komponent porovnáva
 * presne tieto dve.
 */
function setTextHeights({ visible, full }: { visible: number; full: number }) {
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-post-caption' ? visible : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-post-caption'
        ? this.className.includes('line-clamp-3')
          ? full
          : visible
        : 0;
    },
  });
}

afterEach(() => {
  // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

describe('poradie textu a fotiek', () => {
  it('puts the caption before the photos on a free post', () => {
    setTextHeights({ visible: 60, full: 60 });
    render(
      <FeedPostCard post={makePost({ images: [image(11)] })} />,
    );

    const card = screen.getByTestId('feed-post-card');
    const nodes = Array.from(
      card.querySelectorAll(
        '[data-testid="feed-post-caption"], [data-testid="feed-post-image"]',
      ),
    ).map((node) => node.getAttribute('data-testid'));

    expect(nodes[0]).toBe('feed-post-caption');
    expect(nodes).toContain('feed-post-image');
  });

  it('keeps the shared preview above the caption', () => {
    setTextHeights({ visible: 60, full: 60 });
    render(
      <FeedPostCard
        post={makePost({
          post_type: 'shared_feed_post',
          caption: 'Môj komentár k zdieľaniu',
          shared_content: {
            type: 'feed_post',
            title: '',
            category: '',
            caption: 'Pôvodný text',
            id: 9,
            owner: author,
            is_seeking: null,
            price_negotiable: null,
            price_from: null,
            price_currency: '',
            owner_display_name: 'Jana',
            thumbnail_url: null,
          },
        })}
      />,
    );

    const card = screen.getByTestId('feed-post-card');
    const html = card.innerHTML;
    // Poradie zdieľaní ostáva nezmenené: náhľad zdieľaného obsahu, potom
    // komentár autora k nemu.
    expect(html.indexOf('Pôvodný text')).toBeLessThan(
      html.indexOf('Môj komentár k zdieľaniu'),
    );
  });
});

describe('skrátenie na tri riadky', () => {
  it('shows a short caption whole, without a toggle', () => {
    setTextHeights({ visible: 60, full: 60 });
    render(<FeedPostCard post={makePost({ caption: 'Krátky text' })} />);

    expect(screen.getByTestId('feed-post-caption')).toHaveTextContent(
      'Krátky text',
    );
    expect(
      screen.queryByTestId('feed-post-caption-toggle'),
    ).not.toBeInTheDocument();
  });

  it('clamps a long caption and expands it on demand', async () => {
    // Celý text je vyšší než tri riadky, ktoré vidno.
    setTextHeights({ visible: 60, full: 200 });
    render(<FeedPostCard post={makePost({ caption: 'Veľmi dlhý text' })} />);

    const caption = screen.getByTestId('feed-post-caption');
    // Orezáva CSS, nie skrátenie reťazca – v DOM je text celý.
    expect(caption.className).toContain('line-clamp-3');
    expect(caption).toHaveTextContent('Veľmi dlhý text');

    const toggle = screen.getByTestId('feed-post-caption-toggle');
    expect(toggle).toHaveTextContent('...Viac');

    await userEvent.click(toggle);

    expect(caption.className).not.toContain('line-clamp-3');
    expect(toggle).toHaveTextContent('Menej');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(toggle);

    expect(caption.className).toContain('line-clamp-3');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent(
      '...Viac',
    );
  });

  it('keeps the toggle after expanding, even though nothing overflows then', async () => {
    setTextHeights({ visible: 60, full: 200 });
    render(<FeedPostCard post={makePost({ caption: 'Veľmi dlhý text' })} />);

    await userEvent.click(screen.getByTestId('feed-post-caption-toggle'));

    // V rozbalenom stave sa výšky rovnajú – keby sa meralo aj vtedy, „Menej"
    // by zmizlo a text by sa nedal zbaliť.
    await waitFor(() =>
      expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent(
        'Menej',
      ),
    );
  });

  it('keeps the expanded state separate for each card', async () => {
    setTextHeights({ visible: 60, full: 200 });
    render(
      <>
        <FeedPostCard post={makePost({ id: 1, caption: 'Prvý dlhý text' })} />
        <FeedPostCard post={makePost({ id: 2, caption: 'Druhý dlhý text' })} />
      </>,
    );

    const [firstToggle, secondToggle] = screen.getAllByTestId(
      'feed-post-caption-toggle',
    );
    await userEvent.click(firstToggle);

    expect(firstToggle).toHaveTextContent('Menej');
    expect(secondToggle).toHaveTextContent('...Viac');
  });

  it('re-measures when the window width changes', async () => {
    // Najprv sa text zmestí, po zúžení okna už nie.
    setTextHeights({ visible: 60, full: 60 });
    render(<FeedPostCard post={makePost({ caption: 'Text na hrane' })} />);
    expect(
      screen.queryByTestId('feed-post-caption-toggle'),
    ).not.toBeInTheDocument();

    setTextHeights({ visible: 60, full: 200 });
    window.dispatchEvent(new Event('resize'));

    expect(
      await screen.findByTestId('feed-post-caption-toggle'),
    ).toBeInTheDocument();
  });
});

describe('karta na iných miestach', () => {
  it('behaves the same in a profile-style list', async () => {
    setTextHeights({ visible: 60, full: 200 });
    // Karta je ten istý komponent aj v profilových taboch a na detaile –
    // stačí ju vykresliť rovnako.
    render(
      <div data-testid="profile-tab">
        <FeedPostCard post={makePost({ caption: 'Dlhý text v profile' })} />
      </div>,
    );

    const tab = screen.getByTestId('profile-tab');
    await userEvent.click(within(tab).getByTestId('feed-post-caption-toggle'));

    expect(within(tab).getByTestId('feed-post-caption-toggle')).toHaveTextContent(
      'Menej',
    );
  });
});

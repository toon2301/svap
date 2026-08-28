/**
 * „..." menu karty príspevku – vykreslenie portálom.
 *
 * Karta má `overflow-hidden`, takže menu vykreslené vnútri nej sa oreže. Testy
 * overujú, že menu žije MIMO podstromu karty, drží sa v okne (aj pri karte
 * pri spodnej hrane) a že klik na položku funguje – práve to býva pri portáli
 * prvá obeť, keď klik mimo zatvára menu skôr, než sa položka stihne spustiť.
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

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Ahoj',
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/** Spúšťač vráti pozíciu, akú mu nastavíme – jsdom sám nelayoutuje. */
function anchorAt(rect: Partial<DOMRect>) {
  const trigger = screen.getByTestId('feed-post-menu-trigger');
  trigger.getBoundingClientRect = () =>
    ({
      top: 100,
      bottom: 140,
      left: 300,
      right: 340,
      width: 40,
      height: 40,
      x: 300,
      y: 100,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
  return trigger;
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.innerWidth = 1024;
  window.innerHeight = 768;
});

it('renders the menu outside the clipping card', async () => {
  render(<FeedPostCard post={makePost()} />);
  anchorAt({});

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));

  const card = screen.getByTestId('feed-post-card');
  const menu = screen.getByTestId('feed-post-menu');
  // Karta orezáva svoj obsah – menu preto NESMIE byť jej potomkom, inak by
  // `overflow-hidden` odrezalo spodné položky a `z-index` s tým nič nespraví.
  expect(card.className).toContain('overflow-hidden');
  expect(card.contains(menu)).toBe(false);
  expect(within(menu).getByTestId('feed-post-edit')).toBeInTheDocument();
});

it('opens upwards when the card sits at the bottom of the screen', async () => {
  render(<FeedPostCard post={makePost()} />);
  // Spúšťač 20 px nad spodnou hranou okna – dole sa menu nezmestí.
  anchorAt({ top: window.innerHeight - 60, bottom: window.innerHeight - 20 });

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));

  const menu = screen.getByTestId('feed-post-menu');
  const top = Number.parseFloat(menu.style.top);
  const triggerTop = window.innerHeight - 60;
  // Menu sa otvorí NAHOR: celé sa vojde NAD spúšťač. Samotné držanie v okne
  // nestačí – bez preklopenia by sa menu prekrylo so spúšťačom.
  // (jsdom nelayoutuje, takže platí núdzová výška 156 px.)
  expect(top + 156).toBeLessThanOrEqual(triggerTop);
  expect(top).toBeGreaterThanOrEqual(0);
});

it('keeps the menu inside the window at both edges', async () => {
  const { unmount } = render(<FeedPostCard post={makePost()} />);
  // Pravý okraj: menu je zarovnané doprava, takže sa vojde samo.
  anchorAt({ left: window.innerWidth - 40, right: window.innerWidth });
  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  let left = Number.parseFloat(screen.getByTestId('feed-post-menu').style.left);
  expect(left).toBeGreaterThanOrEqual(0);
  expect(left + 224).toBeLessThanOrEqual(window.innerWidth);
  unmount();

  // Ľavý okraj (úzka obrazovka): zarovnanie doprava by menu vytlačilo ZA
  // ľavý okraj okna, takže ho musí zachytiť držanie v okne.
  render(<FeedPostCard post={makePost()} />);
  anchorAt({ left: 60, right: 100 });
  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));

  left = Number.parseFloat(screen.getByTestId('feed-post-menu').style.left);
  expect(left).toBeGreaterThanOrEqual(0);
  expect(left + 224).toBeLessThanOrEqual(window.innerWidth);
});

it('runs the clicked item instead of just closing', async () => {
  render(<FeedPostCard post={makePost()} />);
  anchorAt({});

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-post-edit'));

  // Klik na položku sa nesmie stratiť vo vrstve, ktorá zatvára menu.
  expect(await screen.findByTestId('feed-post-edit-modal')).toBeInTheDocument();
});

it('stays open when the click lands inside the menu but on no item', async () => {
  render(<FeedPostCard post={makePost()} />);
  anchorAt({});

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-post-menu'));

  // Zatvára LEN klik mimo menu – vnútri sa nesmie prebublať do vrstvy.
  expect(screen.getByTestId('feed-post-menu')).toBeInTheDocument();
});

it('closes on a click outside and on Escape', async () => {
  render(<FeedPostCard post={makePost()} />);
  anchorAt({});

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-post-menu-layer'));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument(),
  );

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await screen.findByTestId('feed-post-menu');
  await userEvent.keyboard('{Escape}');

  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument(),
  );
  // Fokus sa vracia na spúšťač, nech klávesnica nezačína odznova.
  expect(screen.getByTestId('feed-post-menu-trigger')).toHaveFocus();
});

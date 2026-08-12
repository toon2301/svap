/**
 * Časť B + C: vkladanie nových príspevkov na vrch feedu.
 *
 * Tri spúšťače (composer, pull-to-refresh, desktop tlačidlo) musia končiť
 * v tom istom mechanizme – bez plného refetchu a s dedupom podľa id.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedList from '../FeedList';
import { createFeedPost, listFeedPosts, type FeedPost } from '@/lib/feedApi';
import { PULL_TO_REFRESH_THRESHOLD } from '../useFeedPullToRefresh';

jest.mock('@/lib/feedApi', () => ({
  listFeedPosts: jest.fn(),
  createFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  FEED_COMMENT_MAX_LENGTH: 500,
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: 'image/*',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div data-testid="tag-picker" />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedList = listFeedPosts as jest.MockedFunction<typeof listFeedPosts>;
const mockedCreate = createFeedPost as jest.MockedFunction<typeof createFeedPost>;
const mockedToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>;
const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

function makePost(id: number, caption: string): FeedPost {
  return {
    id,
    post_type: 'free_post',
    caption,
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    image: null,
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01',
  } as FeedPost;
}

/** Poradie kariet tak, ako sú v DOM – overuje vloženie NA VRCH. */
function renderedCaptions() {
  return within(screen.getByTestId('feed-list'))
    .getAllByTestId('feed-post-card')
    .map((card) => card.textContent);
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true });
}

function pull(distance: number) {
  const container = screen.getByTestId('feed-pull-container');
  fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
  fireEvent.touchMove(container, { touches: [{ clientY: distance }] });
  fireEvent.touchEnd(container, { touches: [] });
}

// Ťah sa tlmí koeficientom 0.5, takže prst musí prejsť dvojnásobok prahu.
const OVER_THRESHOLD = PULL_TO_REFRESH_THRESHOLD * 2 + 20;

describe('FeedList – vkladanie nových príspevkov na vrch', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedToastSuccess.mockReset();
    mockedToastError.mockReset();
    setScrollY(0);
    mockedList.mockResolvedValue({
      results: [makePost(1, 'Starý')],
      next: null,
      previous: null,
    });
  });

  it('puts a freshly composed post on top without refetching the feed', async () => {
    mockedCreate.mockResolvedValue(makePost(9, 'Môj nový'));

    render(<FeedList />);
    await screen.findByTestId('feed-list');
    expect(mockedList).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByTestId('feed-composer-trigger'));
    await userEvent.type(screen.getByRole('textbox'), 'Môj nový');
    await userEvent.click(screen.getByTestId('feed-composer-submit'));

    await waitFor(() => expect(renderedCaptions().map((text) => text?.includes('Môj nový'))).toEqual([true, false]));
    // Kľúčové: zoznam sa NEnačítal znova, len sa doň vložilo.
    expect(mockedList).toHaveBeenCalledTimes(1);
  });

  it('puts a shared post on top, the same way the composer does', async () => {
    const { shareFeedPost } = jest.requireMock('@/lib/feedApi');
    shareFeedPost.mockResolvedValue(makePost(9, 'Zdieľané ďalej'));

    render(<FeedList />);
    await screen.findByTestId('feed-list');
    expect(mockedList).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByTestId('feed-share-button'));
    await userEvent.click(await screen.findByRole('button', { name: 'Zdieľať' }));

    await waitFor(() =>
      expect(renderedCaptions().map((text) => text?.includes('Zdieľané ďalej'))).toEqual([
        true,
        false,
      ]),
    );
    // Rovnako ako composer – vloženie, nie refetch celého feedu.
    expect(mockedList).toHaveBeenCalledTimes(1);
  });

  it('merges new posts on the desktop check button and dedupes the overlap', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    // Prvá stránka sa s už zobrazeným obsahom prekrýva (post 1).
    mockedList.mockResolvedValue({
      results: [makePost(2, 'Novší'), makePost(1, 'Starý')],
      next: null,
      previous: null,
    });

    await userEvent.click(screen.getByTestId('feed-check-new'));

    await waitFor(() => expect(renderedCaptions().map((text) => text?.includes('Novší'))).toEqual([true, false]));
    expect(mockedList).toHaveBeenCalledTimes(2);
  });

  it('refreshes on a pull gesture when the feed is scrolled to the top', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    mockedList.mockResolvedValue({
      results: [makePost(3, 'Z gesta')],
      next: null,
      previous: null,
    });

    pull(OVER_THRESHOLD);

    await waitFor(() => expect(renderedCaptions().map((text) => text?.includes('Z gesta'))).toEqual([true, false]));
    expect(mockedList).toHaveBeenCalledTimes(2);
  });

  it('refreshes the data of posts that are already displayed', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('0');

    // Ten istý príspevok, ale medzitým pribudli lajky.
    const updated = makePost(1, 'Starý');
    updated.likes_count = 12;
    mockedList.mockResolvedValue({
      results: [updated],
      next: null,
      previous: null,
    });

    await userEvent.click(screen.getByTestId('feed-check-new'));

    // Prekrývajúce sa id sa NAHRADIA čerstvou verziou, nezahodia sa.
    await waitFor(() =>
      expect(screen.getByTestId('feed-like-button')).toHaveTextContent('12'),
    );
  });

  it('says so when the refresh finds nothing new', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    await userEvent.click(screen.getByTestId('feed-check-new'));

    await waitFor(() =>
      expect(mockedToastSuccess).toHaveBeenCalledWith('Žiadne nové príspevky.'),
    );
  });

  it('reports a failed refresh', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    mockedList.mockRejectedValue(new Error('offline'));
    await userEvent.click(screen.getByTestId('feed-check-new'));

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith('Obnovenie sa nepodarilo.'),
    );
  });

  it('ignores the gesture when the feed is scrolled down', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    // Uprostred zoznamu patrí zvislý ťah bežnému scrollovaniu obsahu.
    setScrollY(300);
    pull(OVER_THRESHOLD);

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1));
    // Kontajner ostáva kvôli aria-live namountovaný, len prázdny.
    expect(screen.getByTestId('feed-pull-indicator')).toBeEmptyDOMElement();
  });

  it('ignores a pull that stops short of the threshold', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    pull(PULL_TO_REFRESH_THRESHOLD - 10);

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1));
  });

  it('shows the pull indicator while the finger is down', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    const container = screen.getByTestId('feed-pull-container');
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: OVER_THRESHOLD }] });

    const indicator = await screen.findByTestId('feed-pull-indicator');
    expect(indicator).toHaveTextContent('Pusti pre obnovenie');

    fireEvent.touchEnd(container, { touches: [] });
  });

  it('cancels the gesture when the finger moves back up', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');

    const container = screen.getByTestId('feed-pull-container');
    fireEvent.touchStart(container, { touches: [{ clientY: 100 }] });
    // Záporná delta = používateľ scrolluje nahor, nie ťahá.
    fireEvent.touchMove(container, { touches: [{ clientY: 40 }] });
    fireEvent.touchEnd(container, { touches: [] });

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1));
  });

  it('suppresses the browser gesture only while actually pulling', async () => {
    render(<FeedList />);
    await screen.findByTestId('feed-list');
    const container = screen.getByTestId('feed-pull-container');

    // Ťah nadol z vrchu – natívne pull-to-refresh musíme potlačiť.
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    const pulling = new TouchEvent('touchmove', { cancelable: true, bubbles: true });
    Object.defineProperty(pulling, 'touches', { value: [{ clientY: 60 }] });
    container.dispatchEvent(pulling);
    expect(pulling.defaultPrevented).toBe(true);

    fireEvent.touchEnd(container, { touches: [] });

    // Gesto začne hore (inicializuje sa), ale obsah sa medzitým odscrolluje –
    // ďalší pohyb už patrí bežnému scrollovaniu a brzdiť sa NESMIE.
    setScrollY(0);
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    const initial = new TouchEvent('touchmove', { cancelable: true, bubbles: true });
    Object.defineProperty(initial, 'touches', { value: [{ clientY: 30 }] });
    container.dispatchEvent(initial);
    // Kontrola, že gesto naozaj bežalo – inak by test nedokazoval nič.
    expect(initial.defaultPrevented).toBe(true);

    setScrollY(300);
    const scrolling = new TouchEvent('touchmove', { cancelable: true, bubbles: true });
    Object.defineProperty(scrolling, 'touches', { value: [{ clientY: 60 }] });
    container.dispatchEvent(scrolling);
    expect(scrolling.defaultPrevented).toBe(false);
  });
});

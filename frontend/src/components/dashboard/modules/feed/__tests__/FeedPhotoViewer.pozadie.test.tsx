/**
 * Prehliadač fotky: pozadie na celú plochu pod plávajúcimi lištami iOS (nález 377, kolo 3c).
 *
 * Kým má pole v paneli komentárov fokus, vrstva sa pripne na viditeľnú plochu nad klávesnicou. Pod ňou (pod priesvitnými
 * lištami iOS) by presvitala Nástenka, preto sa v tom čase pozadie kreslí samostatným prvkom na celú plochu a pripnutý koreň je
 * priehľadný. Bez pripnutia má pozadie koreň ako doteraz.
 *
 * jsdom nepozná `visualViewport`, preto sa dodáva atrapa.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPhotoViewer from '../FeedPhotoViewer';
import { KEYBOARD_RELEASE_DELAY_MS } from '../useFeedKeyboardViewport';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { listFeedPostComments, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
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
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
  useIsMobileState: () => ({ isMobile: true, isResolved: true }),
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

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;

const autor = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function prispevok(): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: autor,
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
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as FeedPost;
}

class AtrapaViditelnejPlochy extends EventTarget {
  height = 844;
  offsetTop = 0;
  scale = 1;
}

const povodnaPlocha = Object.getOwnPropertyDescriptor(window, 'visualViewport');
let plocha: AtrapaViditelnejPlochy;

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
  plocha = new AtrapaViditelnejPlochy();
  Object.defineProperty(window, 'visualViewport', {
    value: plocha,
    configurable: true,
    writable: true,
  });
  mockedList.mockResolvedValue({
    results: [
      {
        id: 100,
        text: 'Komentár 1',
        author: autor,
        can_delete: false,
        can_edit: false,
        likes_count: 0,
        is_liked_by_me: false,
        replies: [],
        replies_count: 0,
        created_at: '2026-01-01T11:00:00Z',
      },
    ],
    next: null,
    previous: null,
    count: 1,
  } as never);
});

afterEach(() => {
  if (povodnaPlocha) Object.defineProperty(window, 'visualViewport', povodnaPlocha);
  else delete (window as { visualViewport?: unknown }).visualViewport;
});

async function otvorPanel() {
  render(<FeedPhotoViewer post={prispevok()} initialIndex={0} onClose={jest.fn()} />);
  await userEvent.click(await screen.findByTestId('feed-photo-viewer-comments'));
  await screen.findByText('Komentár 1');
  return {
    prehliadac: screen.getByTestId('feed-photo-viewer'),
    pole: screen.getByRole('textbox', { name: 'Napíš komentár...' }),
  };
}

describe('pozadie prehliadača fotky', () => {
  it('bez pripnutia (pole nemá fokus) má čierne pozadie koreň a samostatné pozadie neexistuje', async () => {
    const { prehliadac } = await otvorPanel();

    expect(prehliadac).toHaveClass('bg-black/95');
    expect(screen.queryByTestId('feed-photo-viewer-backdrop')).not.toBeInTheDocument();
  });

  it('pri fokuse na pole sa vrstva pripne a pozadie na celú plochu kreslí samostatný prvok', async () => {
    plocha.height = 392;
    const { prehliadac, pole } = await otvorPanel();

    fireEvent.focus(pole);

    await waitFor(() => expect(prehliadac).toHaveStyle({ height: '392px' }));
    const pozadie = screen.getByTestId('feed-photo-viewer-backdrop');
    expect(pozadie).toHaveClass('fixed', 'inset-0', 'bg-black/95');
    expect(pozadie.getAttribute('style')).toBeNull();
    expect(prehliadac).not.toHaveClass('bg-black/95');
    expect(prehliadac.firstElementChild).toBe(pozadie);
  });

  it('po strate fokusu a uvoľnení vrstvy sa pozadie vráti ku koreňu', async () => {
    plocha.height = 392;
    const { prehliadac, pole } = await otvorPanel();
    fireEvent.focus(pole);
    await screen.findByTestId('feed-photo-viewer-backdrop');

    fireEvent.blur(pole);

    await waitFor(() => expect(screen.queryByTestId('feed-photo-viewer-backdrop')).not.toBeInTheDocument(), {
      timeout: KEYBOARD_RELEASE_DELAY_MS + 1500,
    });
    expect(prehliadac).toHaveClass('bg-black/95');
  });

  it('klik na pozadie prehliadač nezatvorí (podklad slúži na prepínanie vrstvy, nie na zatváranie)', async () => {
    const onClose = jest.fn();
    plocha.height = 392;
    render(<FeedPhotoViewer post={prispevok()} initialIndex={0} onClose={onClose} />);
    await userEvent.click(await screen.findByTestId('feed-photo-viewer-comments'));
    await screen.findByText('Komentár 1');
    fireEvent.focus(screen.getByRole('textbox', { name: 'Napíš komentár...' }));
    const pozadie = await screen.findByTestId('feed-photo-viewer-backdrop');

    fireEvent.click(pozadie);

    expect(onClose).not.toHaveBeenCalled();
  });
});

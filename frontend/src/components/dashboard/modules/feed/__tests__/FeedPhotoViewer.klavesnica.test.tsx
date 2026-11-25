/**
 * Prehliadač fotky: pole na komentár v paneli stojí pevne aj pri otvorenej klávesnici (R75 bod 5, nález 370).
 *
 * Prehliadač je vrstva `fixed inset-0` (`ImageLightbox`). Kým má pole v paneli komentárov fokus, celá vrstva (fotka, hlavička aj
 * panel) sa pripne na viditeľnú plochu nad klávesnicou, takže pole stojí tesne nad ňou a hlavička je hore. Zatvorený panel nič
 * nepripína a po jeho zatvorení pri otvorenej klávesnici sa vrstva uvoľní. Kým je panel otvorený, stránka pod ním dostane
 * `overscroll-behavior: none`.
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

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;

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

  zmen(vlastnosti: { height?: number }) {
    Object.assign(this, vlastnosti);
    this.dispatchEvent(new Event('resize'));
  }

  posun(offsetTop: number) {
    this.offsetTop = offsetTop;
    this.dispatchEvent(new Event('scroll'));
  }
}

const povodnaPlocha = Object.getOwnPropertyDescriptor(window, 'visualViewport');
let plocha: AtrapaViditelnejPlochy;

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
  document.documentElement.style.overscrollBehavior = '';
  document.body.style.overscrollBehavior = '';
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

function expectNepripnuty(prehliadac: HTMLElement) {
  expect(prehliadac.style.top).toBe('');
  expect(prehliadac.style.height).toBe('');
  expect(prehliadac.style.bottom).toBe('');
}

describe('pole v paneli komentárov pri otvorenej klávesnici', () => {
  it('bez fokusu v poli ostáva prehliadač `fixed inset-0` bez vlastného štýlu', async () => {
    const { prehliadac } = await otvorPanel();

    expectNepripnuty(prehliadac);
    expect(prehliadac).toHaveClass('fixed', 'inset-0');
  });

  it('pri fokuse na pole sa celá vrstva pripne na viditeľnú plochu nad klávesnicou', async () => {
    plocha.height = 508;
    const { prehliadac, pole } = await otvorPanel();

    fireEvent.focus(pole);

    await waitFor(() =>
      expect(prehliadac).toHaveStyle({ top: '0px', height: '508px', bottom: 'auto' }),
    );
  });

  it('sleduje posun viditeľnej plochy a po strate fokusu sa uvoľní až po krátkej pauze', async () => {
    plocha.height = 508;
    const { prehliadac, pole } = await otvorPanel();
    fireEvent.focus(pole);
    plocha.posun(90);
    await waitFor(() => expect(prehliadac).toHaveStyle({ top: '90px', height: '508px' }));

    fireEvent.blur(pole);
    expect(prehliadac).toHaveStyle({ height: '508px' });
    await waitFor(() => expectNepripnuty(prehliadac), {
      timeout: KEYBOARD_RELEASE_DELAY_MS + 1500,
    });
  });

  it('zatvorenie panela pri otvorenej klávesnici vrstvu uvoľní a po opätovnom otvorení nezačne pripnutá', async () => {
    plocha.height = 508;
    const { prehliadac, pole } = await otvorPanel();
    fireEvent.focus(pole);
    await waitFor(() => expect(prehliadac).toHaveStyle({ height: '508px' }));

    await userEvent.click(screen.getByTestId('feed-photo-comments-handle'));
    await waitFor(() => expectNepripnuty(prehliadac), {
      timeout: KEYBOARD_RELEASE_DELAY_MS + 1500,
    });

    await userEvent.click(screen.getByTestId('feed-photo-viewer-comments'));
    await screen.findByText('Komentár 1');
    // Nový panel má nové pole bez fokusu, takže vrstva ostáva uvoľnená.
    await new Promise((resolve) => setTimeout(resolve, KEYBOARD_RELEASE_DELAY_MS + 100));
    expectNepripnuty(screen.getByTestId('feed-photo-viewer'));
  });
});

describe('stránka pod panelom komentárov', () => {
  it('kým je panel otvorený, má `overscroll-behavior: none`, po jeho zatvorení sa vráti pôvodná hodnota', async () => {
    document.documentElement.style.overscrollBehavior = 'auto';
    render(<FeedPhotoViewer post={prispevok()} initialIndex={0} onClose={jest.fn()} />);
    expect(document.documentElement.style.overscrollBehavior).toBe('auto');

    await userEvent.click(await screen.findByTestId('feed-photo-viewer-comments'));
    await screen.findByText('Komentár 1');
    expect(document.documentElement.style.overscrollBehavior).toBe('none');
    expect(document.body.style.overscrollBehavior).toBe('none');

    await userEvent.click(screen.getByTestId('feed-photo-comments-handle'));
    await waitFor(() =>
      expect(document.documentElement.style.overscrollBehavior).toBe('auto'),
    );
    expect(document.body.style.overscrollBehavior).toBe('');
  });
});

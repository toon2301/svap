/**
 * Mobilný detail príspevku: pole na komentár stojí pevne aj pri otvorenej klávesnici (R75 bod 5, nález 370).
 *
 * Detail je vrstva `fixed inset-0`. Kým má pole dole fokus (klávesnica je otvorená), vrstva sa pripne na viditeľnú plochu nad
 * klávesnicou (`top` a `height` z `visualViewport`), takže pole stojí tesne nad ňou, hlavička je hore a nič sa nehýbe. Po strate
 * fokusu sa vrstva uvoľní s krátkou pauzou. Kým je detail otvorený, stránka pod ním dostane `overscroll-behavior: none`, aby sa
 * pri krátkom príspevku nehýbala gumovým efektom.
 *
 * jsdom nepozná `visualViewport`, preto sa dodáva atrapa.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
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
    images: [],
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

async function otvor() {
  render(<FeedPostMobileDetail post={prispevok()} onClose={jest.fn()} />);
  await screen.findByText('Komentár 1');
  return {
    detail: screen.getByTestId('feed-mobile-detail'),
    pole: screen.getByRole('textbox', { name: 'Napíš komentár...' }),
  };
}

function expectNepripnuty(detail: HTMLElement) {
  expect(detail.style.top).toBe('');
  expect(detail.style.height).toBe('');
  expect(detail.style.bottom).toBe('');
}

describe('pole na komentár pri otvorenej klávesnici', () => {
  it('bez fokusu v poli nemá obrazovka vlastný štýl a ostáva `fixed inset-0`', async () => {
    const { detail } = await otvor();

    expectNepripnuty(detail);
    expect(detail).toHaveClass('fixed', 'inset-0');
  });

  it('pri fokuse na pole sa obrazovka pripne na viditeľnú plochu nad klávesnicou', async () => {
    plocha.height = 508;
    const { detail, pole } = await otvor();

    fireEvent.focus(pole);

    await waitFor(() =>
      expect(detail).toHaveStyle({ top: '0px', height: '508px', bottom: 'auto' }),
    );
  });

  it('sleduje aj posun viditeľnej plochy (iPhone odkryl pole) a zmenu výšky klávesnice', async () => {
    plocha.height = 508;
    const { detail, pole } = await otvor();
    fireEvent.focus(pole);
    await waitFor(() => expect(detail).toHaveStyle({ top: '0px', height: '508px' }));

    plocha.posun(120);
    await waitFor(() => expect(detail).toHaveStyle({ top: '120px', height: '508px' }));

    plocha.zmen({ height: 440 });
    await waitFor(() => expect(detail).toHaveStyle({ top: '120px', height: '440px' }));
  });

  it('po strate fokusu sa obrazovka uvoľní až po krátkej pauze', async () => {
    plocha.height = 508;
    const { detail, pole } = await otvor();
    fireEvent.focus(pole);
    await waitFor(() => expect(detail).toHaveStyle({ height: '508px' }));

    fireEvent.blur(pole);
    expect(detail).toHaveStyle({ height: '508px' });

    await waitFor(() => expectNepripnuty(detail), {
      timeout: KEYBOARD_RELEASE_DELAY_MS + 1500,
    });
  });

  it('ťuk na „Odpovedať“ pri otvorenej klávesnici obrazovku neuvoľní (pole sa hneď zaostrí znova)', async () => {
    plocha.height = 508;
    const { detail, pole } = await otvor();
    await userEvent.click(pole);
    await waitFor(() => expect(detail).toHaveStyle({ height: '508px' }));

    await userEvent.click(screen.getByTestId('feed-comment-reply-100'));
    // Pauza dlhšia než uvoľnenie: keby sa vrstva uvoľnila, už by bola `inset-0`.
    await new Promise((resolve) => setTimeout(resolve, KEYBOARD_RELEASE_DELAY_MS + 200));

    expect(screen.getByTestId('feed-reply-target')).toBeInTheDocument();
    expect(detail).toHaveStyle({ top: '0px', height: '508px' });
  });

  it('po zatvorení obrazovky prestane počúvať viditeľnú plochu', async () => {
    plocha.height = 508;
    const odober = jest.spyOn(plocha, 'removeEventListener');
    const { unmount } = render(
      <FeedPostMobileDetail post={prispevok()} onClose={jest.fn()} />,
    );
    await screen.findByText('Komentár 1');
    fireEvent.focus(screen.getByRole('textbox', { name: 'Napíš komentár...' }));
    await waitFor(() =>
      expect(screen.getByTestId('feed-mobile-detail')).toHaveStyle({ height: '508px' }),
    );

    unmount();

    expect(odober).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(odober).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});

describe('stránka pod obrazovkou', () => {
  it('kým je detail otvorený, má `overscroll-behavior: none`, po zatvorení sa vráti pôvodná hodnota', async () => {
    document.documentElement.style.overscrollBehavior = 'auto';
    const { unmount } = render(
      <FeedPostMobileDetail post={prispevok()} onClose={jest.fn()} />,
    );
    await screen.findByText('Komentár 1');

    expect(document.documentElement.style.overscrollBehavior).toBe('none');
    expect(document.body.style.overscrollBehavior).toBe('none');

    unmount();
    expect(document.documentElement.style.overscrollBehavior).toBe('auto');
    expect(document.body.style.overscrollBehavior).toBe('');
  });

  it('nemení `overflow` na body', async () => {
    document.body.style.overflow = 'auto';
    render(<FeedPostMobileDetail post={prispevok()} onClose={jest.fn()} />);
    await screen.findByText('Komentár 1');

    expect(document.body.style.overflow).toBe('auto');
  });
});

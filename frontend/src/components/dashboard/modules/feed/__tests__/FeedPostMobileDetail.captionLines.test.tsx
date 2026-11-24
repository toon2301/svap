/**
 * Počet riadkov textu na mobilnej obrazovke detailu príspevku (K58, krok 1, nález 357).
 *
 * Text príspevku sa na obrazovke zbalí na desať riadkov (rovnako ako v okne detailu na počítači), nie na päť. Karta
 * vo feede pod obrazovkou ostáva na troch riadkoch. Rozbalený text je bežná časť toku, bez stropu a bez vlastného
 * posúvania.
 *
 * jsdom nelayoutuje, takže „presahuje text desať riadkov?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`).
 */

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { type FeedPost } from '@/lib/feedApi';

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

// Obrazovka detailu existuje len na mobile.
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

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images: [],
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

/** Text s `pocet` riadkami, každý na vlastnom riadku. */
function textSRiadkami(pocet: number): string {
  return Array.from({ length: pocet }, (_nepouzite, index) => `Riadok ${index + 1} textu.`).join('\n');
}

/**
 * Text na obrazovke sa meria rovnako ako na karte: zbalený odsek presahuje, rozbalený sa zmestí. Karta pod obrazovkou
 * má iné `data-testid`, takže sa jej výšky nedotknú.
 */
function nastavVysky({ presahuje }: { presahuje: boolean }) {
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-mobile-detail-caption' ? 200 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (this.dataset.testid !== 'feed-mobile-detail-caption') return 0;
      return presahuje && this.className.includes('line-clamp') ? 300 : 200;
    },
  });
}

/** Otvorí obrazovku ikonou komentárov na karte a dobehne efekty, ktoré obrazovka spúšťa až v druhom kole. */
async function otvorObrazovku(post: FeedPost) {
  render(<FeedPostCard post={post} />);
  await userEvent.click(screen.getByTestId('feed-comments-button'));
  const obrazovka = await screen.findByTestId('feed-mobile-detail');
  await act(async () => {});
  return obrazovka;
}

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

afterEach(() => {
  // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

describe('text príspevku na obrazovke detailu', () => {
  it('s pätnástimi riadkami sa zbalí na desať riadkov a má „Viac“', async () => {
    nastavVysky({ presahuje: true });
    const obrazovka = await otvorObrazovku(makePost({ caption: textSRiadkami(15) }));

    const text = within(obrazovka).getByTestId('feed-mobile-detail-caption');
    expect(text).toHaveClass('line-clamp-[10]');
    expect(text).not.toHaveClass('line-clamp-5');
    expect(text).not.toHaveClass('line-clamp-3');
    expect(await within(obrazovka).findByTestId('feed-mobile-detail-caption-toggle')).toHaveTextContent(
      'Viac',
    );
  });

  it('krátky text prepínač nemá, ale orezanie na desať riadkov ostáva pripravené', async () => {
    nastavVysky({ presahuje: false });
    const obrazovka = await otvorObrazovku(makePost({ caption: textSRiadkami(2) }));

    const text = within(obrazovka).getByTestId('feed-mobile-detail-caption');
    expect(text).toHaveClass('line-clamp-[10]');
    expect(within(obrazovka).queryByTestId('feed-mobile-detail-caption-toggle')).toBeNull();
  });

  it('po „Viac“ sa rozbalí v bežnom toku, bez stropu a bez vlastného posúvania, a „Menej“ ho zbalí', async () => {
    nastavVysky({ presahuje: true });
    const obrazovka = await otvorObrazovku(makePost({ caption: textSRiadkami(15) }));

    await userEvent.click(await within(obrazovka).findByTestId('feed-mobile-detail-caption-toggle'));

    const rozbaleny = within(obrazovka).getByTestId('feed-mobile-detail-caption');
    expect(rozbaleny).not.toHaveClass('line-clamp-[10]');
    expect(rozbaleny.className).not.toMatch(/max-h-\[/);
    expect(rozbaleny).not.toHaveClass('overflow-y-auto');
    expect(rozbaleny).not.toHaveAttribute('role');
    expect(within(obrazovka).getByTestId('feed-mobile-detail-caption-toggle')).toHaveTextContent('Menej');

    await userEvent.click(within(obrazovka).getByTestId('feed-mobile-detail-caption-toggle'));

    expect(within(obrazovka).getByTestId('feed-mobile-detail-caption')).toHaveClass('line-clamp-[10]');
    expect(within(obrazovka).getByTestId('feed-mobile-detail-caption-toggle')).toHaveTextContent('Viac');
  });

  it('zhluk prázdnych riadkov v texte sa scvrkne na jedno zalomenie', async () => {
    nastavVysky({ presahuje: false });
    const obrazovka = await otvorObrazovku(
      makePost({ caption: 'Prvý odsek\n\n\n\n\nDruhý odsek' }),
    );

    expect(
      within(obrazovka).getByTestId('feed-mobile-detail-caption').textContent,
    ).toBe('Prvý odsek\nDruhý odsek');
  });

  it('text na obrazovke je sivý, ako text karty (nie biely tón z fotky)', async () => {
    nastavVysky({ presahuje: true });
    const obrazovka = await otvorObrazovku(makePost({ caption: textSRiadkami(15) }));

    const text = within(obrazovka).getByTestId('feed-mobile-detail-caption');
    expect(text).toHaveClass('text-gray-800');
    expect(text).not.toHaveClass('text-white');
  });

  it('karta vo feede pod obrazovkou ostáva na troch riadkoch', async () => {
    nastavVysky({ presahuje: true });
    await otvorObrazovku(makePost({ caption: textSRiadkami(15) }));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('line-clamp-[10]');
  });
});

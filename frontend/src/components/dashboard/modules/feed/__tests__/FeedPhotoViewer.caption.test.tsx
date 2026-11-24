/**
 * Text príspevku v mobilnom prehliadači fotky (K58, krok 1, nález 365).
 *
 * Prehliadač používa ten istý `FeedPostCaption` ako karta: tri riadky, „Viac“ len pri presahu, „Menej“ po rozbalení.
 * Text sedí NA fotke, preto je biely a rozbalený má tmavý podklad; zakryť smie najviac 40 % obrazovky a dlhší sa
 * posúva vnútri.
 *
 * jsdom nelayoutuje, takže „presahuje text tri riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`).
 */

import { render, screen, waitFor, within } from '@testing-library/react';
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

// Prehliadač fotky sa otvára len na mobile.
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

const DLHY_TEXT = 'Veľmi dlhý text príspevku, ktorý presahuje tri riadky.';

/**
 * Text vo fotoprehliadači sa meria rovnako ako na karte: zbalený odsek presahuje, rozbalený sa zmestí. Karta pod
 * prehliadačom má iné `data-testid`, takže sa jej výšky nedotknú.
 */
function nastavVysky({ presahuje }: { presahuje: boolean }) {
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-photo-viewer-caption' ? 60 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (this.dataset.testid !== 'feed-photo-viewer-caption') return 0;
      return presahuje && this.className.includes('line-clamp') ? 900 : 60;
    },
  });
}

/** Vykreslí kartu vo feede a ťukne na fotku, tak sa prehliadač otvára. */
async function otvorPrehliadac(post = makePost()) {
  render(<FeedPostCard post={post} />);
  await userEvent.click(screen.getByTestId('feed-image-open-11'));
  return await screen.findByTestId('feed-photo-viewer');
}

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

describe('zbalený text vo fotoprehliadači', () => {
  it('má tri riadky a je biely', async () => {
    nastavVysky({ presahuje: true });
    const prehliadac = await otvorPrehliadac(makePost({ caption: DLHY_TEXT }));

    const text = within(prehliadac).getByTestId('feed-photo-viewer-caption');
    expect(text).toHaveClass('line-clamp-3', 'text-white');
    expect(text).not.toHaveClass('text-gray-800');
    expect(text).not.toHaveClass('line-clamp-2');
    expect(text).toHaveTextContent(DLHY_TEXT);
  });

  it('stojí v obale s miestom pre „X“ vpravo, v hornej vrstve nad fotkou', async () => {
    nastavVysky({ presahuje: true });
    const prehliadac = await otvorPrehliadac(makePost({ caption: DLHY_TEXT }));

    const text = within(prehliadac).getByTestId('feed-photo-viewer-caption');
    const obal = text.closest('.pr-12') as HTMLElement;
    expect(obal).not.toBeNull();
    expect(obal).toHaveClass('pointer-events-auto', 'mt-2');
    expect(within(prehliadac).getByTestId('feed-photo-viewer-top').contains(obal)).toBe(true);
  });

  it('krátky text, ktorý sa zmestí, prepínač nemá', async () => {
    nastavVysky({ presahuje: false });
    const prehliadac = await otvorPrehliadac(makePost({ caption: 'Krátky text' }));

    expect(within(prehliadac).getByTestId('feed-photo-viewer-caption')).toHaveTextContent(
      'Krátky text',
    );
    expect(within(prehliadac).queryByTestId('feed-photo-viewer-caption-toggle')).toBeNull();
  });

  it('dlhý text má prepínač „Viac“ a starý prepínač `-more` už neexistuje', async () => {
    nastavVysky({ presahuje: true });
    const prehliadac = await otvorPrehliadac(makePost({ caption: DLHY_TEXT }));

    const prepinac = await within(prehliadac).findByTestId('feed-photo-viewer-caption-toggle');
    expect(prepinac).toHaveTextContent('Viac');
    expect(prepinac).toHaveAttribute('aria-expanded', 'false');
    expect(within(prehliadac).queryByTestId('feed-photo-viewer-caption-more')).toBeNull();
  });

  it('zhluk prázdnych riadkov v texte sa scvrkne na jedno zalomenie', async () => {
    nastavVysky({ presahuje: false });
    const prehliadac = await otvorPrehliadac(
      makePost({ caption: 'Prvý odsek\n\n\n\n\nDruhý odsek' }),
    );

    expect(
      within(prehliadac).getByTestId('feed-photo-viewer-caption').textContent,
    ).toBe('Prvý odsek\nDruhý odsek');
  });

  it('prázdny popis nevykreslí nič, ani obal, ani prepínač', async () => {
    nastavVysky({ presahuje: true });
    const prehliadac = await otvorPrehliadac(makePost({ caption: '' }));

    expect(within(prehliadac).queryByTestId('feed-photo-viewer-caption')).toBeNull();
    expect(within(prehliadac).queryByTestId('feed-photo-viewer-caption-toggle')).toBeNull();
    // Hlavička s autorom a „X“ ostáva.
    expect(within(prehliadac).getByTestId('feed-photo-viewer-author')).toBeInTheDocument();
    expect(within(prehliadac).getByTestId('feed-photo-viewer-top').querySelector('.pr-12')).toBeNull();
  });
});

describe('rozbalený text vo fotoprehliadači', () => {
  it('po ťuku na „Viac“ má „Menej“, strop 40 % obrazovky, vlastné posúvanie a tmavý podklad', async () => {
    nastavVysky({ presahuje: true });
    const prehliadac = await otvorPrehliadac(makePost({ caption: DLHY_TEXT }));

    await userEvent.click(
      await within(prehliadac).findByTestId('feed-photo-viewer-caption-toggle'),
    );

    const text = within(prehliadac).getByTestId('feed-photo-viewer-caption');
    expect(text).not.toHaveClass('line-clamp-3');
    expect(text).toHaveClass('max-h-[40vh]', 'overflow-y-auto', 'subtle-scrollbar', 'text-white');
    expect(text).toHaveAttribute('role', 'region');
    expect(text).toHaveAttribute('tabindex', '0');
    expect(text).toHaveAccessibleName('Text príspevku');

    const prepinac = within(prehliadac).getByTestId('feed-photo-viewer-caption-toggle');
    expect(prepinac).toHaveTextContent('Menej');
    expect(prepinac).toHaveAttribute('aria-expanded', 'true');
    expect(prepinac).toHaveClass('text-white/80');

    // Tmavý podklad nesie obal odseku aj prepínača, takže „Menej“ je na ňom tiež čitateľné.
    const podklad = text.parentElement as HTMLElement;
    expect(podklad).toHaveClass('bg-black/60', 'backdrop-blur-sm', 'rounded-xl');
    expect(podklad.contains(prepinac)).toBe(true);
  });

  it('„Menej“ text zbalí a tmavý podklad zmizne', async () => {
    nastavVysky({ presahuje: true });
    const prehliadac = await otvorPrehliadac(makePost({ caption: DLHY_TEXT }));

    await userEvent.click(
      await within(prehliadac).findByTestId('feed-photo-viewer-caption-toggle'),
    );
    await userEvent.click(within(prehliadac).getByTestId('feed-photo-viewer-caption-toggle'));

    const text = within(prehliadac).getByTestId('feed-photo-viewer-caption');
    expect(text).toHaveClass('line-clamp-3');
    expect(text).not.toHaveClass('overflow-y-auto');
    expect(text.className).not.toMatch(/max-h-\[/);
    expect(text.parentElement).not.toHaveAttribute('class');
    expect(within(prehliadac).getByTestId('feed-photo-viewer-caption-toggle')).toHaveTextContent(
      'Viac',
    );
  });

  it('ťuk na prepínač neschová ovládaciu vrstvu nad fotkou', async () => {
    nastavVysky({ presahuje: true });
    const prehliadac = await otvorPrehliadac(makePost({ caption: DLHY_TEXT }));

    await userEvent.click(
      await within(prehliadac).findByTestId('feed-photo-viewer-caption-toggle'),
    );

    await waitFor(() =>
      expect(within(prehliadac).getByTestId('feed-photo-viewer-caption-toggle')).toHaveTextContent(
        'Menej',
      ),
    );
    expect(within(prehliadac).getByTestId('feed-photo-viewer-top')).toBeInTheDocument();
    expect(within(prehliadac).getByTestId('feed-photo-viewer-actions')).toBeInTheDocument();
  });
});

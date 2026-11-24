/**
 * Okno detailu na počítači: prepnutie na iný príspevok pri otvorenom okne (PR #323, nález CodeRabbitu).
 *
 * Okno sa pri prepnutí na iný príspevok neodmountuje, takže kým sa nový príspevok načítava, `post` ešte drží
 * predošlý. Kostra pri načítaní je pod 1 024 px vždy v úzkom okne (576 px, bez pevnej výšky) a nesmie dediť rozmery
 * príspevku, ktorý už nie je na obrazovke; po načítaní sa šírka a rozloženie určia podľa nového príspevku. Na počítači
 * je od K58 (R73) široká (864 px) hneď, takže sa po načítaní nehýbe žiadny druh príspevku.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozmeroch rozhodujú.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

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

let mockIsMobile = false;

jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
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

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const povodnyAutor = {
  id: 21,
  display_name: 'Peter',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

const ZAKLAD = {
  author: autor,
  tagged_users: [],
  likes_count: 1,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

/** Voľný príspevok s daným `id`, s jednou schválenou fotkou alebo bez nej. */
function volnyPrispevok(id: number, sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    id,
    post_type: 'free_post',
    caption: 'Text príspevku',
    images: sFotkou
      ? [
          {
            id: 11,
            status: 'approved',
            thumbnail_url: 'http://api.test/11-t.webp',
            large_url: 'http://api.test/11-l.webp',
          },
        ]
      : [],
    shared_content: null,
  } as unknown as FeedPost;
}

/** Zdieľaná ponuka s daným `id` (bez fotky). */
function ponuka(id: number): FeedPost {
  return {
    ...ZAKLAD,
    id,
    post_type: 'shared_offer',
    caption: 'Odporúčam.',
    images: [],
    shared_content: {
      type: 'offer',
      title: 'Programovanie',
      category: 'it',
      caption: '',
      id: 42,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: null,
      is_seeking: false,
      price_negotiable: false,
      price_from: '25',
      price_currency: '€',
    },
  } as unknown as FeedPost;
}

beforeEach(() => {
  mockIsMobile = false;
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

/** Odpoveď, ktorú test rozhodne, kedy dorazí. */
function odlozena() {
  let dokonci: (prispevok: FeedPost) => void = () => undefined;
  let zlyha: (chyba: Error) => void = () => undefined;
  const promise = new Promise<FeedPost>((resolve, reject) => {
    dokonci = resolve;
    zlyha = reject;
  });
  return { promise, dokonci, zlyha };
}

/**
 * Otvorí okno na príspevku s `id` 7 (hneď sa načíta) a prepne ho na príspevok s `id` 8, ktorého odpoveď dorazí, až keď
 * to test povie. Vráti ovládanie odpovede a okno, ktoré počas načítania zostáva ten istý uzol.
 */
async function otvorAPrepni(predosly: FeedPost) {
  const nova = odlozena();
  mockedGetPost.mockImplementation((id) =>
    id === 7 ? Promise.resolve(predosly) : nova.promise,
  );
  const onClose = jest.fn();
  const { rerender } = render(<FeedPostDetailOverlay postId={7} onClose={onClose} />);
  await screen.findByTestId('feed-post-card');

  rerender(<FeedPostDetailOverlay postId={8} onClose={onClose} />);
  await screen.findByTestId('feed-post-overlay-loading');
  return { nova, okno: screen.getByTestId('feed-post-overlay') };
}

// `toHaveClass` porovnáva celé triedy: zlepená trieda (`max-w-xlmax-h-[95vh]`) by prešla cez `toContain`.
function jeUzke(okno: HTMLElement) {
  expect(okno).toHaveClass('max-w-xl');
  expect(okno).not.toHaveClass('max-w-[54rem]');
}

function jeSiroke(okno: HTMLElement) {
  expect(okno).toHaveClass('max-w-[54rem]');
  expect(okno).not.toHaveClass('max-w-xl');
}

describe('prepnutie na iný príspevok: kostra pri načítaní', () => {
  it.each([
    ['príspevok s fotkou', () => volnyPrispevok(7, true)],
    ['ponuka', () => ponuka(7)],
  ])(
    'po prepnutí z príspevku (%s) pod 1 024 px je kostra v úzkom okne so stropom výšky',
    async (_nazov, vytvor) => {
      mockIsMobile = true;
      const { okno } = await otvorAPrepni(vytvor());

      expect(screen.getByTestId('feed-post-overlay-loading')).toBeInTheDocument();
      jeUzke(okno);
      expect(okno).toHaveClass('max-h-[95vh]');
      expect(okno).not.toHaveClass('h-[95vh]');
    },
  );

  it('po prepnutí z textového príspevku pod 1 024 px je kostra v úzkom okne', async () => {
    mockIsMobile = true;
    const { okno } = await otvorAPrepni(volnyPrispevok(7, false));

    jeUzke(okno);
    expect(okno).toHaveClass('max-h-[95vh]');
  });

  it('po prepnutí pod 1 024 px je kostra tiež v úzkom okne', async () => {
    mockIsMobile = true;
    const { okno } = await otvorAPrepni(volnyPrispevok(7, true));

    jeUzke(okno);
    expect(okno).toHaveClass('max-h-[95vh]');
  });
});

describe('prepnutie na iný príspevok: po načítaní', () => {
  it('príspevok s fotkou: okno sa zo širokej kostry nehýbe a po načítaní dostane pevnú výšku', async () => {
    const { nova, okno } = await otvorAPrepni(volnyPrispevok(7, false));
    // Na počítači je kostra od K58 (R73) široká, so stropom výšky.
    jeSiroke(okno);
    expect(okno).toHaveClass('max-h-[95vh]');
    expect(okno).not.toHaveClass('h-[95vh]');

    nova.dokonci(volnyPrispevok(8, true));
    await screen.findByTestId('feed-post-overlay-split');

    jeSiroke(screen.getByTestId('feed-post-overlay'));
    expect(screen.getByTestId('feed-post-overlay')).toHaveClass('h-[95vh]');
    expect(screen.queryByTestId('feed-post-overlay-loading')).toBeNull();
  });

  it('ponuka: okno sa z úzkej kostry rozšíri na široké s pevnou výškou', async () => {
    const { nova } = await otvorAPrepni(volnyPrispevok(7, true));

    nova.dokonci(ponuka(8));
    await screen.findByTestId('feed-post-overlay-split');

    jeSiroke(screen.getByTestId('feed-post-overlay'));
    expect(screen.getByTestId('feed-post-overlay')).toHaveClass('h-[95vh]');
  });

  it('pod 1 024 px: textový príspevok: okno ostane úzke aj po načítaní', async () => {
    mockIsMobile = true;
    const { nova } = await otvorAPrepni(volnyPrispevok(7, true));

    nova.dokonci(volnyPrispevok(8, false));
    await screen.findByTestId('feed-post-overlay-fixed');

    const okno = screen.getByTestId('feed-post-overlay');
    jeUzke(okno);
    expect(okno).toHaveClass('max-h-[95vh]');
    expect(screen.queryByTestId('feed-post-overlay-split')).toBeNull();
  });

  it('pod 1 024 px: chyba pri načítaní nového príspevku: okno s chybou je úzke', async () => {
    mockIsMobile = true;
    const { nova } = await otvorAPrepni(volnyPrispevok(7, true));

    nova.zlyha(new Error('chyba'));
    await screen.findByTestId('feed-post-overlay-error');

    jeUzke(screen.getByTestId('feed-post-overlay'));
  });
});

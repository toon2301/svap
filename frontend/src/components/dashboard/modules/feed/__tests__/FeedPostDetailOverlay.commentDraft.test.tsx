/**
 * Okno detailu na počítači: rozpracovaný komentár pri prepnutí rozloženia a pri prepnutí na iný príspevok
 * (PR #323, nález CodeRabbitu).
 *
 * Okno prepína dvojstĺpcové a jednostĺpcové rozloženie pri prechode cez 1 024 px. Komentáre sa pri tom odmountujú a
 * vykreslia na inom mieste stromu, takže text, ktorý používateľ práve písal, sa predtým stratil. Po zmene ho drží okno
 * (`useFeedCommentDraft`). Text patrí príspevku, pre ktorý vznikol: iný príspevok má prázdne pole a rozpísaný komentár
 * sa nikdy neodošle k inému príspevku.
 *
 * Zmenu šírky obrazovky simuluje atrapa `useIsMobile` a opätovné vykreslenie okna.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import {
  createFeedPostComment,
  getFeedPost,
  type FeedPost,
  type FeedPostComment,
} from '@/lib/feedApi';

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
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

const NAZOV_POLA = 'Napíš komentár...';

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

/** Voľný príspevok s daným `id` a jednou schválenou fotkou. */
function prispevokSFotkou(id: number): FeedPost {
  return {
    ...ZAKLAD,
    id,
    post_type: 'free_post',
    caption: 'Text príspevku',
    images: [
      {
        id: 11,
        status: 'approved',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
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

function komentar(id: number, text: string): FeedPostComment {
  return {
    id,
    text,
    author: autor,
    can_delete: true,
    can_edit: true,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
  } as FeedPostComment;
}

const onClose = jest.fn();

beforeEach(() => {
  mockIsMobile = false;
  jest.clearAllMocks();
  mockedCreate.mockReset();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

const pole = () => screen.getByLabelText(NAZOV_POLA) as HTMLTextAreaElement;

function napis(text: string) {
  fireEvent.change(pole(), { target: { value: text } });
}

/** Príspevky podľa `id`: okno si pri prepnutí vyžiada nový príspevok a dostane ho hneď. */
function odpovedajPrispevkami(...prispevky: FeedPost[]) {
  mockedGetPost.mockImplementation((id) => {
    const najdeny = prispevky.find((prispevok) => prispevok.id === id);
    return najdeny ? Promise.resolve(najdeny) : Promise.reject(new Error('neznámy príspevok'));
  });
}

/** Otvorí okno na príspevku `postId` a počká, kým je vykreslený príspevok aj pole na komentár. */
async function otvor(postId: number) {
  const view = render(<FeedPostDetailOverlay postId={postId} onClose={onClose} />);
  await screen.findByTestId('feed-post-card');
  await screen.findByLabelText(NAZOV_POLA);
  return view;
}

/** Prepne okno na iný príspevok a počká, kým sa načíta a kým sa objaví jeho pole na komentár. */
async function prepniNa(view: ReturnType<typeof render>, postId: number) {
  view.rerender(<FeedPostDetailOverlay postId={postId} onClose={onClose} />);
  await waitFor(() => expect(screen.queryByTestId('feed-post-overlay-loading')).toBeNull());
  await screen.findByLabelText(NAZOV_POLA);
}

/** Zmení šírku obrazovky: `uzka` = pod 1 024 px (jednostĺpcové rozloženie), inak dva stĺpce. */
function zmenSirku(view: ReturnType<typeof render>, postId: number, uzka: boolean) {
  mockIsMobile = uzka;
  view.rerender(<FeedPostDetailOverlay postId={postId} onClose={onClose} />);
}

const PRISPEVKY: Array<[string, (id: number) => FeedPost]> = [
  ['príspevok s fotkou', prispevokSFotkou],
  ['zdieľaná ponuka', ponuka],
];

describe('okno detailu: rozpracovaný komentár pri prepnutí rozloženia', () => {
  it.each(PRISPEVKY)(
    '%s: text ostane v poli, keď sa okno zúži pod 1 024 px',
    async (_nazov, vytvor) => {
      odpovedajPrispevkami(vytvor(7));
      const view = await otvor(7);
      expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
      napis('Rozpísaný komentár');

      zmenSirku(view, 7, true);

      expect(await screen.findByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
      expect(screen.queryByTestId('feed-post-overlay-split')).toBeNull();
      expect(await screen.findByLabelText(NAZOV_POLA)).toHaveValue('Rozpísaný komentár');
    },
  );

  it.each(PRISPEVKY)(
    '%s: text ostane v poli, keď sa okno rozšíri nad 1 024 px',
    async (_nazov, vytvor) => {
      mockIsMobile = true;
      odpovedajPrispevkami(vytvor(7));
      const view = await otvor(7);
      expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
      napis('Rozpísaný komentár');

      zmenSirku(view, 7, false);

      expect(await screen.findByTestId('feed-post-overlay-split')).toBeInTheDocument();
      expect(screen.queryByTestId('feed-post-overlay-fixed')).toBeNull();
      expect(await screen.findByLabelText(NAZOV_POLA)).toHaveValue('Rozpísaný komentár');
    },
  );

  it('po odoslaní komentára je pole prázdne aj po prepnutí rozloženia', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7));
    mockedCreate.mockResolvedValue(komentar(1, 'Rozpísaný komentár'));
    const view = await otvor(7);
    napis('Rozpísaný komentár');

    fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await waitFor(() => expect(pole()).toHaveValue(''));
    expect(mockedCreate).toHaveBeenCalledWith(7, 'Rozpísaný komentár');

    zmenSirku(view, 7, true);

    expect(await screen.findByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    expect(await screen.findByLabelText(NAZOV_POLA)).toHaveValue('');
  });
});

describe('okno detailu: rozpracovaný komentár pri prepnutí na iný príspevok', () => {
  it('iný príspevok má prázdne pole a odošle sa len text napísaný k nemu', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7), prispevokSFotkou(8));
    mockedCreate.mockResolvedValue(komentar(1, 'Text pre osem'));
    const view = await otvor(7);
    napis('Text pre sedem');

    await prepniNa(view, 8);

    expect(pole()).toHaveValue('');
    napis('Text pre osem');
    fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(8, 'Text pre osem');
  });

  it('po návrate na pôvodný príspevok je jeho text späť a text druhého príspevku ostáva pri ňom', async () => {
    odpovedajPrispevkami(prispevokSFotkou(7), prispevokSFotkou(8));
    const view = await otvor(7);
    napis('Text pre sedem');
    await prepniNa(view, 8);
    napis('Text pre osem');

    await prepniNa(view, 7);
    expect(pole()).toHaveValue('Text pre sedem');

    await prepniNa(view, 8);
    expect(pole()).toHaveValue('Text pre osem');
  });
});

/**
 * Komentáre vložené priamo do karty (rozbalené ikonou komentárov): počet pri ikone, okno detailu a zvýraznenie.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48). Karta vykresľuje sekciu komentárov
 * a napája ju na tri veci: zmenu počtu (pridaný komentár zvýši číslo pri ikone), celkový počet zo zoznamu (číslo pri
 * ikone vychádza z toho istého načítania ako zoznam) a komentár z upozornenia (`highlightCommentId`, sekcia ho dohľadá aj
 * na ďalšej stránke). V okne detailu sa vložené komentáre nekreslia vôbec, tie si okno kreslí samo. Existujúce testy
 * držia samotnú sekciu komentárov; napojenie z karty nestráži nič. Testy idú cez verejné rozhranie karty (vlastnosti,
 * DOM, `data-testid`, atrapa `listFeedPostComments`), takže musia prejsť bez úpravy aj po každom kroku delenia.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import {
  createFeedPostComment,
  listFeedPostComments,
  type FeedPost,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
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

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Ahoj',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 1,
    comments_count: 2,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

function makeComment(id: number, text: string): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
  } as unknown as FeedPostComment;
}

const commentsLabel = () =>
  screen.getByTestId('feed-comments-button').getAttribute('aria-label');

beforeAll(() => {
  // jsdom nemá posun do zorného poľa; sekcia ho pri hľadaní komentára volá.
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  mockedCreate.mockReset();
  document.body.innerHTML = '';
});

describe('komentáre vložené do karty: počet pri ikone', () => {
  it('pridanie komentára v karte zvýši počet pri ikone komentárov', async () => {
    mockedList.mockResolvedValue({
      results: [makeComment(1, 'Prvý'), makeComment(2, 'Druhý')],
      next: null,
      previous: null,
      count: 2,
    });
    mockedCreate.mockResolvedValue(makeComment(3, 'Nový komentár'));
    render(<FeedPostCard post={makePost()} />);
    expect(commentsLabel()).toBe('Komentáre: 2');

    await userEvent.click(screen.getByTestId('feed-comments-button'));
    const section = await screen.findByTestId('feed-post-comments');
    await within(section).findByText('Druhý');
    expect(commentsLabel()).toBe('Komentáre: 2');

    await userEvent.type(
      within(section).getByPlaceholderText('Napíš komentár...'),
      'Nový komentár',
    );
    await userEvent.click(within(section).getByRole('button', { name: 'Pridať' }));

    expect(await within(section).findByText('Nový komentár')).toBeInTheDocument();
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(commentsLabel()).toBe('Komentáre: 3');
  });

  it('celkový počet zo zoznamu komentárov sa premietne do ikony komentárov', async () => {
    mockedList.mockResolvedValue({
      results: [makeComment(1, 'Prvý'), makeComment(2, 'Druhý')],
      next: null,
      previous: null,
      count: 5,
    });
    render(<FeedPostCard post={makePost()} />);
    expect(commentsLabel()).toBe('Komentáre: 2');

    await userEvent.click(screen.getByTestId('feed-comments-button'));

    await waitFor(() => expect(commentsLabel()).toBe('Komentáre: 5'));
  });
});

describe('komentáre vložené do karty: okno detailu a zvýraznenie', () => {
  it('v okne detailu sa vložené komentáre nekreslia ani po kliknutí na ikonu komentárov', async () => {
    render(<FeedPostCard post={makePost()} variant="detail" />);

    await userEvent.click(screen.getByTestId('feed-comments-button'));

    expect(screen.queryByTestId('feed-post-comments')).not.toBeInTheDocument();
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('komentár z upozornenia sa dohľadá aj na ďalšej stránke, lebo karta podá sekcii jeho id', async () => {
    mockedList.mockImplementation(async (_postId, params) =>
      params?.cursorUrl
        ? {
            results: [makeComment(33, 'Hľadaný komentár'), makeComment(34, 'Ďalší')],
            next: null,
            previous: null,
            count: 4,
          }
        : {
            results: [makeComment(1, 'Prvý'), makeComment(2, 'Druhý')],
            next: 'http://api.test/comments?cursor=strana2',
            previous: null,
            count: 4,
          },
    );
    render(
      <FeedPostCard
        post={makePost({ comments_count: 4 })}
        initialCommentsOpen
        highlightCommentId={33}
      />,
    );

    const section = await screen.findByTestId('feed-post-comments');

    await waitFor(() =>
      expect(section.querySelector('[data-comment-id="33"]')).toBeInTheDocument(),
    );
    expect(mockedList).toHaveBeenCalledTimes(2);
  });
});

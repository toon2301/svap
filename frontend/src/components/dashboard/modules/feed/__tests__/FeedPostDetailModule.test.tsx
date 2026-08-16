import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostDetailModule from '../FeedPostDetailModule';
import {
  createFeedPostComment,
  getFeedPost,
  listFeedPostComments,
  type FeedPost,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  deleteFeedPost: jest.fn(),
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  parseFeedPostId: (v: unknown) => (Number(v) >= 1 ? Number(v) : null),
}));

const mockRouterPush = jest.fn();
const mockSearchParams = { get: jest.fn(() => null) };
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: React.ComponentProps<'section'>) => (
      <section {...props}>{children}</section>
    ),
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedListComments = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;
const mockedCreateComment = createFeedPostComment as jest.MockedFunction<
  typeof createFeedPostComment
>;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const post: FeedPost = {
  id: 5,
  post_type: 'free_post',
  caption: 'Ahoj feed!',
  author,
  image: null,
  shared_content: null,
  shared_content_unavailable: false,
  tagged_users: [],
  likes_count: 0,
  comments_count: 1,
  is_liked_by_me: false,
  can_manage: false,
  created_at: new Date().toISOString(),
};

function comment(id: number, text: string): FeedPostComment {
  return { id, text, author, can_delete: true, likes_count: 0, is_liked_by_me: false, created_at: '2026-01-01' };
}

describe('FeedPostDetailModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPost.mockResolvedValue(post);
    mockedListComments.mockResolvedValue({
      results: [comment(1, 'Existujúci')],
      next: null,
      previous: null,
    });
  });

  it('opens with comments expanded', async () => {
    render(<FeedPostDetailModule postId={5} />);

    expect(await screen.findByTestId('feed-post-detail')).toBeInTheDocument();
    expect(await screen.findByText('Existujúci')).toBeInTheDocument();
  });

  it('shows a newly added comment immediately, without a reload', async () => {
    mockedCreateComment.mockResolvedValue(comment(2, 'Môj nový komentár'));

    render(<FeedPostDetailModule postId={5} />);
    const section = await screen.findByTestId('feed-post-comments');
    await within(section).findByText('Existujúci');

    await userEvent.type(
      within(section).getByRole('textbox'),
      'Môj nový komentár',
    );
    await userEvent.click(within(section).getByRole('button', { name: 'Pridať' }));

    await waitFor(() => {
      expect(within(section).getByText('Môj nový komentár')).toBeInTheDocument();
    });
    // Zoznam sa nesmie znovu načítať zo servera – nový komentár pribudne
    // do stavu, inak by po refetchi (bez neho na serveri) zmizol.
    expect(within(section).getByText('Existujúci')).toBeInTheDocument();
  });

  it('does not keep the previous post state when navigating to another post', async () => {
    // Notifikácia → detail A → iná notifikácia → detail B. Bez remountu by si
    // karta niesla lajk/počty z príspevku A.
    mockedGetPost.mockResolvedValueOnce({
      ...post,
      id: 5,
      likes_count: 7,
      is_liked_by_me: true,
    });

    const { rerender } = render(<FeedPostDetailModule postId={5} />);
    await screen.findByTestId('feed-post-detail');
    expect(screen.getByTestId('feed-like-button')).toHaveTextContent('7');

    mockedGetPost.mockResolvedValueOnce({
      ...post,
      id: 9,
      likes_count: 0,
      is_liked_by_me: false,
    });
    rerender(<FeedPostDetailModule postId={9} />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-like-button')).toHaveTextContent('0');
    });
  });

  it('caps the comments height on the detail page too', async () => {
    // Detail renderuje ten istý FeedPostComments ako karta vo feede, takže
    // ohraničenie výšky platí aj tu – tento test to drží, keby sa detail
    // niekedy odklonil na vlastnú implementáciu.
    render(<FeedPostDetailModule postId={5} />);

    const box = await screen.findByTestId('feed-comments-scroll');
    expect(box.className).toContain('overflow-y-auto');
    expect(box.className).toMatch(/max-h-\[min\(/);
  });

  it('redirects when the post is gone', async () => {
    mockedGetPost.mockRejectedValue({ response: { status: 404 } });

    render(<FeedPostDetailModule postId={5} />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/home');
    });
  });

  it('offers a retry on a transient error instead of redirecting', async () => {
    mockedGetPost.mockRejectedValueOnce({ response: { status: 500 } });

    render(<FeedPostDetailModule postId={5} />);

    const retry = await screen.findByRole('button', { name: 'Skúsiť znova' });
    expect(mockRouterPush).not.toHaveBeenCalled();

    mockedGetPost.mockResolvedValue(post);
    await userEvent.click(retry);

    expect(await screen.findByTestId('feed-post-detail')).toBeInTheDocument();
  });
});

it('leaves the permalink for the feed after the author deletes the post', async () => {
  const { deleteFeedPost } = jest.requireMock('@/lib/feedApi');
  (deleteFeedPost as jest.Mock).mockResolvedValue(undefined);
  mockedGetPost.mockResolvedValue({ ...post, can_manage: true });
  const onNavigateToFeed = jest.fn();

  render(<FeedPostDetailModule postId={9} onNavigateToFeed={onNavigateToFeed} />);
  await screen.findByTestId('feed-post-menu-trigger');

  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-post-delete'));
  const dialog = await screen.findByTestId('feed-post-delete-confirm');
  await userEvent.click(
    within(dialog).getByTestId('feed-post-delete-confirm-action'),
  );

  // Zmazaný príspevok nemá permalink čo zobraziť – rovnaká cesta späť ako
  // pri „obsah už nie je dostupný".
  await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/home'));
  expect(onNavigateToFeed).toHaveBeenCalled();
});

describe('FeedPostDetailModule – komentár z notifikácie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.get.mockReturnValue(null);
    mockedGetPost.mockResolvedValue(post);
  });

  it('scrolls to the notified comment and highlights it briefly', async () => {
    jest.useFakeTimers();
    const scrollIntoView = jest.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
      writable: true,
    });
    mockSearchParams.get.mockImplementation((key: string) =>
      key === 'comment' ? '42' : null,
    );
    mockedListComments.mockResolvedValue({
      results: [comment(41, 'Starší'), comment(42, 'Ten z notifikácie')],
      next: null,
      previous: null,
      count: 2,
    });

    render(<FeedPostDetailModule postId={9} />);
    await screen.findByText('Ten z notifikácie');

    const target = document.querySelector('[data-comment-id="42"]');
    expect(target).not.toBeNull();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(target?.className).toContain('bg-purple-100/80');

    // Zvýraznenie je len dočasné.
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(
      document.querySelector('[data-comment-id="42"]')?.className,
    ).not.toContain('bg-purple-100/80');
    jest.useRealTimers();
  });

  it('gives up after a bounded number of pages when the comment never shows', async () => {
    const scrollIntoView = jest.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
      writable: true,
    });
    mockSearchParams.get.mockImplementation((key: string) =>
      key === 'comment' ? '999' : null,
    );
    // Server stále hlási ďalšiu stránku, ale cieľ sa neobjaví – bez stropu by
    // sa stránkovalo donekonečna.
    mockedListComments.mockResolvedValue({
      results: [comment(41, 'Starší')],
      next: 'http://api.test/next',
      previous: null,
      count: 50,
    });

    render(<FeedPostDetailModule postId={9} />);
    await screen.findByText('Starší');

    await waitFor(() =>
      expect(mockedListComments.mock.calls.length).toBeGreaterThan(1),
    );
    await waitFor(() =>
      expect(mockedListComments.mock.calls.length).toBeLessThanOrEqual(21),
    );
    // Nič sa nerozbije – zoznam ostáva použiteľný, len bez skoku.
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByText('Starší')).toBeInTheDocument();
  });
});

describe('FeedPostDetailModule – komentár mimo prvej stránky', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.get.mockReturnValue(null);
    mockedGetPost.mockResolvedValue(post);
  });

  it('pages forward until it finds a freshly created comment', async () => {
    // NAJBEŽNEJŠÍ prípad notifikácie: komentáre sú zoradené vzostupne, takže
    // ten čerstvý leží na POSLEDNEJ stránke – nie na prvej.
    const scrollIntoView = jest.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
      writable: true,
    });
    mockSearchParams.get.mockImplementation((key: string) =>
      key === 'comment' ? '25' : null,
    );

    const pageOf = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => comment(from + i, `K${from + i}`));
    mockedListComments
      .mockResolvedValueOnce({
        results: pageOf(1, 10),
        next: 'http://api.test/c?after=10',
        previous: null,
        count: 25,
      })
      .mockResolvedValueOnce({
        results: pageOf(11, 10),
        next: 'http://api.test/c?after=20',
        previous: null,
        count: undefined,
      })
      .mockResolvedValue({
        results: pageOf(21, 5),
        next: null,
        previous: null,
        count: undefined,
      });

    render(<FeedPostDetailModule postId={9} />);

    // Bez donačítavania by sa zobrazila len prvá desiatka a nič by sa nestalo.
    expect(await screen.findByText('K25')).toBeInTheDocument();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(
      document.querySelector('[data-comment-id="25"]')?.className,
    ).toContain('bg-purple-100/80');
  });

  it('stops paging when it has passed the target id', async () => {
    const scrollIntoView = jest.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
      writable: true,
    });
    // Cieľ 7 medzitým zanikol – prvá stránka už siaha za neho.
    mockSearchParams.get.mockImplementation((key: string) =>
      key === 'comment' ? '7' : null,
    );
    mockedListComments.mockResolvedValue({
      results: [comment(5, 'Piaty'), comment(9, 'Deviaty')],
      next: 'http://api.test/c?after=9',
      previous: null,
      count: 20,
    });

    render(<FeedPostDetailModule postId={9} />);
    await screen.findByText('Deviaty');

    // Ďalšie stránky by nepomohli – zoznam je vzostupný, cieľ sme prešli.
    await waitFor(() => expect(mockedListComments).toHaveBeenCalledTimes(1));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

it('does not keep re-scrolling to the comment on every later poll', async () => {
  jest.useFakeTimers();
  const scrollIntoView = jest.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: scrollIntoView,
    configurable: true,
    writable: true,
  });
  mockSearchParams.get.mockImplementation((key: string) =>
    key === 'comment' ? '42' : null,
  );
  mockedGetPost.mockResolvedValue(post);
  mockedListComments.mockResolvedValue({
    results: [comment(41, 'Starší'), comment(42, 'Ten z notifikácie')],
    next: null,
    previous: null,
    count: 2,
  });

  render(<FeedPostDetailModule postId={9} />);
  await screen.findByText('Ten z notifikácie');
  await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));

  // Polling prinesie novú verziu zoznamu – pohľad sa už nesmie strhnúť späť,
  // keď si používateľ medzitým odscrolloval inam.
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });

  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

it('stops seeking and stays quiet when a page request fails', async () => {
  // Test je mimo describe s beforeEach – históriu volaní treba vyčistiť sám,
  // inak by do počtu rátal aj requesty predošlých testov.
  jest.clearAllMocks();
  const scrollIntoView = jest.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: scrollIntoView,
    configurable: true,
    writable: true,
  });
  mockSearchParams.get.mockImplementation((key: string) =>
    key === 'comment' ? '99' : null,
  );
  mockedGetPost.mockResolvedValue(post);
  mockedListComments
    .mockResolvedValueOnce({
      results: [comment(1, 'Prvý')],
      next: 'http://api.test/next',
      previous: null,
      count: 50,
    })
    // Donačítanie pri hľadaní spadne (výpadok siete).
    .mockRejectedValue(new Error('offline'));

  render(<FeedPostDetailModule postId={9} />);
  await screen.findByText('Prvý');

  // Presne JEDEN pokus o donačítanie – zlyhanie sa neopakuje dokola.
  await waitFor(() => expect(mockedListComments).toHaveBeenCalledTimes(2));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(mockedListComments).toHaveBeenCalledTimes(2);

  // Hľadanie na pozadí si používateľ nevyžiadal – žiadny chybový toast.
  expect(toast.error).not.toHaveBeenCalled();
  expect(scrollIntoView).not.toHaveBeenCalled();
  expect(screen.getByText('Prvý')).toBeInTheDocument();
});

it('drops the old highlight the moment the target is cleared', async () => {
  jest.clearAllMocks();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: jest.fn(),
    configurable: true,
    writable: true,
  });
  mockSearchParams.get.mockImplementation((key: string) =>
    key === 'comment' ? '42' : null,
  );
  mockedGetPost.mockResolvedValue(post);
  mockedListComments.mockResolvedValue({
    results: [comment(41, 'Starší'), comment(42, 'Ten z notifikácie')],
    next: null,
    previous: null,
    count: 2,
  });

  const { rerender } = render(<FeedPostDetailModule postId={9} />);
  await waitFor(() =>
    expect(document.querySelector('[data-comment-id="42"]')?.className).toContain(
      'bg-purple-100/80',
    ),
  );

  // Cieľ zmizol (napr. návrat na permalink bez ?comment). Staré zvýraznenie
  // musí zhasnúť HNEĎ – nový cieľ ho tu nemá čím prepísať, takže sa spolieha
  // výhradne na vyčistenie na začiatku efektu.
  mockSearchParams.get.mockReturnValue(null);
  rerender(<FeedPostDetailModule postId={9} />);

  await waitFor(() =>
    expect(
      document.querySelector('[data-comment-id="42"]')?.className,
    ).not.toContain('bg-purple-100/80'),
  );
});

/**
 * DOČASNÝ odtlačok HTML komentárov pod príspevkom (rozhodnutie R45, nález 333).
 *
 * Tento súbor a jeho `__snapshots__/FeedPostComments.htmlSnapshot.test.tsx.snap`
 * sú JEDINÁ VÝNIMKA z pravidla „v projekte nie sú žiadne `.snap` súbory" a
 * platia LEN počas delenia `FeedPostComments.tsx`. Posledná dávka delenia
 * (5 z 5) oba súbory ZMAŽE.
 *
 * Načo slúži: delenie súboru je čisté premiestnenie kódu, takže HTML, ktoré
 * komponent vykreslí, sa nesmie zmeniť ani o atribút. Odtlačok zachytáva
 * vykreslený DOM v desiatich stavoch (načítavanie, zlyhanie, prázdny zoznam,
 * zoznam s odpoveďami, úprava s poľom odpovede, potvrdenie zmazania,
 * donačítavanie, indikátor nových komentárov, vlákno s ďalšími odpoveďami a
 * kompaktné vykreslenie z mobilného detailu).
 *
 * Pravidlá:
 *  - Súbor ani odtlačok sa počas delenia NEUPRAVUJÚ a neaktualizujú (`-u`).
 *    Keď test po kroku delenia padne, HTML sa zmenilo a chyba je v tom kroku.
 *  - Čas je pevný (falošné hodiny) a id sú pevné, nič nie je náhodné.
 *  - Mockujú sa len vonkajšie moduly, žiadny interný súbor komentárov.
 */

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import { COMMENTS_POLL_INTERVAL_MS } from '../useFeedCommentsPolling';
import {
  installFiringIntersectionObserver,
  type FiringObserver,
} from '../feedObserverTestUtils';
import {
  listFeedPostComments,
  type FeedCommentPage,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  updateFeedPostComment: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
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

const mockIsMobile = jest.fn(() => false);
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile(),
  useIsMobileState: () => ({ isMobile: mockIsMobile(), isResolved: true }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;

/** Pevný „teraz": relatívne časy v komentároch z neho vychádzajú. */
const NOW = new Date('2026-03-15T12:00:00.000Z');

const jana = {
  id: 1,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const peter = {
  id: 2,
  display_name: 'Peter Horváth',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: 'http://api.test/avatars/peter.png',
};
const eva = {
  id: 3,
  display_name: 'Eva',
  slug: 'eva',
  user_type: 'company',
  avatar_url: null,
};

function comment(
  id: number,
  text: string,
  who: typeof jana,
  createdAt: string,
  extra: Partial<FeedPostComment> = {},
): FeedPostComment {
  return {
    id,
    text,
    author: who,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: createdAt,
    ...extra,
  } as FeedPostComment;
}

/** Zoznam: vlastný upravený komentár s dvoma odpoveďami, cudzí s tromi (jedna načítaná), starší. */
function thread(): FeedPostComment[] {
  return [
    comment(3, 'Tretí komentár', jana, '2026-03-15T11:55:00.000Z', {
      can_delete: true,
      can_edit: true,
      is_edited: true,
      likes_count: 2,
      is_liked_by_me: true,
      replies_count: 2,
      replies: [
        comment(31, 'Prvá odpoveď', peter, '2026-03-15T11:58:00.000Z', {
          parent_comment_id: 3,
          replies: undefined,
        }),
        comment(30, 'Druhá odpoveď', jana, '2026-03-15T11:50:00.000Z', {
          parent_comment_id: 3,
          can_delete: true,
          can_edit: true,
          replies: undefined,
        }),
      ],
    }),
    comment(2, 'Druhý komentár', peter, '2026-03-14T12:00:00.000Z', {
      replies_count: 3,
      replies: [
        comment(21, 'Odpoveď na druhý', eva, '2026-03-14T13:00:00.000Z', {
          parent_comment_id: 2,
          replies: undefined,
        }),
      ],
    }),
    comment(1, 'Prvý komentár', eva, '2026-03-10T12:00:00.000Z', { likes_count: 1 }),
  ];
}

function page(results: FeedPostComment[], next: string | null = null): FeedCommentPage {
  return { results, next, previous: null, count: results.length };
}

/** Nechá dobehnúť už vyriešené promise a následné prekreslenia. */
async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  });
}

/** Odtlačok celého `body`: obsah aj potvrdenie, ktoré sa kreslí mimo kontajnera. */
function fingerprint() {
  expect(document.body).toMatchSnapshot();
}

describe('FeedPostComments – dočasný odtlačok HTML (R45)', () => {
  let observer: FiringObserver;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    mockedList.mockReset();
    mockIsMobile.mockReturnValue(false);
    observer = installFiringIntersectionObserver();
  });

  afterEach(() => {
    observer.restore();
    jest.useRealTimers();
  });

  function userWithTimers() {
    return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  }

  it('loading', async () => {
    mockedList.mockImplementation(() => new Promise<FeedCommentPage>(() => undefined));

    render(<FeedPostComments postId={5} />);
    await settle();

    expect(screen.getByText('Načítavam...')).toBeInTheDocument();
    fingerprint();
  });

  it('load failure', async () => {
    mockedList.mockRejectedValue(new Error('offline'));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Komentáre sa nepodarilo načítať.');

    fingerprint();
  });

  it('empty list', async () => {
    mockedList.mockResolvedValue(page([]));

    render(<FeedPostComments postId={5} />);
    await screen.findByTestId('feed-comments-empty');

    fingerprint();
  });

  it('comments with replies, one thread expanded', async () => {
    const user = userWithTimers();
    mockedList.mockResolvedValue(page(thread()));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Tretí komentár');
    await user.click(screen.getByTestId('feed-comment-toggle-replies-3'));
    await screen.findByTestId('feed-comment-replies-3');

    fingerprint();
  });

  it('editing own comment with the reply field open', async () => {
    const user = userWithTimers();
    mockedList.mockResolvedValue(page(thread()));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Tretí komentár');
    await user.click(screen.getByTestId('feed-comment-edit-3'));
    await user.click(screen.getByTestId('feed-comment-reply-2'));
    await screen.findByTestId('feed-reply-composer');
    expect(screen.getByTestId('feed-comment-edit-composer-3')).toBeInTheDocument();

    fingerprint();
  });

  it('delete confirmation', async () => {
    const user = userWithTimers();
    mockedList.mockResolvedValue(page(thread()));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Tretí komentár');
    await user.click(screen.getByLabelText('Zmazať komentár'));
    await screen.findByTestId('feed-comment-delete-confirm');

    fingerprint();
  });

  it('loading more comments', async () => {
    mockedList
      .mockResolvedValueOnce(page(thread(), 'http://api.test/comments/?cursor=a'))
      .mockImplementationOnce(() => new Promise<FeedCommentPage>(() => undefined));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Tretí komentár');
    await act(async () => {
      observer.fireAll();
    });
    await screen.findByTestId('feed-comments-loading-more');

    fingerprint();
  });

  it('indicator of new comments', async () => {
    const fresh = comment(99, 'Nový komentár', peter, '2026-03-15T11:59:00.000Z');
    mockedList
      .mockResolvedValueOnce(page(thread()))
      .mockResolvedValue(page([fresh, ...thread()]));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Tretí komentár');
    // Používateľ číta staršie nižšie, takže novinka sa ohlási indikátorom.
    const scroller = screen.getByTestId('feed-comments-scroll');
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(scroller, 'clientHeight', { value: 400, configurable: true });
    scroller.scrollTop = 600;
    await act(async () => {
      jest.advanceTimersByTime(COMMENTS_POLL_INTERVAL_MS + 50);
    });
    await screen.findByTestId('feed-comments-new-indicator');

    fingerprint();
  });

  it('thread with replies still to load', async () => {
    const user = userWithTimers();
    mockedList.mockResolvedValue(page(thread()));

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Druhý komentár');
    await user.click(screen.getByTestId('feed-comment-toggle-replies-2'));
    await screen.findByTestId('feed-comment-replies-2');

    fingerprint();
  });

  it('compact rendering as in the mobile detail', async () => {
    const user = userWithTimers();
    mockIsMobile.mockReturnValue(true);
    mockedList.mockResolvedValue(page(thread()));

    render(
      <FeedPostComments
        postId={5}
        fillHeight
        compactComposer
        showTimestamp
        listHeader={<p>Hlavička príspevku</p>}
      />,
    );
    await screen.findByText('Tretí komentár');
    await user.click(screen.getByTestId('feed-comment-toggle-replies-3'));
    await within(screen.getByTestId('feed-comments-scroll')).findByTestId(
      'feed-comment-replies-3',
    );

    fingerprint();
  });
});

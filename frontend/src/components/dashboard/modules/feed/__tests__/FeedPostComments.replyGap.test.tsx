/**
 * Vlákno s MEDZEROU – kotva donačítania musí ísť za súvislý úsek od servera.
 *
 * Medzera vzniká, keď sa medzi náhľad a koniec zoznamu dostane novšia odpoveď
 * (vlastná odpoveď, cieľ notifikácie). Kotvenie na poslednú načítanú by ju
 * preskočilo a staršie odpovede by sa už nedali dotiahnuť.
 *
 * Vlastný súbor: scenáre sú dlhé, závisia od poradia asynchrónnych krokov
 * a v spoločnom súbore so scenármi na falošné časovače boli nestabilné.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  createFeedPostComment,
  listFeedCommentReplies,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
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

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;
const mockedReplies = listFeedCommentReplies as jest.MockedFunction<
  typeof listFeedCommentReplies
>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<
  typeof createFeedPostComment
>;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function reply(id: number, text: string, parentId: number): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: parentId,
    created_at: '2026-01-01T10:00:00Z',
  } as FeedPostComment;
}

function comment(
  id: number,
  text: string,
  replies: FeedPostComment[],
  repliesCount: number,
): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies,
    replies_count: repliesCount,
    created_at: '2026-01-01T09:00:00Z',
  } as FeedPostComment;
}

function page(results: FeedPostComment[], count: number) {
  return { results, next: null, previous: null, count };
}

beforeEach(() => {
  mockedList.mockReset();
  mockedReplies.mockReset();
  mockedCreate.mockReset();
});

describe('vlákno s medzerou', () => {
  /** Odpovede so skutočnými časmi – server radí podľa (created_at, id). */
  function timed(id: number, parentId: number): FeedPostComment {
    const minute = String(id % 100).padStart(2, '0');
    return {
      ...reply(id, `R${id}`, parentId),
      created_at: `2026-01-01T10:${minute}:00Z`,
    };
  }

  const ALL_FIFTEEN = Array.from({ length: 15 }, (_, i) => timed(101 + i, 1));
  const FIRST_TEN = ALL_FIFTEEN.slice(0, 10);
  /** 16. odpoveď – vznikla neskôr než všetkých pätnásť. */
  const SIXTEENTH = timed(116, 1);

  /** Server vracia pokračovanie za kotvou, presne ako `after` endpoint. */
  function serveAfterAnchor(thread: FeedPostComment[]) {
    mockedReplies.mockImplementation(async (_postId, _commentId, params) => {
      const after = params?.after ?? 0;
      return {
        results: thread.filter((item) => item.id > after).slice(0, 10),
        next: null,
        previous: null,
      };
    });
  }

  function renderedReplyIds(): number[] {
    const list = screen.queryByTestId('feed-comment-replies-1');
    if (!list) return [];
    return Array.from(list.querySelectorAll('[data-comment-id]')).map((node) =>
      Number(node.getAttribute('data-comment-id')),
    );
  }

  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it('fills the gap when the newest reply arrived before the older ones', async () => {
    // Presne nahlásený scenár: načítaných je prvých 10 z 15, notifikácia
    // ukazuje na 16. odpoveď.
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', FIRST_TEN, 16)], 17),
    );
    serveAfterAnchor([...ALL_FIFTEEN, SIXTEENTH]);

    render(<FeedPostComments postId={5} highlightCommentId={116} />);
    await screen.findByText('Hlavný');

    // Hľadanie je reťaz efekt → dopyt → efekt → rozbalenie; predvolená
    // sekunda na to pri paralelnom behu celej sady nestačí.
    await waitFor(() => expect(renderedReplyIds()).toContain(116), {
      timeout: 5000,
    });
    // Chronologicky celé vlákno, žiadna diera medzi 110 a 116.
    expect(renderedReplyIds()).toEqual([
      101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
      115, 116,
    ]);
    expect(mockedReplies).toHaveBeenCalledWith(5, 1, {
      after: 110,
      pageSize: 10,
    });
  });

  it('anchors past the preview, not past a locally added reply', async () => {
    // Vlastná odpoveď sa pridá lokálne a je NOVŠIA než všetko, čo server
    // poslal – medzi ňou a náhľadom teda ostane medzera (11–15).
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', FIRST_TEN, 15)], 16),
    );
    mockedCreate.mockResolvedValue(SIXTEENTH);
    serveAfterAnchor([...ALL_FIFTEEN, SIXTEENTH]);

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    const composer = await screen.findByTestId('feed-reply-composer');
    await userEvent.type(within(composer).getByRole('textbox'), 'Moja');
    await userEvent.click(screen.getByTestId('feed-reply-submit'));
    await waitFor(() => expect(renderedReplyIds()).toContain(116));

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));

    // Kotva ide za NÁHĽAD (110), nie za vlastnú odpoveď (116) – inak by sa
    // 11–15 nikdy nedotiahli a tlačidlo by vracalo prázdno.
    await waitFor(() =>
      expect(mockedReplies).toHaveBeenCalledWith(5, 1, {
        after: 110,
        pageSize: 10,
      }),
    );
    await waitFor(() =>
      expect(renderedReplyIds()).toEqual([
        101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
        115, 116,
      ]),
    );
    // Vlákno je kompletné, takže tretia akcia zmizne.
    expect(
      screen.queryByTestId('feed-comment-more-replies-1'),
    ).not.toBeInTheDocument();
  });

  it('keeps paging forward after a batch, without refetching it', async () => {
    // Po dotiahnutí dávky sa kotva posunie na jej koniec – inak by ďalší klik
    // žiadal to isté dokola a zoznam by prestal rásť.
    const thread = Array.from({ length: 25 }, (_, i) => timed(101 + i, 1));
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', thread.slice(0, 10), 25)], 26),
    );
    serveAfterAnchor(thread);

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));
    await waitFor(() => expect(renderedReplyIds()).toHaveLength(20));

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));

    await waitFor(() => expect(renderedReplyIds()).toHaveLength(25));
    expect(mockedReplies.mock.calls.map((call) => call[2]?.after)).toEqual([
      110, 120,
    ]);
  });

  it('finds a highlighted reply that sits inside the gap', async () => {
    // Cieľ (113) je STARŠÍ než lokálne pridaná odpoveď (116). Podľa poslednej
    // načítanej by vlákno vyšlo ako „už za cieľom" a hľadanie by ho vzdalo.
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', [...FIRST_TEN, SIXTEENTH], 16)], 17),
    );
    // Dávka sa uvoľní ručne: hľadanie je reťaz efektov okolo jedného dopytu
    // a bez kontroly nad jeho dokončením by test závisel od toho, v akom
    // poradí sa stihnú prekresliť medzikroky.
    let releaseBatch: ((value: unknown) => void) | null = null;
    mockedReplies.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseBatch = resolve as (value: unknown) => void;
        }) as ReturnType<typeof listFeedCommentReplies>,
    );

    render(<FeedPostComments postId={5} highlightCommentId={113} />);
    await screen.findByText('Hlavný');

    // Kotva ide za náhľad (110), nie za lokálne pridanú 116.
    await waitFor(() =>
      expect(mockedReplies).toHaveBeenCalledWith(5, 1, {
        after: 110,
        pageSize: 10,
      }),
    );

    await act(async () => {
      releaseBatch?.({
        results: [...ALL_FIFTEEN, SIXTEENTH].filter((item) => item.id > 110),
        next: null,
        previous: null,
      });
    });

    // Vlákno sa rozbalí samo a cieľ z medzery je vidieť. Rozbalenie ide cez
    // ďalší beh efektu, takže pri zaťaženom behu celej sady treba viac než
    // predvolenú sekundu (jest má na test 5 s, tu ostáva rezerva).
    await waitFor(() => expect(renderedReplyIds()).toContain(113), {
      timeout: 8000,
    });
    // Vlastný limit testu: reťaz efektov je krátka, ale pri paralelnom behu
    // celej sady sa do predvolených 5 s jestu nemusí zmestiť.
  }, 15000);

  it('keeps the cursor at the last batch, not at the highest id', async () => {
    // Kotva je POZÍCIA v poradí (created_at, id). Dávka B je chronologicky
    // ďalej, ale má NIŽŠIE id než koniec dávky A – porovnávanie čísel by sa
    // vrátilo na A a ďalší dopyt by vracal B dokola.
    const preview = { ...timed(101, 1), created_at: '2026-01-01T10:01:00Z' };
    const batchA = { ...timed(200, 1), created_at: '2026-01-01T10:02:00Z' };
    const batchB = { ...timed(150, 1), created_at: '2026-01-01T10:03:00Z' };
    mockedList.mockResolvedValue(page([comment(1, 'Hlavný', [preview], 4)], 5));
    mockedReplies
      .mockResolvedValueOnce({ results: [batchA], next: null, previous: null })
      .mockResolvedValueOnce({ results: [batchB], next: null, previous: null })
      .mockResolvedValue({ results: [], next: null, previous: null });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));
    await waitFor(() => expect(renderedReplyIds()).toEqual([101, 200]));
    expect(mockedReplies).toHaveBeenLastCalledWith(5, 1, {
      after: 101,
      pageSize: 10,
    });

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));
    await waitFor(() => expect(renderedReplyIds()).toEqual([101, 200, 150]));
    // Druhý dopyt pokračoval za koncom dávky A.
    expect(mockedReplies).toHaveBeenLastCalledWith(5, 1, {
      after: 200,
      pageSize: 10,
    });

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));

    // Tretí dopyt musí pokračovať za dávkou B (id 150), nie znova za A (200).
    await waitFor(() =>
      expect(mockedReplies).toHaveBeenLastCalledWith(5, 1, {
        after: 150,
        pageSize: 10,
      }),
    );
  });

  it('prefers the fetched cursor over a numerically higher preview id', async () => {
    // Náhľad končí na VYSOKOM id (300), donačítaná dávka má nižšie (150), ale
    // je chronologicky ďalej. Kotva musí ísť za dávku, nie za náhľad.
    const preview = { ...timed(300, 1), created_at: '2026-01-01T10:01:00Z' };
    const batch = { ...timed(150, 1), created_at: '2026-01-01T10:02:00Z' };
    mockedList.mockResolvedValue(page([comment(1, 'Hlavný', [preview], 3)], 4));
    mockedReplies
      .mockResolvedValueOnce({ results: [batch], next: null, previous: null })
      .mockResolvedValue({ results: [], next: null, previous: null });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));
    await waitFor(() => expect(renderedReplyIds()).toEqual([300, 150]));

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));

    await waitFor(() =>
      expect(mockedReplies).toHaveBeenLastCalledWith(5, 1, {
        after: 150,
        pageSize: 10,
      }),
    );
  });

  it('merges by created_at, not by id, when the two disagree', async () => {
    // Poistka pre prípad, že id nekopíruje čas vzniku (posun hodín, import).
    // Zlučuje sa lokálna vlastná odpoveď s dávkou zo servera, takže o poradí
    // rozhoduje appka – a musí použiť rovnaké pravidlo ako backend.
    const preview = { ...timed(101, 1), created_at: '2026-01-01T10:01:00Z' };
    const mine = { ...timed(200, 1), created_at: '2026-01-01T10:02:00Z' };
    const laterButLowerId = {
      ...timed(150, 1),
      created_at: '2026-01-01T10:05:00Z',
    };
    mockedList.mockResolvedValue(page([comment(1, 'Hlavný', [preview], 3)], 4));
    mockedCreate.mockResolvedValue(mine);
    mockedReplies.mockResolvedValue({
      results: [laterButLowerId],
      next: null,
      previous: null,
    });

    render(<FeedPostComments postId={5} />);
    await screen.findByText('Hlavný');
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));
    const composer = await screen.findByTestId('feed-reply-composer');
    await userEvent.type(within(composer).getByRole('textbox'), 'Moja');
    await userEvent.click(screen.getByTestId('feed-reply-submit'));
    await waitFor(() => expect(renderedReplyIds()).toEqual([101, 200]));

    await userEvent.click(screen.getByTestId('feed-comment-more-replies-1'));

    // Podľa času: 10:01, 10:02, 10:05. Podľa id by vyšlo 101, 150, 200.
    await waitFor(() => expect(renderedReplyIds()).toEqual([101, 200, 150]));
  });
});

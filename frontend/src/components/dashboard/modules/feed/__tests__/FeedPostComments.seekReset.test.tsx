/**
 * Hľadanie komentára z notifikácie pri zmene cieľa (poistka pred delením,
 * nález 333).
 *
 * Cieľ (`highlightCommentId`) sa môže počas života komponentu meniť: cieľ A,
 * potom žiadny, potom znova A alebo iný cieľ B. Každý nový cieľ je nové
 * hľadanie. Má vlastný rozpočet donačítavania stránok aj odpovedí, vlastné
 * „už vybavené", vlastné „už obnovené" a vlastný časovač zvýraznenia – nič z
 * toho sa nesmie preniesť z predošlého cieľa.
 *
 * Testy používajú len verejné rozhranie komponentu (props, DOM) a mockujú len
 * vonkajšie moduly, takže platia aj po každom kroku delenia súboru.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  listFeedCommentReplies,
  listFeedPostComments,
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
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
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

const HIGHLIGHT = 'bg-purple-100/80';
/** Ako dlho svieti zvýraznenie (HIGHLIGHT_MS v komponente). */
const HIGHLIGHT_MS = 3000;

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function comment(
  id: number,
  text: string,
  replies: FeedPostComment[] = [],
  repliesCount: number = replies.length,
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
    created_at: '2026-01-01',
  } as FeedPostComment;
}

function reply(id: number, text: string, parentId: number): FeedPostComment {
  return {
    id,
    text,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: parentId,
    created_at: '2026-01-02',
  } as FeedPostComment;
}

function page(results: FeedPostComment[]) {
  return { results, next: null, previous: null, count: results.length };
}

function highlightClass(id: number) {
  return document.querySelector(`[data-comment-id="${id}"]`)?.className ?? '';
}

/** Nechá dobehnúť už vyriešené promise a následné prekreslenia. */
async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  });
}

describe('FeedPostComments – nový cieľ hľadania', () => {
  const scrollIntoView = jest.fn();

  beforeEach(() => {
    // Falošný čas: dlhé reťaze donačítavania nezávisia od rýchlosti stroja.
    jest.useFakeTimers();
    mockedList.mockReset();
    mockedReplies.mockReset();
    scrollIntoView.mockClear();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('highlights the same target again after it was cleared', async () => {
    mockedList.mockResolvedValue(page([comment(2, 'Druhý'), comment(1, 'Prvý')]));

    const { rerender } = render(<FeedPostComments postId={5} highlightCommentId={1} />);
    await waitFor(() => expect(highlightClass(1)).toContain(HIGHLIGHT));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    // Žiadny cieľ: zvýraznenie zhasne.
    rerender(<FeedPostComments postId={5} highlightCommentId={null} />);
    await waitFor(() => expect(highlightClass(1)).not.toContain(HIGHLIGHT));

    // Ten istý cieľ znova je nové hľadanie – zvýrazní sa a doscrolluje znova.
    rerender(<FeedPostComments postId={5} highlightCommentId={1} />);
    await waitFor(() => expect(highlightClass(1)).toContain(HIGHLIGHT));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('asks the server again when the same target returns after a failed search', async () => {
    // Komentár 50 server spočiatku nepozná (notifikácia je rýchlejšia než
    // zápis), takže prvé hľadanie skončí vzdaním – po jednom obnovení.
    mockedList
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      .mockResolvedValueOnce(page([comment(1, 'Prvý')]))
      // Pri druhom hľadaní už komentár existuje.
      .mockResolvedValue(page([comment(50, 'Hľadaný'), comment(1, 'Prvý')]));

    const { rerender } = render(<FeedPostComments postId={5} highlightCommentId={50} />);
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    await settle();
    expect(document.querySelector('[data-comment-id="50"]')).toBeNull();
    expect(mockedList).toHaveBeenCalledTimes(2);

    rerender(<FeedPostComments postId={5} highlightCommentId={null} />);
    await settle();
    rerender(<FeedPostComments postId={5} highlightCommentId={50} />);

    // Nové hľadanie sa znova opýta servera a komentár nájde.
    await waitFor(() => expect(highlightClass(50)).toContain(HIGHLIGHT));
    expect(mockedList).toHaveBeenCalledTimes(3);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does not let the old highlight timer clear the new target', async () => {
    mockedList.mockResolvedValue(page([comment(2, 'B'), comment(1, 'A')]));

    const { rerender } = render(<FeedPostComments postId={5} highlightCommentId={1} />);
    await waitFor(() => expect(highlightClass(1)).toContain(HIGHLIGHT));

    // Cieľ A svieti už 2 s z 3 s.
    await act(async () => {
      jest.advanceTimersByTime(HIGHLIGHT_MS - 1000);
    });
    rerender(<FeedPostComments postId={5} highlightCommentId={2} />);
    await waitFor(() => expect(highlightClass(2)).toContain(HIGHLIGHT));
    expect(highlightClass(1)).not.toContain(HIGHLIGHT);

    // Čas, v ktorom by dobehol časovač cieľa A: cieľ B musí svietiť ďalej.
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(highlightClass(2)).toContain(HIGHLIGHT);

    // Až vlastný časovač cieľa B ho zhasne.
    await act(async () => {
      jest.advanceTimersByTime(HIGHLIGHT_MS);
    });
    expect(highlightClass(2)).not.toContain(HIGHLIGHT);
  });

  it('gives every target its own page budget', async () => {
    // Vlákno má 30 stránok po jednom komentári (id 100 až 71). Rozpočet na
    // jeden cieľ je 20 stránok: cieľ 89 stojí 11 stránok, cieľ 77 ďalších 12.
    // Spolu je to viac než 20, takže druhý cieľ nájde len ten, kto začína s
    // novým rozpočtom.
    mockedList.mockImplementation(async (_postId, params = {}) => {
      const index = params.cursorUrl
        ? Number(new URL(params.cursorUrl).searchParams.get('page'))
        : 0;
      const id = 100 - index;
      return {
        results: [comment(id, `K${id}`)],
        next: index + 1 < 30 ? `http://api.test/c?page=${index + 1}` : null,
        previous: null,
        count: 30,
      };
    });

    const { rerender } = render(<FeedPostComments postId={5} highlightCommentId={89} />);
    await waitFor(() => expect(highlightClass(89)).toContain(HIGHLIGHT));
    await settle();

    rerender(<FeedPostComments postId={5} highlightCommentId={null} />);
    await settle();
    rerender(<FeedPostComments postId={5} highlightCommentId={77} />);

    await waitFor(() => expect(highlightClass(77)).toContain(HIGHLIGHT));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('gives every target its own reply budget', async () => {
    // Komentár 1 má 40 odpovedí, v náhľade je len najnovšia (500). Server dáva
    // po jednej smerom k starším. Cieľ 489 stojí 11 dávok, cieľ 477 ďalších 12;
    // rozpočet na jeden cieľ je 20 dávok, takže druhý cieľ nájde len ten, kto
    // začína s novým rozpočtom.
    mockedList.mockResolvedValue(
      page([comment(1, 'Hlavný', [reply(500, 'R500', 1)], 40)]),
    );
    mockedReplies.mockImplementation(async (_postId, _parentId, params = {}) => {
      const id = (params.after ?? 501) - 1;
      return { results: [reply(id, `R${id}`, 1)], next: null, previous: null };
    });

    const { rerender } = render(<FeedPostComments postId={5} highlightCommentId={489} />);
    await waitFor(() => expect(highlightClass(489)).toContain(HIGHLIGHT));
    await settle();

    rerender(<FeedPostComments postId={5} highlightCommentId={null} />);
    await settle();
    rerender(<FeedPostComments postId={5} highlightCommentId={477} />);

    await waitFor(() => expect(highlightClass(477)).toContain(HIGHLIGHT));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});

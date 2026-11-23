/**
 * Výška komentárov: `fillHeight` a `flexFill` (nález 363, K57 krok 4).
 *
 * Jednostĺpcové okno detailu má len strop výšky (`max-h`), takže sa v ňom percentuálna výška (`h-full`) nevyhodnotí:
 * zoznam komentárov by ostal vysoký ako všetky komentáre, neposúval by sa a pole na komentár by vypadlo pod okraj okna.
 * Komponent preto dostal vlastnosť `flexFill`, ktorá odovzdáva výšku flexom celým reťazcom (koreň, obal zoznamu,
 * posuvný rámik). Ostatné miesta (dvojstĺpcové okno, mobilný detail, panel nad fotkou) ostávajú pri `fillHeight`
 * s `h-full`.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy koreňa, obalu zoznamu a posuvného rámika.
 */

import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
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

const autor = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const KOMENTAR = {
  id: 1,
  text: 'Ahoj',
  author: autor,
  can_delete: false,
  likes_count: 0,
  is_liked_by_me: false,
  parent_comment_id: null,
  replies: [],
  replies_count: 0,
  created_at: '2026-01-01',
} as FeedPostComment;

beforeEach(() => {
  mockedList.mockReset();
  mockedList.mockResolvedValue({
    results: [KOMENTAR],
    next: null,
    previous: null,
    count: 1,
  } as FeedCommentPage);
});

/** Vykreslí komentáre, počká na naplnenie zoznamu a vráti koreň, obal zoznamu a posuvný rámik. */
async function vykresli(vlastnosti: Partial<ComponentProps<typeof FeedPostComments>> = {}) {
  render(<FeedPostComments postId={7} {...vlastnosti} />);
  await screen.findByText('Ahoj');
  const zoznam = screen.getByTestId('feed-comments-scroll');
  return {
    koren: screen.getByTestId('feed-post-comments'),
    obal: zoznam.parentElement as HTMLElement,
    zoznam,
  };
}

describe('výška zoznamu komentárov', () => {
  it('bez fillHeight má zoznam strop výšky a flexFill sa neuplatní', async () => {
    const { koren, obal, zoznam } = await vykresli({ flexFill: true });

    expect(zoznam).toHaveClass('max-h-[min(26rem,60dvh)]');
    expect(zoznam).not.toHaveClass('h-full');
    expect(zoznam).not.toHaveClass('flex-1');
    expect(obal).not.toHaveClass('flex-1');
    expect(koren).not.toHaveClass('flex');
    expect(koren).not.toHaveClass('flex-1');
  });

  it.each([
    ['len fillHeight', { fillHeight: true }],
    [
      'fillHeight s vlastnosťami mobilného detailu a panela nad fotkou',
      { fillHeight: true, showTimestamp: true, compactComposer: true },
    ],
  ])('%s: percentuálna výška ako doteraz', async (_nazov, vlastnosti) => {
    const { koren, obal, zoznam } = await vykresli(vlastnosti);

    expect(koren).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col');
    expect(koren).not.toHaveClass('flex-1');
    expect(obal).toHaveClass('relative', 'min-h-0', 'flex-1');
    expect(obal).not.toHaveClass('flex');
    expect(obal).not.toHaveClass('flex-col');
    expect(zoznam).toHaveClass('h-full');
    expect(zoznam).not.toHaveClass('flex-1');
    expect(zoznam).not.toHaveClass('min-h-0');
    expect(zoznam).not.toHaveClass('max-h-[min(26rem,60dvh)]');
  });

  it('fillHeight s flexFill odovzdáva výšku flexom celým reťazcom', async () => {
    const { koren, obal, zoznam } = await vykresli({
      fillHeight: true,
      flexFill: true,
    });

    expect(koren).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
    expect(koren).not.toHaveClass('h-full');
    expect(obal).toHaveClass('relative', 'flex', 'min-h-0', 'flex-1', 'flex-col');
    expect(zoznam).toHaveClass('min-h-0', 'flex-1');
    expect(zoznam).not.toHaveClass('h-full');
    expect(zoznam).not.toHaveClass('max-h-[min(26rem,60dvh)]');
  });

  it('s flexFill sa zoznam stále posúva, má vlastný scrollbar a dá sa dostať Tabom', async () => {
    const { zoznam } = await vykresli({ fillHeight: true, flexFill: true });

    expect(zoznam).toHaveClass(
      'overflow-y-auto',
      'subtle-scrollbar',
      'overscroll-contain',
    );
    expect(zoznam).toHaveAttribute('tabindex', '0');
    expect(zoznam).toHaveAttribute('role', 'region');
  });

  it('pole na komentár ostáva v koreni mimo posuvného zoznamu aj s flexFill', async () => {
    const { koren, zoznam } = await vykresli({ fillHeight: true, flexFill: true });

    const pole = screen.getByLabelText('Napíš komentár...');
    expect(koren).toContainElement(pole);
    expect(zoznam).not.toContainElement(pole);
  });
});

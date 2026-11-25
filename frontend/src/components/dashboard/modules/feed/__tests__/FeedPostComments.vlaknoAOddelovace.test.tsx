/**
 * Zoznam komentárov v plochom vzhľade (R52, nález 261, skupina 7) a vodorovné posúvanie zoznamu (nález 369).
 *
 * Medzi komentármi najvyššej úrovne je jemný oddeľovač (pred prvým nie je) a začína pri texte, nie pri avatare. Rozbalené
 * odpovede sú odsadené o šírku avatara (44 px) a zvislá čiara z avatara komentára vedie popri nich; zbalené vlákno ani
 * komentár bez odpovedí čiaru nemá. Pole na odpoveď je pod vláknom a je odsadené rovnako ako odpovede. Posuvný box so
 * zoznamom sa nesmie posúvať vodorovne.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy a poloha prvkov v strome; skutočné rozmery sa merali v Chromiu.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import FeedCommentsLoadingMore from '../FeedCommentsLoadingMore';
import FeedRepliesAutoLoader from '../FeedRepliesAutoLoader';
import { listFeedPostComments, type FeedPostComment } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
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

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;

const autor = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function komentar(id: number, text: string, odpovede: FeedPostComment[] = []): FeedPostComment {
  return {
    id,
    text,
    author: autor,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: odpovede,
    replies_count: odpovede.length,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as FeedPostComment;
}

function odpoved(id: number, text: string, rodic: number): FeedPostComment {
  return {
    id,
    text,
    author: autor,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: rodic,
    created_at: '2026-01-02T10:00:00Z',
  } as unknown as FeedPostComment;
}

function strana(results: FeedPostComment[]) {
  return { results, next: null, previous: null, count: results.length };
}

async function vykresli(komentare: FeedPostComment[]) {
  mockedList.mockResolvedValue(strana(komentare));
  render(<FeedPostComments postId={5} fillHeight />);
  await screen.findByText(komentare[0].text);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('oddeľovače medzi komentármi najvyššej úrovne', () => {
  it('s tromi komentármi sú dva oddeľovače a pred prvým komentárom žiadny', async () => {
    await vykresli([komentar(1, 'Prvý'), komentar(2, 'Druhý'), komentar(3, 'Tretí')]);

    const polozky = screen.getAllByRole('listitem').filter((li) => li.querySelector('[data-comment-id]'));
    expect(screen.getAllByTestId('feed-comment-divider')).toHaveLength(2);
    expect(polozky[0].querySelector('[data-testid="feed-comment-divider"]')).toBeNull();
    expect(polozky[1].firstElementChild).toHaveAttribute('data-testid', 'feed-comment-divider');
    expect(polozky[2].firstElementChild).toHaveAttribute('data-testid', 'feed-comment-divider');
  });

  it('s jediným komentárom oddeľovač nie je', async () => {
    await vykresli([komentar(1, 'Jediný')]);

    expect(screen.queryByTestId('feed-comment-divider')).toBeNull();
  });

  it('oddeľovač je jemná čiara od textu, nie od avatara: odsadený o 44 px, len ozdoba', async () => {
    await vykresli([komentar(1, 'Prvý'), komentar(2, 'Druhý')]);

    const oddelovac = screen.getByTestId('feed-comment-divider');
    expect(oddelovac).toHaveClass('ml-11', 'border-t', 'border-gray-200/70', 'dark:border-white/10');
    expect(oddelovac).toHaveAttribute('aria-hidden', 'true');
  });

  it('komentáre najvyššej úrovne majú medzi sebou 16 px', async () => {
    await vykresli([komentar(1, 'Prvý'), komentar(2, 'Druhý')]);

    const zoznam = screen.getByTestId('feed-comment-author-1').closest('ul') as HTMLElement;
    expect(zoznam).toHaveClass('space-y-4');
  });
});

describe('vlákno s odpoveďami a zvislá čiara z avatara', () => {
  const vlakno = () => [
    komentar(1, 'S odpoveďami', [odpoved(11, 'Prvá odpoveď', 1), odpoved(12, 'Druhá odpoveď', 1)]),
    komentar(2, 'Bez odpovedí'),
  ];

  it('zbalené vlákno čiaru nemá, po rozbalení sa objaví a po zbalení zmizne', async () => {
    await vykresli(vlakno());
    expect(screen.queryByTestId('feed-comment-thread-line-1')).toBeNull();

    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
    expect(await screen.findByTestId('feed-comment-thread-line-1')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
    await waitFor(() => expect(screen.queryByTestId('feed-comment-thread-line-1')).toBeNull());
  });

  it('komentár bez odpovedí čiaru nemá ani pri rozbalených odpovediach iných komentárov', async () => {
    await vykresli(vlakno());
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    expect(screen.queryByTestId('feed-comment-thread-line-2')).toBeNull();
  });

  it('čiara je v osi avatara (17 px zľava, 2 px široká), začína pod avatarom a je len ozdoba', async () => {
    await vykresli(vlakno());
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    const ciara = screen.getByTestId('feed-comment-thread-line-1');
    expect(ciara).toHaveClass('absolute', 'left-[17px]', 'top-9', 'bottom-6', 'w-0.5');
    expect(ciara).toHaveClass('bg-gray-200', 'dark:bg-white/[0.14]');
    expect(ciara).toHaveClass('pointer-events-none');
    expect(ciara).toHaveAttribute('aria-hidden', 'true');
  });

  it('čiara a odpovede sú v jednom vlákne s komentárom, ktoré je vzťažná plocha čiary', async () => {
    await vykresli(vlakno());
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    const ciara = screen.getByTestId('feed-comment-thread-line-1');
    const odpovede = screen.getByTestId('feed-comment-replies-1');
    const komentarKoren = document.querySelector('[data-comment-id="1"]') as HTMLElement;
    expect(ciara.parentElement).toHaveClass('relative');
    expect(ciara.parentElement).toContainElement(odpovede);
    expect(ciara.parentElement).toContainElement(komentarKoren);
  });

  it('odpovede sú odsadené o 44 px a bez starej sivej čiary na okraji zoznamu', async () => {
    await vykresli(vlakno());
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));

    const odpovede = screen.getByTestId('feed-comment-replies-1');
    expect(odpovede).toHaveClass('ml-11', 'mt-1', 'space-y-2');
    expect(odpovede).not.toHaveClass('border-l-2');
    expect(odpovede).not.toHaveClass('pl-3');
    expect(within(odpovede).getAllByRole('listitem')).toHaveLength(2);
  });

  it('pole na odpoveď je pod vláknom (mimo plochy čiary) a odsadené rovnako ako odpovede', async () => {
    await vykresli(vlakno());
    await userEvent.click(screen.getByTestId('feed-comment-toggle-replies-1'));
    await userEvent.click(screen.getByTestId('feed-comment-reply-1'));

    const pole = await screen.findByTestId('feed-reply-composer');
    const obal = pole.parentElement as HTMLElement;
    expect(obal).toHaveClass('ml-11');
    expect(obal).not.toHaveClass('pl-3');
    const ciara = screen.getByTestId('feed-comment-thread-line-1');
    expect(ciara.parentElement).not.toContainElement(pole);
  });
});

describe('vodorovné posúvanie zoznamu (nález 369)', () => {
  it('posuvný box so zoznamom má `overflow-x-hidden`', async () => {
    await vykresli([komentar(1, 'Prvý')]);

    const box = screen.getByTestId('feed-comments-scroll');
    expect(box).toHaveClass('overflow-y-auto', 'overflow-x-hidden');
  });
});

describe('kostry načítania sú ploché ako komentáre', () => {
  it('kostra donačítavania komentárov: avatar 36 px a dva riadky, bez sivej bubliny', () => {
    const { container } = render(<FeedCommentsLoadingMore />);

    const prvky = Array.from(container.querySelectorAll('*'));
    expect(prvky.some((el) => el.classList.contains('bg-gray-100'))).toBe(false);
    expect(prvky.some((el) => el.classList.contains('rounded-2xl'))).toBe(false);
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('li > div')).toHaveClass('h-9', 'w-9', 'rounded-full');
  });

  it('kostra donačítavania odpovedí: avatar 28 px, odsadenie 44 px a bez sivej bubliny', () => {
    const { container } = render(
      <FeedRepliesAutoLoader
        enabled
        paused={false}
        loading
        root={{ current: null }}
        onLoadMore={jest.fn()}
        testId="slucka"
      />,
    );

    const koren = container.firstElementChild as HTMLElement;
    expect(koren).toHaveClass('ml-11');
    const prvky = Array.from(container.querySelectorAll('*'));
    expect(prvky.some((el) => el.classList.contains('bg-gray-100'))).toBe(false);
    expect(prvky.some((el) => el.classList.contains('rounded-2xl'))).toBe(false);
    expect(screen.getByTestId('slucka-loading').querySelector('li > div')).toHaveClass('h-7', 'w-7');
  });
});

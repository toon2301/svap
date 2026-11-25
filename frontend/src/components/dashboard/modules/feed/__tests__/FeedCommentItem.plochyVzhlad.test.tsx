/**
 * Plochý vzhľad jedného komentára a odpovede (R52, nález 261, skupina 7).
 *
 * Komentár nemá sivú bublinu: vedľa avatara je stĺpec s menom, textom a pod nimi riadkom akcií (čas, lajk, „Upraviť“,
 * „Odpovedať“). Kôš je vpravo hore. Bublinka s plným fialovým srdiečkom (R51) stojí úplne vpravo v riadku akcií, ukáže sa
 * len pri aspoň jednom lajku (aj keď ho dal niekto iný) a otvára zoznam lajkujúcich; číslo pri srdiečku je len text.
 * „Zobraziť / Skryť odpovede“ je samostatný jemný riadok s čiarkou pod riadkom akcií. Avatar vrcholového komentára má 36 px,
 * avatar odpovede 28 px.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy a poloha prvkov v strome; skutočné rozmery sa merali v Chromiu.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedCommentItem from '../FeedCommentItem';
import type { FeedPostComment } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
  listFeedPostLikers: jest.fn(),
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

const { listFeedCommentLikers } = jest.requireMock('@/lib/feedApi') as {
  listFeedCommentLikers: jest.Mock;
};

const autor = {
  id: 1,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function komentar(id: number, over: Partial<FeedPostComment> = {}): FeedPostComment {
  return {
    id,
    text: 'Takto môže vyzerať komentár.',
    author: autor,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01T10:00:00Z',
    ...over,
  } as unknown as FeedPostComment;
}

type Moznosti = {
  odpoved?: boolean;
  rozbalene?: number[];
  zvyraznene?: number | null;
  casy?: boolean;
};

function vykresli(comment: FeedPostComment, moznosti: Moznosti = {}) {
  return render(
    <FeedCommentItem
      comment={comment}
      isReply={moznosti.odpoved ?? false}
      postId={5}
      highlighted={moznosti.zvyraznene ?? null}
      editingComment={null}
      editSubmitting={false}
      expandedReplies={new Set(moznosti.rozbalene ?? [])}
      showTimestamp={moznosti.casy ?? true}
      t={(_kluc: string, nahradny?: string) => nahradny ?? ''}
      locale="sk"
      openCommentAuthorProfile={jest.fn()}
      setEditingComment={jest.fn()}
      handleSubmitEdit={jest.fn()}
      setReplyingTo={jest.fn()}
      setReplyText={jest.fn()}
      toggleReplies={jest.fn()}
      setPendingDelete={jest.fn()}
    />,
  );
}

/** Riadok akcií: rodič tlačidla „Odpovedať“. */
function riadokAkcii(id: number): HTMLElement {
  return screen.getByTestId(`feed-comment-reply-${id}`).parentElement as HTMLElement;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('komentár nemá sivú bublinu', () => {
  it.each([
    ['vrcholový komentár', false],
    ['odpoveď', true],
  ])('%s: žiadny prvok nemá triedu sivého podkladu bubliny', (_nazov, odpoved) => {
    const { container } = vykresli(
      komentar(7, { can_delete: true, can_edit: true, likes_count: 2 }),
      { odpoved },
    );

    const prvky = Array.from(container.querySelectorAll('*'));
    expect(prvky.some((el) => el.classList.contains('bg-gray-100'))).toBe(false);
    expect(prvky.some((el) => el.classList.contains('rounded-2xl'))).toBe(false);
    expect(prvky.some((el) => el.classList.contains('dark:bg-gray-800/60'))).toBe(false);
  });

  it('meno, text a riadok akcií sú v jednom stĺpci vedľa avatara', () => {
    vykresli(komentar(7));

    const stlpec = screen.getByTestId('feed-comment-author-7').parentElement as HTMLElement;
    expect(stlpec).toContainElement(screen.getByText('Takto môže vyzerať komentár.'));
    expect(stlpec).toContainElement(riadokAkcii(7));
    expect(stlpec.previousElementSibling).toBe(screen.getByTestId('feed-comment-avatar-7'));
  });
});

describe('veľkosti avatara a písma', () => {
  it('avatar vrcholového komentára má 36 px, avatar odpovede 28 px', () => {
    const { unmount } = vykresli(komentar(7));
    const velky = screen.getByTestId('feed-comment-avatar-7').firstElementChild as HTMLElement;
    expect(velky).toHaveClass('w-9', 'h-9');
    expect(velky).not.toHaveClass('w-7');
    unmount();

    vykresli(komentar(8), { odpoved: true });
    const maly = screen.getByTestId('feed-comment-avatar-8').firstElementChild as HTMLElement;
    expect(maly).toHaveClass('w-7', 'h-7');
    expect(maly).not.toHaveClass('w-9');
  });

  it('meno má 13 px, text vrcholového komentára 14 px a text odpovede 13 px', () => {
    const { unmount } = vykresli(komentar(7));
    expect(screen.getByTestId('feed-comment-author-7')).toHaveClass('text-[13px]', 'font-semibold');
    expect(screen.getByText('Takto môže vyzerať komentár.')).toHaveClass('text-sm');
    expect(screen.getByText('Takto môže vyzerať komentár.')).not.toHaveClass('text-[13px]');
    unmount();

    vykresli(komentar(8), { odpoved: true });
    expect(screen.getByTestId('feed-comment-author-8')).toHaveClass('text-[13px]');
    expect(screen.getByText('Takto môže vyzerať komentár.')).toHaveClass('text-[13px]');
    expect(screen.getByText('Takto môže vyzerať komentár.')).not.toHaveClass('text-sm');
  });

  it('malé tlačidlá majú `min-h-0`, aby ich globálne `button { min-height: 36px }` nenatiahlo', () => {
    vykresli(
      komentar(7, { can_delete: true, can_edit: true, likes_count: 1, replies_count: 2 }),
    );

    for (const testId of [
      'feed-comment-avatar-7',
      'feed-comment-author-7',
      'feed-comment-like-7',
      'feed-comment-edit-7',
      'feed-comment-reply-7',
      'feed-comment-toggle-replies-7',
      'feed-comment-like-bubble-7',
    ]) {
      expect(screen.getByTestId(testId)).toHaveClass('min-h-0');
    }
    expect(screen.getByRole('button', { name: 'Zmazať komentár' })).toHaveClass('min-h-0');
  });
});

describe('bublinka s lajkom', () => {
  it('pri nule lajkov nie je ani bublinka, ani číslo', () => {
    vykresli(komentar(7, { likes_count: 0 }));

    expect(screen.queryByTestId('feed-comment-like-bubble-7')).toBeNull();
    expect(screen.queryByTestId('feed-comment-like-count-7')).toBeNull();
  });

  it('pri aspoň jednom lajku je bublinka aj vtedy, keď ho dal niekto iný', () => {
    vykresli(komentar(7, { likes_count: 1, is_liked_by_me: false }));

    expect(screen.getByTestId('feed-comment-like-bubble-7')).toBeInTheDocument();
    expect(screen.getByTestId('feed-comment-like-count-7')).toHaveTextContent('1');
  });

  it('bublinka stojí úplne vpravo v riadku akcií, ako jeho priamy potomok', () => {
    vykresli(komentar(7, { likes_count: 3 }));

    const bublinka = screen.getByTestId('feed-comment-like-bubble-7');
    expect(bublinka.parentElement).toBe(riadokAkcii(7));
    expect(bublinka).toHaveClass('order-last', 'ml-auto');
  });

  it('bublinka je aj pri odpovedi', () => {
    vykresli(komentar(8, { likes_count: 1, parent_comment_id: 7 }), { odpoved: true });

    expect(screen.getByTestId('feed-comment-like-bubble-8')).toBeInTheDocument();
  });

  it('bublinka má dotykový cieľ 32 px a viditeľný kruh 24 px s plným srdiečkom', () => {
    vykresli(komentar(7, { likes_count: 2 }));

    const bublinka = screen.getByTestId('feed-comment-like-bubble-7');
    expect(bublinka).toHaveClass('h-8', 'w-8');
    const kruh = bublinka.firstElementChild as HTMLElement;
    expect(kruh).toHaveClass('h-6', 'w-6', 'rounded-full');
    expect(kruh.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
  });

  it('farby bublinky podľa R51: svetlý režim fialová, tmavý režim sivá s bledým srdiečkom', () => {
    vykresli(komentar(7, { likes_count: 2 }));

    const kruh = screen.getByTestId('feed-comment-like-bubble-7').firstElementChild as HTMLElement;
    expect(kruh).toHaveClass('bg-violet-100', 'border-violet-200', 'text-purple-600');
    expect(kruh).toHaveClass('dark:bg-[#343740]', 'dark:text-purple-300');
  });

  it('farba srdiečka v bublinke sa nemení podľa toho, či lajk dal prihlásený používateľ', () => {
    const { unmount } = vykresli(komentar(7, { likes_count: 2, is_liked_by_me: true }));
    const kruhA = screen.getByTestId('feed-comment-like-bubble-7').firstElementChild as HTMLElement;
    const triedyA = kruhA.className;
    unmount();

    vykresli(komentar(7, { likes_count: 2, is_liked_by_me: false }));
    const kruhB = screen.getByTestId('feed-comment-like-bubble-7').firstElementChild as HTMLElement;

    expect(kruhB.className).toBe(triedyA);
  });

  it('bublinka má prístupný názov so zdrojom textu „Páči sa im to“ a počtom', () => {
    vykresli(komentar(7, { likes_count: 4 }));

    expect(screen.getByTestId('feed-comment-like-bubble-7')).toHaveAccessibleName('Páči sa im to: 4');
  });

  it('ťuk na bublinku otvorí zoznam lajkujúcich komentára', async () => {
    listFeedCommentLikers.mockResolvedValue({
      results: [{ id: 3, display_name: 'Peter', slug: 'peter', user_type: 'individual', avatar_url: null }],
      next: null,
      previous: null,
      count: 1,
    });
    vykresli(komentar(7, { likes_count: 1 }));

    await userEvent.click(screen.getByTestId('feed-comment-like-bubble-7'));

    expect(await screen.findByTestId('feed-likers-dialog')).toBeInTheDocument();
    expect(listFeedCommentLikers).toHaveBeenCalledWith(5, 7, expect.anything());
  });

  it('číslo pri srdiečku je len text a nič neotvára', async () => {
    vykresli(komentar(7, { likes_count: 3 }));

    const cislo = screen.getByTestId('feed-comment-like-count-7');
    expect(cislo.tagName).toBe('SPAN');
    await userEvent.click(cislo);

    expect(screen.queryByTestId('feed-likers-dialog')).toBeNull();
    expect(listFeedCommentLikers).not.toHaveBeenCalled();
  });
});

describe('„Zobraziť / Skryť odpovede“', () => {
  it('je samostatný riadok pod riadkom akcií, nie jeho súčasť', () => {
    vykresli(komentar(7, { replies_count: 3 }));

    const prepinac = screen.getByTestId('feed-comment-toggle-replies-7');
    expect(prepinac.parentElement).toBe(riadokAkcii(7).parentElement);
    expect(prepinac.parentElement).not.toBe(riadokAkcii(7));
    expect(riadokAkcii(7).nextElementSibling).toBe(prepinac);
  });

  it('zbalené vlákno ukáže počet a rozbalené „Skryť odpovede“, vždy s jemnou čiarkou', () => {
    const { unmount } = vykresli(komentar(7, { replies_count: 3 }));
    const zbaleny = screen.getByTestId('feed-comment-toggle-replies-7');
    expect(zbaleny).toHaveTextContent('Zobraziť odpovede (3)');
    expect(zbaleny).toHaveAttribute('aria-expanded', 'false');
    const ciarka = zbaleny.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(ciarka).toHaveClass('h-px', 'w-5');
    unmount();

    vykresli(komentar(7, { replies_count: 3 }), { rozbalene: [7] });
    const rozbaleny = screen.getByTestId('feed-comment-toggle-replies-7');
    expect(rozbaleny).toHaveTextContent('Skryť odpovede');
    expect(rozbaleny).toHaveAttribute('aria-expanded', 'true');
    expect(rozbaleny.querySelector('span[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('nie je sivá pilulka: bez podkladu a bez zaoblenia celého tlačidla', () => {
    vykresli(komentar(7, { replies_count: 3 }));

    const prepinac = screen.getByTestId('feed-comment-toggle-replies-7');
    expect(prepinac).not.toHaveClass('rounded-full');
    expect(prepinac.className).not.toMatch(/(^|\s)bg-/);
    expect(prepinac.className).not.toContain('hover:bg-');
  });

  it('pri odpovedi ani pri komentári bez odpovedí sa neukáže', () => {
    const { unmount } = vykresli(komentar(8, { replies_count: 2 }), { odpoved: true });
    expect(screen.queryByTestId('feed-comment-toggle-replies-8')).toBeNull();
    unmount();

    vykresli(komentar(9, { replies_count: 0 }));
    expect(screen.queryByTestId('feed-comment-toggle-replies-9')).toBeNull();
  });
});

describe('kôš', () => {
  it('je vpravo hore a meno pri ňom končí skôr, aby sa neprekrývali', () => {
    vykresli(komentar(7, { can_delete: true }));

    const kos = screen.getByRole('button', { name: 'Zmazať komentár' });
    expect(kos).toHaveClass('absolute', 'right-0', '-top-2', 'h-8', 'w-8');
    expect(screen.getByTestId('feed-comment-author-7')).toHaveClass('max-w-[calc(100%-2.25rem)]');
  });

  it('bez práva na zmazanie nie je kôš a meno má celú šírku', () => {
    vykresli(komentar(7, { can_delete: false }));

    expect(screen.queryByRole('button', { name: 'Zmazať komentár' })).toBeNull();
    expect(screen.getByTestId('feed-comment-author-7')).toHaveClass('max-w-full');
    expect(screen.getByTestId('feed-comment-author-7')).not.toHaveClass('max-w-[calc(100%-2.25rem)]');
  });

  it('kôš stojí vedľa mena, nie vedľa textu: text ide na celú šírku stĺpca', () => {
    vykresli(komentar(7, { can_delete: true }));

    const stlpec = screen.getByTestId('feed-comment-author-7').parentElement as HTMLElement;
    const kos = screen.getByRole('button', { name: 'Zmazať komentár' });
    expect(kos.parentElement).toBe(stlpec);
    expect(screen.getByText('Takto môže vyzerať komentár.').parentElement).toBe(stlpec);
    expect(stlpec).toHaveClass('relative');
  });
});

describe('riadok akcií', () => {
  it('na počítači nemá čas, ale lajk a „Odpovedať“ ostávajú', () => {
    vykresli(komentar(7), { casy: false });

    expect(screen.queryByTestId('feed-comment-time-7')).toBeNull();
    expect(screen.getByTestId('feed-comment-like-7')).toBeInTheDocument();
    expect(screen.getByTestId('feed-comment-reply-7')).toBeInTheDocument();
  });

  it('na mobile má čas pred lajkom', () => {
    vykresli(komentar(7), { casy: true });

    const cas = screen.getByTestId('feed-comment-time-7');
    expect(cas.parentElement).toBe(riadokAkcii(7));
    expect(cas.compareDocumentPosition(screen.getByTestId('feed-comment-like-7'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('odpoveď nemá „Odpovedať“', () => {
    vykresli(komentar(8, { parent_comment_id: 7, can_edit: true }), { odpoved: true });

    expect(screen.queryByTestId('feed-comment-reply-8')).toBeNull();
    expect(screen.getByTestId('feed-comment-edit-8')).toBeInTheDocument();
  });

  it('riadok má najmenšiu výšku 24 px, takže sa pri prvom lajku (bublinka) nepohne', () => {
    vykresli(komentar(7, { likes_count: 1 }));

    expect(riadokAkcii(7)).toHaveClass('min-h-6');
    expect(screen.getByTestId('feed-comment-like-bubble-7')).toHaveClass('-my-1');
  });
});

describe('zvýraznený komentár', () => {
  it('dostane fialový podklad, v tmavom režime tmavofialový', () => {
    const { container } = vykresli(komentar(7), { zvyraznene: 7 });

    const koren = container.querySelector('[data-comment-id="7"]') as HTMLElement;
    expect(koren).toHaveClass('bg-purple-100/80', 'dark:bg-purple-900/30');
  });

  it('nemá odsadenie ani záporný okraj: obsah sa nepohne a podklad nepresahuje za okraj posuvného boxu', () => {
    const { container } = vykresli(komentar(7), { zvyraznene: 7 });

    const koren = container.querySelector('[data-comment-id="7"]') as HTMLElement;
    for (const trieda of ['-mx-2', '-my-1', 'px-2', 'py-1', 'p-2']) {
      expect(koren).not.toHaveClass(trieda);
    }
  });

  it('nezvýraznený komentár fialový podklad nemá', () => {
    const { container } = vykresli(komentar(7), { zvyraznene: 99 });

    const koren = container.querySelector('[data-comment-id="7"]') as HTMLElement;
    expect(koren).not.toHaveClass('bg-purple-100/80');
    expect(koren).not.toHaveClass('dark:bg-purple-900/30');
  });
});

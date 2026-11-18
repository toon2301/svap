/**
 * Čisté funkcie komentárov: poradie, zlučovanie so serverom a počty odpovedí
 * (nález 333, delenie `FeedPostComments.tsx`, krok 1).
 *
 * Funkcie nemajú závislosti, takže sa skúšajú priamo, bez vykresľovania a bez
 * mockov. Doterajšie testy ich vykonávali len cez komponent a niektoré vetvy
 * (prázdny náhľad odpovedí, prázdna dávka, prázdna odpoveď servera) nevykonal
 * žiadny.
 */

import {
  REPLIES_PREVIEW_LIMIT,
  compareNewestFirst,
  flattenComments,
  isOlderThan,
  mergeComments,
  mergeReplyBatch,
  mergeReplyPreview,
  repliesTotal,
  sortedNewestFirst,
} from '../feedCommentsLogic';
import type { FeedPostComment } from '@/lib/feedApi';

const author = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

/** Komentár s pevným časom: `day` je deň v januári 2026, takže poradie je vidieť z čísla. */
function comment(
  id: number,
  day: number,
  extra: Partial<FeedPostComment> = {},
): FeedPostComment {
  return {
    id,
    text: `K${id}`,
    author,
    can_delete: false,
    likes_count: 0,
    is_liked_by_me: false,
    created_at: `2026-01-${String(day).padStart(2, '0')}T10:00:00Z`,
    ...extra,
  };
}

const ids = (list: FeedPostComment[]) => list.map((item) => item.id);

describe('compareNewestFirst', () => {
  it('puts the newer comment first', () => {
    const list = [comment(1, 1), comment(2, 2)].sort(compareNewestFirst);
    expect(ids(list)).toEqual([2, 1]);
  });

  it('orders by time before id', () => {
    // Staršiemu komentáru s vyšším id nepatrí prvé miesto.
    const list = [comment(9, 1), comment(1, 2)].sort(compareNewestFirst);
    expect(ids(list)).toEqual([1, 9]);
  });

  it('breaks a tie in time with the higher id first', () => {
    const list = [comment(5, 3), comment(7, 3)].sort(compareNewestFirst);
    expect(ids(list)).toEqual([7, 5]);
  });

  it('treats a comment as equal to itself', () => {
    const item = comment(4, 4);
    expect(compareNewestFirst(item, item)).toBe(0);
  });
});

describe('isOlderThan', () => {
  it('is true for an older comment and false for a newer one', () => {
    expect(isOlderThan(comment(1, 1), comment(2, 2))).toBe(true);
    expect(isOlderThan(comment(2, 2), comment(1, 1))).toBe(false);
  });

  it('uses the id when the time is the same', () => {
    expect(isOlderThan(comment(3, 5), comment(4, 5))).toBe(true);
    expect(isOlderThan(comment(4, 5), comment(3, 5))).toBe(false);
  });

  it('is false for the same comment', () => {
    const item = comment(6, 6);
    expect(isOlderThan(item, item)).toBe(false);
  });
});

describe('sortedNewestFirst', () => {
  it('sorts the values of a map, not in the order they were added', () => {
    const byId = new Map<number, FeedPostComment>([
      [1, comment(1, 1)],
      [3, comment(3, 3)],
      [2, comment(2, 2)],
    ]);
    expect(ids(sortedNewestFirst(byId))).toEqual([3, 2, 1]);
  });

  it('leaves the map as it was', () => {
    const byId = new Map<number, FeedPostComment>([
      [1, comment(1, 1)],
      [2, comment(2, 2)],
    ]);
    sortedNewestFirst(byId);
    expect([...byId.keys()]).toEqual([1, 2]);
  });
});

describe('mergeReplyPreview', () => {
  it('empties the replies when an empty preview covers the whole thread', () => {
    // Menej odpovedí než náhľadový strop: prázdny náhľad znamená „nič tam nie je".
    expect(mergeReplyPreview([comment(1, 1), comment(2, 2)], [], true)).toEqual([]);
  });

  it('keeps the replies when an empty preview does not cover the thread', () => {
    const current = [comment(2, 2), comment(1, 1)];
    expect(mergeReplyPreview(current, [], false)).toBe(current);
  });

  it('lets a preview that covers the thread replace everything', () => {
    const current = [comment(5, 5), comment(3, 3)];
    const preview = [comment(4, 4)];
    expect(ids(mergeReplyPreview(current, preview, true))).toEqual([4]);
  });

  it('keeps replies older than a shorter preview and drops newer ones it lacks', () => {
    const current = [comment(6, 6), comment(5, 5), comment(3, 3), comment(2, 2)];
    const preview = [comment(5, 5, { likes_count: 4 }), comment(4, 4)];

    const merged = mergeReplyPreview(current, preview, false);

    // 6 je novšia než koniec náhľadu a v ňom chýba, teda sa zmazala; 3 a 2 sú staršie.
    expect(ids(merged)).toEqual([5, 4, 3, 2]);
    expect(merged[0].likes_count).toBe(4);
  });

  it('does not change what it was given', () => {
    const current = Object.freeze([comment(3, 3), comment(1, 1)]) as FeedPostComment[];
    const preview = Object.freeze([comment(2, 2)]) as FeedPostComment[];
    expect(() => mergeReplyPreview(current, preview, false)).not.toThrow();
  });
});

describe('mergeReplyBatch', () => {
  it('changes nothing for an empty batch', () => {
    const current = [comment(2, 2), comment(1, 1)];
    expect(mergeReplyBatch(current, [])).toBe(current);
  });

  it('appends an older batch behind the replies we have', () => {
    const merged = mergeReplyBatch(
      [comment(6, 6), comment(5, 5)],
      [comment(4, 4), comment(3, 3)],
    );
    expect(ids(merged)).toEqual([6, 5, 4, 3]);
  });

  it('takes the version from the batch when ids overlap, without duplicates', () => {
    const merged = mergeReplyBatch(
      [comment(5, 5), comment(4, 4)],
      [comment(4, 4, { text: 'Nový text' }), comment(3, 3)],
    );
    expect(ids(merged)).toEqual([5, 4, 3]);
    expect(merged[1].text).toBe('Nový text');
  });

  it('drops nothing that the batch does not mention', () => {
    // Dávka nesie len staršie odpovede, o tých nad ňou nehovorí nič.
    const merged = mergeReplyBatch([comment(9, 9), comment(8, 8)], [comment(2, 2)]);
    expect(ids(merged)).toEqual([9, 8, 2]);
  });

  it('does not change what it was given', () => {
    const current = Object.freeze([comment(3, 3)]) as FeedPostComment[];
    const batch = Object.freeze([comment(2, 2)]) as FeedPostComment[];
    expect(() => mergeReplyBatch(current, batch)).not.toThrow();
  });
});

describe('mergeComments', () => {
  it('empties the list when the answer is empty and there is no next page', () => {
    // Prázdna odpoveď bez ďalšej stránky: vlákno je prázdne, všetko sa zmazalo.
    expect(mergeComments([comment(2, 2), comment(1, 1)], [], false)).toEqual([]);
  });

  it('keeps the list when the answer is empty but a next page exists', () => {
    const current = [comment(2, 2), comment(1, 1)];
    expect(mergeComments(current, [], true)).toBe(current);
  });

  it('lets the answer have the last word when it covers the whole thread', () => {
    const current = [comment(3, 3), comment(2, 2), comment(1, 1)];
    // Komentár 2 niekto zmazal, komentár 3 má čerstvejší počet lajkov, 4 je nový.
    const incoming = [comment(4, 4), comment(3, 3, { likes_count: 7 }), comment(1, 1)];

    const merged = mergeComments(current, incoming, false);

    expect(ids(merged)).toEqual([4, 3, 1]);
    expect(merged[1].likes_count).toBe(7);
  });

  it('keeps comments older than the answer reaches when a next page exists', () => {
    const current = [
      comment(5, 5),
      comment(4, 4),
      comment(3, 3),
      comment(2, 2),
      comment(1, 1),
    ];
    // Odpoveď siaha po komentár 3: 4 v nej chýba (zmazaný), 2 a 1 sú pod jej dosahom.
    const incoming = [comment(5, 5, { likes_count: 2 }), comment(3, 3)];

    const merged = mergeComments(current, incoming, true);

    expect(ids(merged)).toEqual([5, 3, 2, 1]);
    expect(merged[0].likes_count).toBe(2);
  });

  it('sorts newest first by time and then by id', () => {
    const merged = mergeComments(
      [],
      [comment(1, 1), comment(8, 2), comment(9, 2), comment(2, 3)],
      false,
    );
    expect(ids(merged)).toEqual([2, 9, 8, 1]);
  });

  it('keeps replies loaded beyond the preview when the thread is longer than the preview', () => {
    const current = [
      comment(1, 1, {
        replies: [comment(9, 9), comment(8, 8), comment(7, 7)],
        replies_count: REPLIES_PREVIEW_LIMIT + 1,
      }),
    ];
    const incoming = [
      comment(1, 1, {
        replies: [comment(10, 10)],
        replies_count: REPLIES_PREVIEW_LIMIT + 1,
      }),
    ];

    const merged = mergeComments(current, incoming, false);

    expect(ids(merged[0].replies ?? [])).toEqual([10, 9, 8, 7]);
  });

  it('takes the preview as the whole thread at the preview limit', () => {
    const current = [
      comment(1, 1, {
        replies: [comment(9, 9), comment(8, 8)],
        replies_count: REPLIES_PREVIEW_LIMIT,
      }),
    ];
    const incoming = [
      comment(1, 1, {
        replies: [comment(10, 10)],
        replies_count: REPLIES_PREVIEW_LIMIT,
      }),
    ];

    const merged = mergeComments(current, incoming, false);

    // Pri strope (aj pod ním) náhľad pokrýva celé vlákno, takže starší stav neostáva.
    expect(ids(merged[0].replies ?? [])).toEqual([10]);
  });

  it('gives a new comment without replies an empty list of replies', () => {
    const merged = mergeComments([], [comment(1, 1)], false);
    expect(merged[0].replies).toEqual([]);
  });

  it('does not change what it was given', () => {
    const current = Object.freeze([comment(2, 2), comment(1, 1)]) as FeedPostComment[];
    const incoming = Object.freeze([comment(3, 3), comment(2, 2)]) as FeedPostComment[];
    expect(() => mergeComments(current, incoming, true)).not.toThrow();
  });
});

describe('repliesTotal', () => {
  it('prefers the count from the server to the loaded replies', () => {
    const item = comment(1, 1, {
      replies: [comment(2, 2), comment(3, 3)],
      replies_count: 5,
    });
    expect(repliesTotal(item)).toBe(5);
  });

  it('takes a count of zero as a real count', () => {
    const item = comment(1, 1, { replies: [comment(2, 2)], replies_count: 0 });
    expect(repliesTotal(item)).toBe(0);
  });

  it('falls back to the loaded replies when the count is missing', () => {
    const item = comment(1, 1, { replies: [comment(2, 2), comment(3, 3)] });
    expect(repliesTotal(item)).toBe(2);
  });

  it('is zero when there is neither a count nor replies', () => {
    expect(repliesTotal(comment(1, 1))).toBe(0);
  });
});

describe('flattenComments', () => {
  it('puts each comment before its replies and keeps the order', () => {
    const list = [
      comment(2, 2, { replies: [comment(21, 2), comment(20, 2)] }),
      comment(1, 1),
    ];
    expect(ids(flattenComments(list))).toEqual([2, 21, 20, 1]);
  });

  it('handles comments without replies and an empty list', () => {
    expect(ids(flattenComments([comment(1, 1), comment(2, 2)]))).toEqual([1, 2]);
    expect(flattenComments([])).toEqual([]);
  });
});

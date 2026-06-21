import { summaryFromReviews, resolveReviewsSummary } from '../reviewsSummary';
import type { Review } from '../ReviewCard';

function r(rating: number): Review {
  return {
    id: Math.round(rating * 100),
    reviewer_id: 1,
    reviewer_display_name: 'X',
    reviewer_avatar_url: null,
    rating,
    text: '',
    pros: [],
    cons: [],
    likes_count: 0,
    is_liked_by_me: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as Review;
}

describe('reviewsSummary – priemer z presných hodnôt (BOD 9)', () => {
  it('priemer používa presnú hodnotu review.rating, nie zaokrúhlenú na 0.5', () => {
    // Pri starom kóde by sa 4.2 zaokrúhlilo na 4.0 → priemer 4.0 (chyba).
    const s = summaryFromReviews([r(4.2), r(4.2)]);
    expect(s.averageRating).toBeCloseTo(4.2, 5);
  });

  it('breakdown ostáva rozdelený podľa celých hviezd', () => {
    const s = summaryFromReviews([r(5), r(4), r(1)]);
    expect(s.breakdown[5]).toBe(1);
    expect(s.breakdown[4]).toBe(1);
    expect(s.breakdown[1]).toBe(1);
    expect(s.total).toBe(3);
  });

  it('prázdny zoznam → nulový súhrn', () => {
    const s = summaryFromReviews([]);
    expect(s.total).toBe(0);
    expect(s.averageRating).toBe(0);
  });

  it('resolveReviewsSummary preferuje backend stats (presný priemer)', () => {
    const s = resolveReviewsSummary(
      { total: 10, average: 4.3, breakdown: { 1: 1, 2: 0, 3: 0, 4: 4, 5: 5 } },
      [],
    );
    expect(s.averageRating).toBe(4.3);
    expect(s.total).toBe(10);
  });

  it('resolveReviewsSummary fallback na lokálny výpočet ak chýbajú stats', () => {
    const s = resolveReviewsSummary(null, [r(4.2), r(4.2)]);
    expect(s.averageRating).toBeCloseTo(4.2, 5);
  });
});

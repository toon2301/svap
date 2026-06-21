import type { Review } from './ReviewCard';

export type ReviewsBreakdown = { 1: number; 2: number; 3: number; 4: number; 5: number };

/** Agregát hodnotení z backendu (GET /skills/<id>/reviews/ → `total` + `stats`). */
export type ReviewsStats = {
  total: number;
  average: number;
  breakdown: ReviewsBreakdown;
};

export type ReviewsSummary = {
  averageRating: number;
  percentage: number;
  breakdown: ReviewsBreakdown;
  total: number;
};

const emptySummary = (): ReviewsSummary => ({
  averageRating: 0,
  percentage: 0,
  breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  total: 0,
});

/**
 * Súhrn počítaný lokálne z (kompletného) zoznamu recenzií.
 * Fallback pre prípad, že backend agregát nie je dostupný.
 */
export function summaryFromReviews(reviews: Review[]): ReviewsSummary {
  if (reviews.length === 0) return emptySummary();

  const breakdown: ReviewsBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRating = 0;

  reviews.forEach((review) => {
    const rating = Math.round(review.rating * 2) / 2; // najbližšia 0.5
    const rounded = Math.round(rating); // breakdown po celých hviezdach
    if (rounded >= 5) breakdown[5]++;
    else if (rounded >= 4) breakdown[4]++;
    else if (rounded >= 3) breakdown[3]++;
    else if (rounded >= 2) breakdown[2]++;
    else breakdown[1]++;
    totalRating += rating;
  });

  const averageRating = totalRating / reviews.length;
  return {
    averageRating,
    percentage: Math.round((averageRating / 5) * 100),
    breakdown,
    total: reviews.length,
  };
}

/**
 * Súhrn z backend agregátu (správny aj pri stránkovaní – počíta sa cez všetky
 * recenzie). Ak agregát chýba, použije sa lokálny výpočet zo zoznamu.
 */
export function resolveReviewsSummary(
  stats: ReviewsStats | null | undefined,
  reviews: Review[],
): ReviewsSummary {
  if (!stats) return summaryFromReviews(reviews);
  if (!stats.total || stats.total <= 0) return emptySummary();

  const averageRating = Number(stats.average) || 0;
  return {
    averageRating,
    percentage: Math.round((averageRating / 5) * 100),
    breakdown: { ...stats.breakdown },
    total: stats.total,
  };
}

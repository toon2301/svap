export const PROFILE_PORTFOLIO_REFRESH_EVENT = 'profilePortfolioRefresh';
export const PROFILE_PORTFOLIO_LIKED_EVENT = 'profile:portfolio-liked';

export type ProfilePortfolioLikedPayload = {
  portfolioItemId: number;
};

function parsePositiveInteger(value: unknown): number | null {
  const id = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return id;
}

export function parsePositivePortfolioItemId(value: unknown): number | null {
  return parsePositiveInteger(value);
}

export function dispatchProfilePortfolioRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROFILE_PORTFOLIO_REFRESH_EVENT));
}

export function dispatchProfilePortfolioLiked(payload: ProfilePortfolioLikedPayload): void {
  if (typeof window === 'undefined') return;
  const portfolioItemId = parsePositivePortfolioItemId(payload.portfolioItemId);
  if (portfolioItemId === null) return;

  window.dispatchEvent(
    new CustomEvent<ProfilePortfolioLikedPayload>(PROFILE_PORTFOLIO_LIKED_EVENT, {
      detail: { portfolioItemId },
    }),
  );
}

export function readProfilePortfolioLikedEvent(event: Event): ProfilePortfolioLikedPayload | null {
  const detail = (event as CustomEvent<Partial<ProfilePortfolioLikedPayload>>).detail;
  const portfolioItemId = parsePositivePortfolioItemId(detail?.portfolioItemId);
  return portfolioItemId === null ? null : { portfolioItemId };
}

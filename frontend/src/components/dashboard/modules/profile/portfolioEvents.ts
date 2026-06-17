export const PROFILE_PORTFOLIO_REFRESH_EVENT = 'profilePortfolioRefresh';

export function dispatchProfilePortfolioRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROFILE_PORTFOLIO_REFRESH_EVENT));
}

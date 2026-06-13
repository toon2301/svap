export function getPortfolioOwnerIdentifier(
  ownerUserId?: number,
  ownerSlug?: string | null,
): string | null {
  const slug = String(ownerSlug || '').trim();
  if (slug) return slug;
  if (typeof ownerUserId === 'number' && Number.isFinite(ownerUserId)) {
    return String(ownerUserId);
  }
  return null;
}

export function buildPortfolioListPath(ownerIdentifier: string): string {
  return `/dashboard/users/${encodeURIComponent(ownerIdentifier)}/portfolio`;
}

export function buildPortfolioDetailPath(
  ownerIdentifier: string,
  portfolioItemId: number,
): string {
  return `${buildPortfolioListPath(ownerIdentifier)}/${portfolioItemId}`;
}

export function getPortfolioOwnerIdentifier(
  ownerUserId?: number,
  ownerSlug?: string | null,
): string | null {
  const slug = String(ownerSlug || '').trim();
  if (slug) return slug;
  if (typeof ownerUserId === 'number' && Number.isInteger(ownerUserId) && ownerUserId > 0) {
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

export function buildPortfolioCreatePath(ownerIdentifier: string): string {
  return `${buildPortfolioListPath(ownerIdentifier)}/create`;
}

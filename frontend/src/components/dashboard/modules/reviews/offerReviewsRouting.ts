const DASHBOARD_ORIGIN = 'https://swaply.local';
const MAX_RETURN_TO_LENGTH = 512;

function parsePositiveOfferId(offerId: number | string | null | undefined): number | null {
  const parsed = typeof offerId === 'number' ? offerId : Number(offerId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getSafeDashboardReturnTo(value: string | null | undefined): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > MAX_RETURN_TO_LENGTH) return null;
  if (!raw.startsWith('/dashboard') || raw.startsWith('//')) return null;

  try {
    const parsed = new URL(raw, DASHBOARD_ORIGIN);
    if (parsed.origin !== DASHBOARD_ORIGIN) return null;
    if (parsed.pathname !== '/dashboard' && !parsed.pathname.startsWith('/dashboard/')) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function buildOfferReviewsReturnTo({
  offerId,
  ownerIdentifier,
  isOwnProfile,
}: {
  offerId: number | string | null | undefined;
  ownerIdentifier?: string | number | null;
  isOwnProfile: boolean;
}): string | null {
  const parsedOfferId = parsePositiveOfferId(offerId);
  if (parsedOfferId == null) return null;

  if (isOwnProfile) {
    return `/dashboard/profile?highlight=${encodeURIComponent(String(parsedOfferId))}&side=back`;
  }

  const identifier = String(ownerIdentifier ?? '').trim();
  if (!identifier) return null;

  return `/dashboard/users/${encodeURIComponent(identifier)}?offer=${encodeURIComponent(
    String(parsedOfferId),
  )}&side=back`;
}

export function buildOfferReviewsPath(
  offerId: number | string | null | undefined,
  options?: {
    returnTo?: string | null;
  },
): string | null {
  const parsedOfferId = parsePositiveOfferId(offerId);
  if (parsedOfferId == null) return null;

  const params = new URLSearchParams();
  const returnTo = getSafeDashboardReturnTo(options?.returnTo);
  if (returnTo) {
    params.set('returnTo', returnTo);
  }

  const query = params.toString();
  return `/dashboard/offers/${encodeURIComponent(String(parsedOfferId))}/reviews${
    query ? `?${query}` : ''
  }`;
}

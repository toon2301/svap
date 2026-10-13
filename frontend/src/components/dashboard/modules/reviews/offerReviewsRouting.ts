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
    // Return to the top of the own profile rather than scrolling to and
    // reopening the offer (no highlight/side=back): the user was managing
    // their profile, not browsing that single offer.
    return '/dashboard/profile';
  }

  const identifier = String(ownerIdentifier ?? '').trim();
  if (!identifier) return null;

  // The plain profile, same as for the own one: no `offer` (it would highlight the card and scroll
  // to it) and no `side=back` (it would flip the card, on mobile open its bottom sheet). This target
  // is only used when the reviews page has no history step to go back to (reload, new tab), and
  // going back from the reviews must not reopen one particular card there.
  return `/dashboard/users/${encodeURIComponent(identifier)}`;
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

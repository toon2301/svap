const DASHBOARD_ORIGIN = 'https://svaply.local';
const USER_PROFILE_PATH = /^\/dashboard\/users\/([^/]+)\/?$/;

export interface OfferWatchNotificationTarget {
  identifier: string;
  highlightId: number;
}

export function parseOfferWatchNotificationTarget(
  targetUrl: string,
): OfferWatchNotificationTarget | null {
  try {
    const url = new URL(targetUrl, DASHBOARD_ORIGIN);
    if (url.origin !== DASHBOARD_ORIGIN) return null;

    const match = url.pathname.match(USER_PROFILE_PATH);
    if (!match?.[1]) return null;

    const identifier = decodeURIComponent(match[1]).trim();
    if (!identifier || identifier.includes('/') || identifier.includes('\\')) return null;

    const rawHighlightId = url.searchParams.get('highlight') ?? url.searchParams.get('offer');
    if (!rawHighlightId) return null;

    const highlightId = Number(rawHighlightId);
    if (!Number.isSafeInteger(highlightId) || highlightId <= 0) return null;

    return { identifier, highlightId };
  } catch {
    return null;
  }
}

export function dispatchOfferWatchNotificationNavigation(targetUrl: string): boolean {
  if (typeof window === 'undefined') return false;

  const target = parseOfferWatchNotificationTarget(targetUrl);
  if (!target) return false;

  window.dispatchEvent(
    new CustomEvent<OfferWatchNotificationTarget>('goToUserProfile', {
      detail: target,
    }),
  );
  return true;
}

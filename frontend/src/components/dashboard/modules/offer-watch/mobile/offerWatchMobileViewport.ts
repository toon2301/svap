const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';

/** Detect mobile layout using browser media matching, width fallback, or a server-safe default. */
export function isOfferWatchMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
    : window.innerWidth < 1024;
}

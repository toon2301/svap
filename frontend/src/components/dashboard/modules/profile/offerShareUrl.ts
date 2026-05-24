import type { Offer } from './profileOffersTypes';

type OfferOwnerIdentifier = string | number | null | undefined;

export function getOfferOwnerIdentifier(
  offer: Pick<Offer, 'owner_slug' | 'user_id'>,
  fallback?: OfferOwnerIdentifier,
): string | null {
  const slug = offer.owner_slug?.trim();
  if (slug) return slug;

  if (typeof offer.user_id === 'number' && Number.isFinite(offer.user_id)) {
    return String(offer.user_id);
  }

  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return String(fallback);
  }

  const fallbackText = typeof fallback === 'string' ? fallback.trim() : '';
  return fallbackText || null;
}

export function buildOfferSharePath(ownerIdentifier: string, offerId: number): string {
  return `/dashboard/users/${encodeURIComponent(ownerIdentifier)}?offer=${encodeURIComponent(
    String(offerId),
  )}`;
}

export function buildOfferShareUrl(
  ownerIdentifier: string,
  offerId: number,
  origin?: string,
): string {
  const path = buildOfferSharePath(ownerIdentifier, offerId);
  const baseOrigin =
    origin?.replace(/\/+$/, '') ??
    (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');

  return baseOrigin ? `${baseOrigin}${path}` : path;
}

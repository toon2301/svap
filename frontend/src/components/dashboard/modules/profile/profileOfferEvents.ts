'use client';

export const PROFILE_OFFER_LIKED_EVENT = 'profile:offer-liked';

export type ProfileOfferLikedPayload = {
  offerId: number;
};

export function parsePositiveOfferId(value: unknown): number | null {
  const offerId = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(offerId) || offerId < 1) return null;
  return offerId;
}

export function dispatchProfileOfferLiked(payload: ProfileOfferLikedPayload): void {
  if (typeof window === 'undefined') return;
  const offerId = parsePositiveOfferId(payload.offerId);
  if (offerId === null) return;

  window.dispatchEvent(
    new CustomEvent<ProfileOfferLikedPayload>(PROFILE_OFFER_LIKED_EVENT, {
      detail: { offerId },
    }),
  );
}

export function readProfileOfferLikedEvent(event: Event): ProfileOfferLikedPayload | null {
  const detail = (event as CustomEvent<Partial<ProfileOfferLikedPayload>>).detail;
  const offerId = parsePositiveOfferId(detail?.offerId);
  return offerId === null ? null : { offerId };
}

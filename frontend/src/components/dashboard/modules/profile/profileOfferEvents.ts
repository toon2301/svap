'use client';

export const PROFILE_OFFER_LIKED_EVENT = 'profile:offer-liked';
export const PROFILE_OFFERS_REFRESH_EVENT = 'profile:offers-refresh';

export type ProfileOfferLikedPayload = {
  offerId: number;
};

export type ProfileOffersRefreshPayload = {
  ownerUserId?: number;
  offerId?: number;
};

function parsePositiveInteger(value: unknown): number | null {
  const id = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return id;
}

export function parsePositiveOfferId(value: unknown): number | null {
  return parsePositiveInteger(value);
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

export function dispatchProfileOffersRefresh(payload: ProfileOffersRefreshPayload = {}): void {
  if (typeof window === 'undefined') return;

  const ownerUserId = payload.ownerUserId === undefined ? undefined : parsePositiveInteger(payload.ownerUserId);
  const offerId = payload.offerId === undefined ? undefined : parsePositiveInteger(payload.offerId);
  if (ownerUserId === null || offerId === null) return;

  window.dispatchEvent(
    new CustomEvent<ProfileOffersRefreshPayload>(PROFILE_OFFERS_REFRESH_EVENT, {
      detail: {
        ...(ownerUserId !== undefined ? { ownerUserId } : {}),
        ...(offerId !== undefined ? { offerId } : {}),
      },
    }),
  );
}

export function readProfileOffersRefreshEvent(event: Event): ProfileOffersRefreshPayload | null {
  const detail = (event as CustomEvent<Partial<ProfileOffersRefreshPayload>>).detail;
  const ownerUserId = detail?.ownerUserId === undefined ? undefined : parsePositiveInteger(detail.ownerUserId);
  const offerId = detail?.offerId === undefined ? undefined : parsePositiveInteger(detail.offerId);
  if (ownerUserId === null || offerId === null) return null;
  return {
    ...(ownerUserId !== undefined ? { ownerUserId } : {}),
    ...(offerId !== undefined ? { offerId } : {}),
  };
}

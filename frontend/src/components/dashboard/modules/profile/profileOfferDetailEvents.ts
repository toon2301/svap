'use client';

export const PROFILE_OFFER_DETAIL_OPEN_EVENT = 'profile:offer-detail-open';
export const PROFILE_OFFER_DETAIL_CLOSE_EVENT = 'profile:offer-detail-close';

export function dispatchProfileOfferDetailOpen(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROFILE_OFFER_DETAIL_OPEN_EVENT));
}

export function dispatchProfileOfferDetailClose(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROFILE_OFFER_DETAIL_CLOSE_EVENT));
}

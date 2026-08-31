import { normalizeOfferCountryCode } from '@/shared/countryRegistry';

export const OFFER_COUNTRY_REQUIRED_CODE = 'offer_country_required';

export function isCountryMissingForNewOffer(params: {
  offerId?: number | null;
  countryCode?: unknown;
}): boolean {
  const isNewOffer = !params.offerId || params.offerId <= 0;
  return isNewOffer && !normalizeOfferCountryCode(params.countryCode);
}

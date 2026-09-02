import type { OfferCountryCode } from '@/shared/countryRegistry';
import type { Offer } from '../profile/profileOffersTypes';

export const MAX_OFFER_WATCHES = 5;
export const OFFER_WATCH_PAGE_SIZE = 10;
export const OFFER_WATCH_NEW_MATCH_HOURS = 12;

export const OFFER_WATCH_PRICE_CURRENCIES = ['€', 'Kč', '$', 'zł', 'Ft'] as const;

export type OfferWatchPriceCurrency =
  (typeof OFFER_WATCH_PRICE_CURRENCIES)[number];

export type OfferWatch = {
  id: number;
  category: string;
  subcategory: string;
  isSeeking: boolean;
  countryCode: OfferCountryCode;
  districtCode: string;
  districtLabel: string;
  priceMin: string | null;
  priceMax: string | null;
  priceCurrency: OfferWatchPriceCurrency | '';
  createdAt: string;
  updatedAt: string;
};

export type OfferWatchDraft = {
  category: string;
  subcategory: string;
  isSeeking: boolean;
  countryCode: OfferCountryCode | '';
  districtCode: string;
  priceMin: string;
  priceMax: string;
  priceCurrency: OfferWatchPriceCurrency | '';
};

export type OfferWatchInput = {
  category: string;
  subcategory: string;
  isSeeking: boolean;
  countryCode: OfferCountryCode;
  districtCode: string;
  priceMin: string | null;
  priceMax: string | null;
  priceCurrency: OfferWatchPriceCurrency | '';
};

export type OfferWatchDraftField =
  | 'category'
  | 'subcategory'
  | 'countryCode'
  | 'districtCode'
  | 'priceMin'
  | 'priceMax'
  | 'priceCurrency';

export type OfferWatchValidationCode =
  | 'required'
  | 'invalid_selection'
  | 'invalid_district'
  | 'invalid_price'
  | 'price_order'
  | 'currency_required'
  | 'unsupported_currency';

export type OfferWatchValidationErrors = Partial<
  Record<OfferWatchDraftField, OfferWatchValidationCode>
>;

export type OfferWatchValidationResult =
  | { ok: true; input: OfferWatchInput }
  | { ok: false; errors: OfferWatchValidationErrors };

export type OfferWatchErrorKind =
  | 'validation'
  | 'duplicate'
  | 'limit'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'network'
  | 'cancelled'
  | 'busy'
  | 'invalid_response'
  | 'unknown';

export type OfferWatchMatch = {
  offer: Offer;
  createdAt: string;
};

export type OfferWatchMatchesPage = {
  results: OfferWatchMatch[];
  nextCursor: string | null;
  previousCursor: string | null;
};

export type OfferWatchFailure = Error & {
  kind: OfferWatchErrorKind;
  status: number | null;
  fields: string[];
};

export type OfferWatchActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: OfferWatchFailure };

import { normalizeOfferCountryCode } from '@/shared/countryRegistry';
import type { OfferWatchDraft, OfferWatchPriceCurrency } from './types';
import { hasOfferWatchPriceFilter } from './offerWatchPrice';

const EURO_COUNTRY_CODES = new Set([
  'AD', 'AT', 'AX', 'BE', 'BG', 'BL', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR',
  'GF', 'GP', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MC', 'ME', 'MF',
  'MQ', 'MT', 'NL', 'PM', 'PT', 'RE', 'SI', 'SK', 'SM', 'TF', 'VA', 'XK',
  'YT',
]);

const COUNTRY_CURRENCY: Readonly<Record<string, OfferWatchPriceCurrency>> = {
  CZ: 'Kč',
  HU: 'Ft',
  PL: 'zł',
  US: '$',
};

/** Resolve a supported country currency, leaving unsupported defaults for manual selection. */
export function defaultOfferWatchCurrency(
  countryCode: unknown,
): OfferWatchPriceCurrency | '' {
  const normalizedCountry = normalizeOfferCountryCode(countryCode);
  if (EURO_COUNTRY_CODES.has(normalizedCountry)) return '€';
  return COUNTRY_CURRENCY[normalizedCountry] || '';
}

/** Update one raw bound without erasing a typed fraction or a manually selected currency. */
export function changeOfferWatchPrice(
  draft: OfferWatchDraft,
  field: 'priceMin' | 'priceMax',
  value: string,
): OfferWatchDraft {
  const nextDraft = { ...draft, [field]: value };
  const hasPrice = Boolean(nextDraft.priceMin.trim() || nextDraft.priceMax.trim());

  if (!hasPrice) return { ...nextDraft, priceCurrency: '' };
  if (hasOfferWatchPriceFilter(nextDraft) && !nextDraft.priceCurrency) {
    return {
      ...nextDraft,
      priceCurrency: defaultOfferWatchCurrency(nextDraft.countryCode),
    };
  }
  return nextDraft;
}

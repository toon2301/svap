import { normalizeOfferCountryCode } from '@/shared/countryRegistry';
import type { OfferWatchDraft, OfferWatchPriceCurrency } from './types';

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

export function defaultOfferWatchCurrency(
  countryCode: unknown,
): OfferWatchPriceCurrency | '' {
  const normalizedCountry = normalizeOfferCountryCode(countryCode);
  if (EURO_COUNTRY_CODES.has(normalizedCountry)) return '€';
  return COUNTRY_CURRENCY[normalizedCountry] || '';
}

export function changeOfferWatchPrice(
  draft: OfferWatchDraft,
  field: 'priceMin' | 'priceMax',
  value: string,
): OfferWatchDraft {
  const nextDraft = { ...draft, [field]: value };
  const hadPrice = Boolean(draft.priceMin.trim() || draft.priceMax.trim());
  const hasPrice = Boolean(nextDraft.priceMin.trim() || nextDraft.priceMax.trim());

  if (!hasPrice) return { ...nextDraft, priceCurrency: '' };
  if (!hadPrice && !nextDraft.priceCurrency) {
    return {
      ...nextDraft,
      priceCurrency: defaultOfferWatchCurrency(nextDraft.countryCode),
    };
  }
  return nextDraft;
}

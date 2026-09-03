'use client';

import { skillsCategories } from '@/constants/skillsCategories';
import {
  findDistrictByCode,
  normalizeOfferCountryCode,
} from '@/shared/districtRegistry';
import { resolvePreferredOfferCountry } from '@/shared/offerCountryPreference';
import {
  OFFER_WATCH_PRICE_CURRENCIES,
  type OfferWatch,
  type OfferWatchDraft,
  type OfferWatchPriceCurrency,
  type OfferWatchValidationErrors,
  type OfferWatchValidationResult,
} from './types';

const DECIMAL_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

type ParsedPrice = {
  normalized: string;
  cents: number;
};

function isSupportedCurrency(
  value: string,
): value is OfferWatchPriceCurrency {
  return OFFER_WATCH_PRICE_CURRENCIES.some((currency) => currency === value);
}

function parsePrice(value: string): ParsedPrice | null {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) return null;

  const [integerPart, decimalPart = ''] = trimmed.replace(',', '.').split('.');
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || '0';
  if (normalizedInteger.length > 8) return null;
  const normalizedDecimal = decimalPart.replace(/0+$/, '');
  return {
    normalized: normalizedDecimal
      ? `${normalizedInteger}.${normalizedDecimal}`
      : normalizedInteger,
    cents:
      Number(normalizedInteger) * 100 + Number(decimalPart.padEnd(2, '0')),
  };
}

function isCanonicalCategorySelection(category: string, subcategory: string): boolean {
  return Object.prototype.hasOwnProperty.call(skillsCategories, category)
    && skillsCategories[category]?.includes(subcategory) === true;
}

export function createOfferWatchDraft(params: {
  watch?: OfferWatch | null;
  detectedCountryCode?: unknown;
} = {}): OfferWatchDraft {
  const watch = params.watch;
  if (watch) {
    return {
      category: watch.category,
      subcategory: watch.subcategory,
      isSeeking: watch.isSeeking,
      countryCode: normalizeOfferCountryCode(watch.countryCode),
      districtCode: watch.districtCode,
      priceMin: watch.priceMin ?? '',
      priceMax: watch.priceMax ?? '',
      priceCurrency: watch.priceCurrency,
    };
  }

  return {
    category: '',
    subcategory: '',
    isSeeking: false,
    countryCode: resolvePreferredOfferCountry({
      detectedCountryCode: params.detectedCountryCode,
    }),
    districtCode: '',
    priceMin: '',
    priceMax: '',
    priceCurrency: '',
  };
}

export function selectOfferWatchCategory(
  draft: OfferWatchDraft,
  category: string,
  subcategory: string,
): OfferWatchDraft {
  if (!isCanonicalCategorySelection(category, subcategory)) return draft;
  return { ...draft, category, subcategory };
}

export function selectOfferWatchCountry(
  draft: OfferWatchDraft,
  countryCode: unknown,
): OfferWatchDraft {
  const normalized = normalizeOfferCountryCode(countryCode);
  if (normalized === draft.countryCode) return draft;
  return { ...draft, countryCode: normalized, districtCode: '' };
}

export function selectOfferWatchDistrict(
  draft: OfferWatchDraft,
  districtCode: unknown,
): OfferWatchDraft {
  const normalizedCode = String(districtCode || '').trim().toLowerCase();
  if (!normalizedCode) return { ...draft, districtCode: '' };
  const district = findDistrictByCode(draft.countryCode, normalizedCode);
  return district ? { ...draft, districtCode: district.code } : draft;
}

export function validateOfferWatchDraft(
  draft: OfferWatchDraft,
): OfferWatchValidationResult {
  const errors: OfferWatchValidationErrors = {};
  const category = draft.category.trim();
  const subcategory = draft.subcategory.trim();
  const countryCode = normalizeOfferCountryCode(draft.countryCode);
  const districtCode = draft.districtCode.trim().toLowerCase();

  if (!category) errors.category = 'required';
  if (!subcategory) errors.subcategory = 'required';
  if (
    category
    && subcategory
    && !isCanonicalCategorySelection(category, subcategory)
  ) {
    errors.subcategory = 'invalid_selection';
  }
  if (!countryCode) errors.countryCode = 'required';
  if (
    districtCode
    && (!countryCode || !findDistrictByCode(countryCode, districtCode))
  ) {
    errors.districtCode = 'invalid_district';
  }

  const rawPriceMin = draft.priceMin.trim();
  const rawPriceMax = draft.priceMax.trim();
  const priceMin = rawPriceMin ? parsePrice(rawPriceMin) : null;
  const priceMax = rawPriceMax ? parsePrice(rawPriceMax) : null;
  if (rawPriceMin && !priceMin) errors.priceMin = 'invalid_price';
  if (rawPriceMax && !priceMax) errors.priceMax = 'invalid_price';
  if (priceMin && priceMax && priceMin.cents > priceMax.cents) {
    errors.priceMax = 'price_order';
  }

  const hasPrice = Boolean(rawPriceMin || rawPriceMax);
  const priceCurrency = draft.priceCurrency;
  if (hasPrice && !priceCurrency) {
    errors.priceCurrency = 'currency_required';
  } else if (priceCurrency && !isSupportedCurrency(priceCurrency)) {
    errors.priceCurrency = 'unsupported_currency';
  }

  if (Object.keys(errors).length > 0 || !countryCode) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      category,
      subcategory,
      isSeeking: draft.isSeeking,
      countryCode,
      districtCode,
      priceMin: priceMin?.normalized ?? null,
      priceMax: priceMax?.normalized ?? null,
      priceCurrency: hasPrice && isSupportedCurrency(priceCurrency)
        ? priceCurrency
        : '',
    },
  };
}

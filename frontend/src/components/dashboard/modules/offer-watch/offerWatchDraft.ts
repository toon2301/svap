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
import { defaultOfferWatchCurrency } from './offerWatchCurrency';
import {
  hasOfferWatchPriceFilter,
  normalizeOfferWatchZeroBounds,
  parseOfferWatchPrice,
} from './offerWatchPrice';

/** Narrow a currency to the application's supported watch-price options. */
function isSupportedCurrency(
  value: string,
): value is OfferWatchPriceCurrency {
  return OFFER_WATCH_PRICE_CURRENCIES.some((currency) => currency === value);
}

/** Require a catalog-owned category/subcategory pair instead of arbitrary text. */
function isCanonicalCategorySelection(category: string, subcategory: string): boolean {
  return Object.prototype.hasOwnProperty.call(skillsCategories, category)
    && skillsCategories[category]?.includes(subcategory) === true;
}

/** Create a new draft or normalize stored zero bounds without writing the saved watch. */
export function createOfferWatchDraft(params: {
  watch?: OfferWatch | null;
  detectedCountryCode?: unknown;
} = {}): OfferWatchDraft {
  const watch = params.watch;
  if (watch) {
    return normalizeOfferWatchZeroBounds({
      category: watch.category,
      subcategory: watch.subcategory,
      isSeeking: watch.isSeeking,
      countryCode: normalizeOfferCountryCode(watch.countryCode),
      districtCode: watch.districtCode,
      priceMin: watch.priceMin ?? '',
      priceMax: watch.priceMax ?? '',
      priceCurrency: watch.priceCurrency,
    });
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

/** Apply only a valid canonical catalog selection, preserving the rest of the draft. */
export function selectOfferWatchCategory(
  draft: OfferWatchDraft,
  category: string,
  subcategory: string,
): OfferWatchDraft {
  if (!isCanonicalCategorySelection(category, subcategory)) return draft;
  return { ...draft, category, subcategory };
}

/** Reset the district on country change and fill a missing currency only for an active bound. */
export function selectOfferWatchCountry(
  draft: OfferWatchDraft,
  countryCode: unknown,
): OfferWatchDraft {
  const normalized = normalizeOfferCountryCode(countryCode);
  if (normalized === draft.countryCode) return draft;
  const hasPrice = hasOfferWatchPriceFilter(draft);
  return {
    ...draft,
    countryCode: normalized,
    districtCode: '',
    priceCurrency: hasPrice && !draft.priceCurrency
      ? defaultOfferWatchCurrency(normalized)
      : draft.priceCurrency,
  };
}

/** Accept the current country's canonical district or the all-districts choice. */
export function selectOfferWatchDistrict(
  draft: OfferWatchDraft,
  districtCode: unknown,
): OfferWatchDraft {
  const normalizedCode = String(districtCode || '').trim().toLowerCase();
  if (!normalizedCode) return { ...draft, districtCode: '' };
  const district = findDistrictByCode(draft.countryCode, normalizedCode);
  return district ? { ...draft, districtCode: district.code } : draft;
}

/** Validate draft fields and produce canonical input with zero bounds represented by null. */
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
  const parsedMin = rawPriceMin ? parseOfferWatchPrice(rawPriceMin) : null;
  const parsedMax = rawPriceMax ? parseOfferWatchPrice(rawPriceMax) : null;
  if (rawPriceMin && !parsedMin) errors.priceMin = 'invalid_price';
  if (rawPriceMax && !parsedMax) errors.priceMax = 'invalid_price';
  const priceMin = parsedMin?.cents ? parsedMin : null;
  const priceMax = parsedMax?.cents ? parsedMax : null;
  if (priceMin && priceMax && priceMin.cents > priceMax.cents) {
    errors.priceMax = 'price_order';
  }

  const hasPrice = hasOfferWatchPriceFilter(draft);
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

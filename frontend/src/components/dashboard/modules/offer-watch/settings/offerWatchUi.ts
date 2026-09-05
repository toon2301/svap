'use client';

import {
  getOfferCountryFallbackName,
  normalizeOfferCountryCode,
} from '@/shared/countryRegistry';
import type {
  OfferWatch,
  OfferWatchErrorKind,
  OfferWatchValidationCode,
  OfferWatchValidationErrors,
} from '../types';

export type OfferWatchTranslate = (key: string, fallback?: string) => string;

export function slugifyOfferWatchLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function normalizeOfferWatchSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

export function offerWatchCategoryLabel(
  t: OfferWatchTranslate,
  category: string,
): string {
  return t(
    `skillsCatalog.categories.${slugifyOfferWatchLabel(category)}`,
    category,
  );
}

export function offerWatchSubcategoryLabel(
  t: OfferWatchTranslate,
  category: string,
  subcategory: string,
): string {
  return t(
    `skillsCatalog.subcategories.${slugifyOfferWatchLabel(category)}.${slugifyOfferWatchLabel(subcategory)}`,
    subcategory,
  );
}

export function offerWatchCountryLabel(
  locale: string,
  countryCode: string,
): string {
  const normalized = normalizeOfferCountryCode(countryCode);
  if (!normalized) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(normalized)
      || getOfferCountryFallbackName(normalized)
      || normalized;
  } catch {
    return getOfferCountryFallbackName(normalized) || normalized;
  }
}

function formatPriceValue(locale: string, value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch {
    return value.replace(/\.00$/, '');
  }
}

export function offerWatchPriceLabel(
  watch: Pick<OfferWatch, 'priceMin' | 'priceMax' | 'priceCurrency'>,
  locale: string,
  t: OfferWatchTranslate,
): string {
  const minimum = watch.priceMin
    ? formatPriceValue(locale, watch.priceMin)
    : null;
  const maximum = watch.priceMax
    ? formatPriceValue(locale, watch.priceMax)
    : null;
  const currency = watch.priceCurrency;

  if (minimum && maximum) return `${minimum} – ${maximum} ${currency}`;
  if (minimum) return `${t('offerWatch.priceFromPrefix', 'Od')} ${minimum} ${currency}`;
  if (maximum) return `${t('offerWatch.priceToPrefix', 'Do')} ${maximum} ${currency}`;
  return t('offerWatch.anyPrice', 'Bez cenového obmedzenia');
}

export function offerWatchValidationMessage(
  t: OfferWatchTranslate,
  field: keyof OfferWatchValidationErrors,
  code: OfferWatchValidationCode,
): string {
  if (field === 'category' || field === 'subcategory') {
    return code === 'required'
      ? t('offerWatch.errors.categoryRequired', 'Vyber podkategóriu.')
      : t('offerWatch.errors.categoryInvalid', 'Vyber platnú podkategóriu zo zoznamu.');
  }
  if (field === 'countryCode') {
    return t('offerWatch.errors.countryRequired', 'Vyber krajinu.');
  }
  if (field === 'districtCode') {
    return t('offerWatch.errors.districtInvalid', 'Vyber platný okres zo zoznamu.');
  }
  if (field === 'priceMin' || field === 'priceMax') {
    return code === 'price_order'
      ? t('offerWatch.errors.priceOrder', 'Cena do musí byť rovnaká alebo vyššia ako cena od.')
      : t('offerWatch.errors.priceInvalid', 'Zadaj platnú nezápornú cenu s najviac dvoma desatinnými miestami.');
  }
  return code === 'currency_required'
    ? t('offerWatch.errors.currencyRequired', 'Pri cenovom rozsahu vyber menu.')
    : t('offerWatch.errors.currencyInvalid', 'Vyber podporovanú menu.');
}

export function offerWatchErrorMessage(
  t: OfferWatchTranslate,
  kind: OfferWatchErrorKind,
): string {
  const messages: Record<OfferWatchErrorKind, [string, string]> = {
    validation: ['offerWatch.errors.validation', 'Skontroluj označené údaje a skús to znova.'],
    duplicate: ['offerWatch.errors.duplicate', 'Takéto sledovanie už máš vytvorené.'],
    limit: ['offerWatch.errors.limit', 'Môžeš mať maximálne 5 sledovaní.'],
    not_found: ['offerWatch.errors.notFound', 'Toto sledovanie už nie je dostupné.'],
    unauthorized: ['offerWatch.errors.unauthorized', 'Pre pokračovanie sa znovu prihlás.'],
    forbidden: ['offerWatch.errors.forbidden', 'Na túto akciu nemáš oprávnenie.'],
    rate_limited: ['offerWatch.errors.rateLimited', 'Príliš veľa pokusov. Skús to znova neskôr.'],
    network: ['offerWatch.errors.network', 'Nepodarilo sa spojiť so serverom. Skús to znova.'],
    cancelled: ['offerWatch.errors.cancelled', 'Požiadavka bola zrušená.'],
    busy: ['offerWatch.errors.busy', 'Počkaj na dokončenie predchádzajúcej zmeny.'],
    invalid_response: ['offerWatch.errors.invalidResponse', 'Server vrátil neplatnú odpoveď. Skús to znova.'],
    unknown: ['offerWatch.errors.unknown', 'Sledovanie sa nepodarilo uložiť. Skús to znova.'],
  };
  const [key, fallback] = messages[kind];
  return t(key, fallback);
}

export function validationErrorsFromApiFields(
  fields: string[],
): OfferWatchValidationErrors {
  const errors: OfferWatchValidationErrors = {};
  if (fields.includes('category')) errors.category = 'invalid_selection';
  if (fields.includes('subcategory')) errors.subcategory = 'invalid_selection';
  if (fields.includes('country_code')) errors.countryCode = 'required';
  if (fields.includes('district_code')) errors.districtCode = 'invalid_district';
  if (fields.includes('price_min')) errors.priceMin = 'invalid_price';
  if (fields.includes('price_max')) errors.priceMax = 'invalid_price';
  if (fields.includes('price_currency')) errors.priceCurrency = 'unsupported_currency';
  return errors;
}

export function focusFirstOfferWatchError(
  idPrefix: string,
  errors: OfferWatchValidationErrors,
): void {
  const targets: Array<[keyof OfferWatchValidationErrors, string]> = [
    ['category', 'category'],
    ['subcategory', 'category'],
    ['countryCode', 'country'],
    ['districtCode', 'district'],
    ['priceMin', 'price-min'],
    ['priceMax', 'price-max'],
    ['priceCurrency', 'currency'],
  ];
  const target = targets.find(([field]) => Boolean(errors[field]));
  if (!target || typeof document === 'undefined') return;
  requestAnimationFrame(() => document.getElementById(`${idPrefix}-${target[1]}`)?.focus());
}

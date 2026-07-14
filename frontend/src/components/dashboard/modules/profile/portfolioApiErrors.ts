/**
 * Preklad BE portfolio chýb podľa stabilného `code`/`codes` z API.
 *
 * BE vracia `{"error": text, "code": stable_code}` (dict chyby) a pri field
 * validácii additívnu mapu `{"codes": {field: [code]}}` popri pôvodnom
 * `{field: [text]}`. Tu sa kód mapuje na preklad v jazyku používateľa;
 * neznámy/chýbajúci kód degraduje na pôvodný BE text (spätná kompatibilita).
 */

import {
  PORTFOLIO_ITEMS_MAX_COUNT,
  portfolioErrorMessageFromApi,
  portfolioFormErrorsFromApi,
  type PortfolioFormErrors,
  type PortfolioFormField,
} from './portfolioFormUtils';

type Translator = (key: string, fallback?: string) => string;

type ApiErrorData = Record<string, unknown>;

// Top-level `code` -> translation key (+ voliteľný {max} placeholder).
const TOP_LEVEL_CODE_KEYS: Record<string, { key: string; max?: number }> = {
  portfolio_items_limit_reached: {
    key: 'portfolio.itemsLimitReached',
    max: PORTFOLIO_ITEMS_MAX_COUNT,
  },
  portfolio_images_limit_reached: { key: 'portfolio.maxPhotosLimit' },
  portfolio_item_not_found: { key: 'portfolio.itemNotFound' },
  user_not_found: { key: 'portfolio.ownerNotFound' },
};

// Field-level kód -> translation key (per pole; reuse existujúcich kľúčov).
const FIELD_CODE_KEYS: Record<PortfolioFormField, Record<string, string>> = {
  title: {
    required: 'portfolio.titleRequired',
    blank: 'portfolio.titleRequired',
    max_length: 'portfolio.titleTooLong',
    html_not_allowed: 'portfolio.htmlNotAllowed',
  },
  category: {
    required: 'portfolio.categoryRequired',
    blank: 'portfolio.categoryRequired',
    invalid_category: 'portfolio.invalidCategory',
    html_not_allowed: 'portfolio.htmlNotAllowed',
  },
  description: {
    max_length: 'portfolio.descriptionTooLong',
    html_not_allowed: 'portfolio.htmlNotAllowed',
  },
};

const FORM_FIELDS: readonly PortfolioFormField[] = ['title', 'category', 'description'];

function apiErrorData(error: unknown): ApiErrorData | null {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return data && typeof data === 'object' ? (data as ApiErrorData) : null;
}

/** t() vracia kľúč, keď preklad chýba – vtedy padáme na BE text. */
function translateKey(t: Translator, key: string): string | null {
  const translated = t(key);
  return translated !== key ? translated : null;
}

export function portfolioItemsLimitMessage(t: Translator): string {
  const translated = translateKey(t, 'portfolio.itemsLimitReached');
  if (!translated) return '';
  return translated.replace('{max}', String(PORTFOLIO_ITEMS_MAX_COUNT));
}

/** Top-level chybová hláška: preklad podľa `code`, fallback na BE text. */
export function translatePortfolioApiError(
  t: Translator,
  error: unknown,
  fallback: string,
): string {
  const code = apiErrorData(error)?.code;
  const entry = typeof code === 'string' ? TOP_LEVEL_CODE_KEYS[code] : undefined;
  if (entry) {
    const translated = translateKey(t, entry.key);
    if (translated) {
      return entry.max != null
        ? translated.replace('{max}', String(entry.max))
        : translated;
    }
  }
  return portfolioErrorMessageFromApi(error, fallback);
}

/** Field errors: preklad podľa `codes` mapy, fallback na BE texty. */
export function translatePortfolioFormErrors(
  t: Translator,
  error: unknown,
): PortfolioFormErrors {
  const rawErrors = portfolioFormErrorsFromApi(error);
  const codes = apiErrorData(error)?.codes;
  if (!codes || typeof codes !== 'object') return rawErrors;

  const translatedErrors: PortfolioFormErrors = { ...rawErrors };
  FORM_FIELDS.forEach((field) => {
    if (!rawErrors[field]) return;
    const fieldCodes = (codes as Record<string, unknown>)[field];
    const code = Array.isArray(fieldCodes)
      ? fieldCodes.find((value): value is string => typeof value === 'string')
      : undefined;
    const key = code ? FIELD_CODE_KEYS[field][code] : undefined;
    if (!key) return;
    const translated = translateKey(t, key);
    if (translated) translatedErrors[field] = translated;
  });
  return translatedErrors;
}

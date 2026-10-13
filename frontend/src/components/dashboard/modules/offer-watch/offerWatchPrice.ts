import type { OfferWatchDraft } from './types';

const DECIMAL_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

type ParsedPrice = { normalized: string; cents: number };

export function parseOfferWatchPrice(value: string): ParsedPrice | null {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) return null;

  const [integerPart, decimalPart = ''] = trimmed.replace(',', '.').split('.');
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '');
  if (normalizedInteger.length > 8) return null;
  const normalizedDecimal = decimalPart.replace(/0+$/, '');
  return {
    normalized: normalizedDecimal
      ? `${normalizedInteger}.${normalizedDecimal}`
      : normalizedInteger,
    cents: Number(normalizedInteger) * 100 + Number(decimalPart.padEnd(2, '0')),
  };
}

/** Commit only valid zero bounds; retain unfinished or invalid input for validation. */
export function normalizeOfferWatchZeroPrice(value: string): string {
  return parseOfferWatchPrice(value)?.cents === 0 ? '' : value;
}

export function hasOfferWatchPriceFilter(
  draft: Pick<OfferWatchDraft, 'priceMin' | 'priceMax'>,
): boolean {
  return Boolean(
    normalizeOfferWatchZeroPrice(draft.priceMin).trim()
    || normalizeOfferWatchZeroPrice(draft.priceMax).trim(),
  );
}

/** Used on load or blur, never while the user is typing a decimal fraction. */
export function normalizeOfferWatchZeroBounds(draft: OfferWatchDraft): OfferWatchDraft {
  const priceMin = normalizeOfferWatchZeroPrice(draft.priceMin);
  const priceMax = normalizeOfferWatchZeroPrice(draft.priceMax);
  return {
    ...draft,
    priceMin,
    priceMax,
    priceCurrency: priceMin.trim() || priceMax.trim() ? draft.priceCurrency : '',
  };
}

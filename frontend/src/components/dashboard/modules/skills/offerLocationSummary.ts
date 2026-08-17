import {
  getOfferCountryFallbackName,
  normalizeOfferCountryCode,
} from '@/shared/countryRegistry';

type OfferLocationSummaryParams = {
  location?: unknown;
  district?: unknown;
  countryCode?: unknown;
  locale: string;
  emptyLabel: string;
};

export function getOfferCountryDisplayName(
  countryCode: unknown,
  locale: string,
): string {
  const normalized = normalizeOfferCountryCode(countryCode);
  if (!normalized) return '';

  try {
    return (
      new Intl.DisplayNames([locale], { type: 'region' }).of(normalized) ||
      getOfferCountryFallbackName(normalized)
    );
  } catch {
    return getOfferCountryFallbackName(normalized);
  }
}

export function getOfferLocationSummary({
  location,
  district,
  countryCode,
  locale,
  emptyLabel,
}: OfferLocationSummaryParams): string {
  const locationLabel = String(location || '').trim();
  if (locationLabel) return locationLabel;

  const districtLabel = String(district || '').trim();
  if (districtLabel) return districtLabel;

  return getOfferCountryDisplayName(countryCode, locale) || emptyLabel;
}

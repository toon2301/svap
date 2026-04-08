'use client';

import districtRegistryJson from './districtRegistry.json';

export type OfferCountryCode = 'SK' | 'CZ' | 'PL' | 'HU' | 'AT' | 'DE';

export type DistrictOption = {
  code: string;
  label: string;
};

const SUPPORTED_COUNTRIES: OfferCountryCode[] = ['SK', 'CZ', 'PL', 'HU', 'AT', 'DE'];

const districtRegistry = districtRegistryJson as Record<OfferCountryCode, DistrictOption[]>;

export function normalizeOfferCountryCode(value: unknown): OfferCountryCode | '' {
  const raw = String(value || '').trim().toUpperCase();
  return SUPPORTED_COUNTRIES.includes(raw as OfferCountryCode)
    ? (raw as OfferCountryCode)
    : '';
}

export function getSupportedOfferCountries(): OfferCountryCode[] {
  return [...SUPPORTED_COUNTRIES];
}

export function getDistrictOptions(countryCode: unknown): DistrictOption[] {
  const normalized = normalizeOfferCountryCode(countryCode);
  if (!normalized) {
    return [];
  }
  return districtRegistry[normalized] ?? [];
}

export function removeDistrictDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function findDistrictByCode(
  countryCode: unknown,
  districtCode: unknown,
): DistrictOption | null {
  const normalizedCode = String(districtCode || '').trim().toLowerCase();
  if (!normalizedCode) {
    return null;
  }
  return (
    getDistrictOptions(countryCode).find((option) => option.code === normalizedCode) ??
    null
  );
}

export function findDistrictByLabel(
  countryCode: unknown,
  districtLabel: unknown,
): DistrictOption | null {
  const normalizedLabel = removeDistrictDiacritics(String(districtLabel || ''));
  if (!normalizedLabel) {
    return null;
  }
  return (
    getDistrictOptions(countryCode).find(
      (option) => removeDistrictDiacritics(option.label) === normalizedLabel,
    ) ?? null
  );
}

export function getOfferDistrictLabel(
  countryCode: unknown,
  districtCode: unknown,
): string {
  return findDistrictByCode(countryCode, districtCode)?.label ?? '';
}

export function getDefaultOfferCountryCode(countryCode: unknown): OfferCountryCode {
  return normalizeOfferCountryCode(countryCode) || 'SK';
}

export function isValidOfferDistrictSelection(params: {
  countryCode?: unknown;
  districtCode?: unknown;
  districtLabel?: unknown;
}): boolean {
  const countryCode = normalizeOfferCountryCode(params.countryCode);
  const districtCode = String(params.districtCode || '').trim().toLowerCase();
  const districtLabel = String(params.districtLabel || '').trim();

  if (!districtCode && !districtLabel) {
    return true;
  }
  if (!countryCode || !districtCode) {
    return false;
  }
  const resolved = findDistrictByCode(countryCode, districtCode);
  if (!resolved) {
    return false;
  }
  if (!districtLabel) {
    return true;
  }
  return removeDistrictDiacritics(resolved.label) === removeDistrictDiacritics(districtLabel);
}

function inferCountryFromDistrictCode(districtCode: unknown): OfferCountryCode | '' {
  const normalizedCode = String(districtCode || '').trim().toLowerCase();
  if (!normalizedCode) {
    return '';
  }

  const matches = SUPPORTED_COUNTRIES.filter((countryCode) =>
    getDistrictOptions(countryCode).some((option) => option.code === normalizedCode),
  );

  return matches.length === 1 ? matches[0] : '';
}

function inferCountryFromDistrictLabel(districtLabel: unknown): OfferCountryCode | '' {
  const normalizedLabel = removeDistrictDiacritics(String(districtLabel || ''));
  if (!normalizedLabel) {
    return '';
  }

  const matches = SUPPORTED_COUNTRIES.filter((countryCode) =>
    getDistrictOptions(countryCode).some(
      (option) => removeDistrictDiacritics(option.label) === normalizedLabel,
    ),
  );

  return matches.length === 1 ? matches[0] : '';
}

export function resolveInitialOfferDistrictSelection(params: {
  countryCode?: unknown;
  districtCode?: unknown;
  districtLabel?: unknown;
  fallbackCountryCode?: unknown;
}): {
  countryCode: OfferCountryCode;
  districtCode: string;
  districtLabel: string;
} {
  const explicitCountryCode = normalizeOfferCountryCode(params.countryCode);
  const inferredCountryCode =
    explicitCountryCode ||
    inferCountryFromDistrictCode(params.districtCode) ||
    inferCountryFromDistrictLabel(params.districtLabel) ||
    getDefaultOfferCountryCode(params.fallbackCountryCode);

  const districtCode = String(params.districtCode || '').trim().toLowerCase();
  const districtLabel = String(params.districtLabel || '').trim();

  const byCode = findDistrictByCode(inferredCountryCode, districtCode);
  if (byCode) {
    return {
      countryCode: inferredCountryCode,
      districtCode: byCode.code,
      districtLabel: byCode.label,
    };
  }

  const byLabel = findDistrictByLabel(inferredCountryCode, districtLabel);
  if (byLabel) {
    return {
      countryCode: inferredCountryCode,
      districtCode: byLabel.code,
      districtLabel: byLabel.label,
    };
  }

  return {
    countryCode: inferredCountryCode,
    districtCode: '',
    districtLabel,
  };
}

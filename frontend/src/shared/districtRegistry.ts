'use client';

// Bundled copy; canonical source: backend/accounts/data/district_registry.json
import districtRegistryJson from './districtRegistry.json';
import {
  normalizeOfferCountryCode,
  type OfferCountryCode,
} from './countryRegistry';

export { getSupportedOfferCountries, normalizeOfferCountryCode } from './countryRegistry';
export type { OfferCountryCode } from './countryRegistry';

export type DistrictOption = {
  code: string;
  label: string;
  officialCode: string;
  active: boolean;
  aliases: string[];
};

type RawDistrictOption = {
  code?: unknown;
  label?: unknown;
  official_code?: unknown;
  active?: unknown;
  aliases?: unknown;
};

const districtRegistry = Object.fromEntries(
  Object.entries(districtRegistryJson as Record<string, unknown>)
    .filter(([countryCode, entries]) => Boolean(normalizeOfferCountryCode(countryCode)) && Array.isArray(entries))
    .map(([countryCode, entries]) => [
      countryCode,
      (entries as RawDistrictOption[])
        .map<DistrictOption>((entry) => ({
          code: String(entry.code || '').trim().toLowerCase(),
          label: String(entry.label || '').trim(),
          officialCode: String(entry.official_code || '').trim(),
          active: entry.active !== false,
          aliases: Array.isArray(entry.aliases)
            ? entry.aliases.map((alias) => String(alias || '').trim()).filter(Boolean)
            : [],
        }))
        .filter((entry) => Boolean(entry.code && entry.label)),
    ]),
) as Record<string, DistrictOption[]>;
const DISTRICT_COUNTRIES = Object.keys(districtRegistry)
  .map(normalizeOfferCountryCode)
  .filter((code): code is OfferCountryCode => Boolean(code));

export function getDistrictOptions(
  countryCode: unknown,
  options: { includeInactive?: boolean } = {},
): DistrictOption[] {
  const normalized = normalizeOfferCountryCode(countryCode);
  if (!normalized) {
    return [];
  }
  const entries = districtRegistry[normalized] ?? [];
  return options.includeInactive ? entries : entries.filter((entry) => entry.active);
}

export function removeDistrictDiacritics(value: string): string {
  return value
    .replace(/[Łł]/g, 'l')
    .replace(/[\u00df\u1e9e]/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function findDistrictByCode(
  countryCode: unknown,
  districtCode: unknown,
  options: { includeInactive?: boolean } = {},
): DistrictOption | null {
  const normalizedCode = String(districtCode || '').trim().toLowerCase();
  if (!normalizedCode) {
    return null;
  }
  return (
    getDistrictOptions(countryCode, options).find((option) => option.code === normalizedCode) ??
    null
  );
}

export function findDistrictByLabel(
  countryCode: unknown,
  districtLabel: unknown,
  options: { includeInactive?: boolean } = {},
): DistrictOption | null {
  const normalizedLabel = removeDistrictDiacritics(String(districtLabel || ''));
  if (!normalizedLabel) {
    return null;
  }
  const matches = getDistrictOptions(countryCode, options).filter(
    (option) =>
      removeDistrictDiacritics(option.label) === normalizedLabel ||
      option.aliases.some(
        (alias) => removeDistrictDiacritics(alias) === normalizedLabel,
      ),
  );

  return matches.find((option) => option.active) ?? matches[0] ?? null;
}

export function getOfferDistrictLabel(
  countryCode: unknown,
  districtCode: unknown,
): string {
  return findDistrictByCode(countryCode, districtCode, { includeInactive: true })?.label ?? '';
}

export function isInactiveOfferDistrictCode(
  countryCode: unknown,
  districtCode: unknown,
): boolean {
  const entry = findDistrictByCode(countryCode, districtCode, { includeInactive: true });
  return Boolean(entry && !entry.active);
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

  const matches = DISTRICT_COUNTRIES.filter((countryCode) =>
    getDistrictOptions(countryCode, { includeInactive: true }).some(
      (option) => option.code === normalizedCode,
    ),
  );

  return matches.length === 1 ? matches[0] : '';
}

function inferCountryFromDistrictLabel(districtLabel: unknown): OfferCountryCode | '' {
  const normalizedLabel = removeDistrictDiacritics(String(districtLabel || ''));
  if (!normalizedLabel) {
    return '';
  }

  const matches = DISTRICT_COUNTRIES.filter((countryCode) =>
    getDistrictOptions(countryCode, { includeInactive: true }).some(
      (option) =>
        removeDistrictDiacritics(option.label) === normalizedLabel ||
        option.aliases.some(
          (alias) => removeDistrictDiacritics(alias) === normalizedLabel,
        ),
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

  const byCode = findDistrictByCode(inferredCountryCode, districtCode, {
    includeInactive: true,
  });
  if (byCode) {
    return {
      countryCode: inferredCountryCode,
      districtCode: byCode.code,
      districtLabel: byCode.label,
    };
  }

  const byLabel = findDistrictByLabel(inferredCountryCode, districtLabel, {
    includeInactive: true,
  });
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

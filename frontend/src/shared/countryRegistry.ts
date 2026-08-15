'use client';

// Bundled copy; canonical source: backend/accounts/data/country_registry.json
import countryRegistryJson from './countryRegistry.json';

export type OfferCountryCode = string;

export type OfferCountryEntry = {
  code: OfferCountryCode;
  name: string;
  standard: 'iso-3166-1' | 'compatibility';
};

type CountryRegistryData = {
  countries?: unknown;
};

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

const rawCountryEntries = (countryRegistryJson as CountryRegistryData).countries;

const COUNTRY_ENTRIES: OfferCountryEntry[] = (
  Array.isArray(rawCountryEntries) ? rawCountryEntries : []
)
  .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
  .map<OfferCountryEntry>((entry) => ({
    code: String(entry.code || '').trim().toUpperCase(),
    name: String(entry.name || '').trim(),
    standard: entry.standard === 'compatibility' ? 'compatibility' : 'iso-3166-1',
  }))
  .filter(
    (entry) => COUNTRY_CODE_PATTERN.test(entry.code) && Boolean(entry.name),
  );

const COUNTRY_BY_CODE = new Map(
  COUNTRY_ENTRIES.map((entry) => [entry.code, entry] as const),
);

export function normalizeOfferCountryCode(value: unknown): OfferCountryCode | '' {
  const raw = String(value || '').trim().toUpperCase();
  return COUNTRY_BY_CODE.has(raw) ? raw : '';
}

export function getOfferCountryEntries(): OfferCountryEntry[] {
  return COUNTRY_ENTRIES.map((entry) => ({ ...entry }));
}

export function getSupportedOfferCountries(): OfferCountryCode[] {
  return COUNTRY_ENTRIES.map((entry) => entry.code);
}

export function getOfferCountryFallbackName(countryCode: unknown): string {
  const normalized = normalizeOfferCountryCode(countryCode);
  return normalized ? COUNTRY_BY_CODE.get(normalized)?.name ?? normalized : '';
}

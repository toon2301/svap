import { normalizeOfferCountryCode } from '@/shared/countryRegistry';
import {
  isGeoDetectionCacheFresh,
  readGeoDetectionCache,
  readLastManualOfferCountry,
} from '@/shared/offerCountryPreference';

export type SearchDiagnosticSource = 'none' | 'network' | 'cache';
export type SearchDiagnosticState = 'pending' | 'complete' | 'error' | 'cancelled' | 'empty';

export interface SearchDiagnosticInput {
  country: string | null;
  queryLength: number;
  offerType: 'all' | 'offer' | 'seeking';
  onlyMyLocation: boolean;
  priceMinSet: boolean;
  priceMaxSet: boolean;
}

export interface SearchDiagnosticSnapshot extends SearchDiagnosticInput {
  source: SearchDiagnosticSource;
  state: SearchDiagnosticState;
  httpStatus: number | null;
  offersCount: number | null;
  usersCount: number | null;
  validCollections: boolean | null;
  manualCountrySnapshot: string | null;
  ipCountrySnapshot: string | null;
  ipCacheFresh: boolean | null;
}

export type SearchDiagnosticUpdate = Pick<SearchDiagnosticSnapshot, 'source' | 'state'> &
  Partial<Pick<SearchDiagnosticSnapshot, 'httpStatus' | 'offersCount' | 'usersCount' | 'validCollections'>>;

export type SearchDiagnosticReporter = (update: SearchDiagnosticUpdate) => void;

/** Retain only a recognized country code, never arbitrary storage or request text. */
export function diagnosticCountry(value: unknown): string | null {
  return normalizeOfferCountryCode(value) || null;
}

/** Distinguish a real HTTP response from a cache hit, abort, or network failure. */
export function diagnosticHttpStatus(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
    ? value : null;
}

/** Read local preference codes only; these snapshots do not establish historical provenance. */
export function createSearchDiagnosticSnapshot(input: SearchDiagnosticInput): SearchDiagnosticSnapshot {
  const geo = readGeoDetectionCache();
  return {
    country: diagnosticCountry(input.country),
    queryLength: input.queryLength,
    offerType: input.offerType,
    onlyMyLocation: input.onlyMyLocation,
    priceMinSet: input.priceMinSet,
    priceMaxSet: input.priceMaxSet,
    source: 'none',
    state: 'pending',
    httpStatus: null,
    offersCount: null,
    usersCount: null,
    validCollections: null,
    manualCountrySnapshot: readLastManualOfferCountry() || null,
    ipCountrySnapshot: geo?.country ?? null,
    ipCacheFresh: geo ? isGeoDetectionCacheFresh(geo) : null,
  };
}

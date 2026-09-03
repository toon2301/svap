'use client';

import { api } from '@/lib/api';
import { normalizeOfferCountryCode } from '@/shared/countryRegistry';
import { mapApiOfferToProfileOffer } from '../profile/profileOfferMapper';
import {
  OFFER_WATCH_PRICE_CURRENCIES,
  type OfferWatch,
  type OfferWatchErrorKind,
  type OfferWatchInput,
  type OfferWatchMatch,
  type OfferWatchMatchesPage,
  type OfferWatchPriceCurrency,
} from './types';

const OFFER_WATCHES_PATH = '/auth/offer-watches/';

type ApiErrorShape = {
  code?: unknown;
  name?: unknown;
  response?: {
    status?: unknown;
    data?: unknown;
  };
};

type OfferWatchApiPayload = {
  category: string;
  subcategory: string;
  is_seeking: boolean;
  country_code: string;
  district_code: string;
  price_min: string | null;
  price_max: string | null;
  price_currency: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validWatchId(watchId: number): boolean {
  return Number.isSafeInteger(watchId) && watchId > 0;
}

function assertWatchId(watchId: number): void {
  if (!validWatchId(watchId)) throw new TypeError('Invalid offer watch id.');
}

function watchDetailPath(watchId: number): string {
  assertWatchId(watchId);
  return `${OFFER_WATCHES_PATH}${watchId}/`;
}

function watchMatchesPath(watchId: number): string {
  assertWatchId(watchId);
  return `${OFFER_WATCHES_PATH}${watchId}/matches/`;
}

function isPriceCurrency(value: unknown): value is OfferWatchPriceCurrency {
  return typeof value === 'string'
    && OFFER_WATCH_PRICE_CURRENCIES.some((currency) => currency === value);
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw invalidResponseError();
  return value;
}

function requireDate(record: Record<string, unknown>, key: string): string {
  const value = requireString(record, key);
  if (!value || Number.isNaN(Date.parse(value))) throw invalidResponseError();
  return value;
}

function nullablePrice(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === 'string' && /^\d{1,8}(?:\.\d{2})$/.test(value)) {
    return value;
  }
  throw invalidResponseError();
}

function parseOfferWatch(value: unknown): OfferWatch {
  if (!isRecord(value)) throw invalidResponseError();
  const id = value.id;
  const countryCode = normalizeOfferCountryCode(value.country_code);
  const priceCurrency = value.price_currency;
  const category = requireString(value, 'category');
  const subcategory = requireString(value, 'subcategory');
  const priceMin = nullablePrice(value.price_min);
  const priceMax = nullablePrice(value.price_max);
  const hasPrice = priceMin !== null || priceMax !== null;
  if (
    typeof id !== 'number'
    || !validWatchId(id)
    || typeof value.is_seeking !== 'boolean'
    || !countryCode
    || (priceCurrency !== '' && !isPriceCurrency(priceCurrency))
    || !category.trim()
    || !subcategory.trim()
    || (hasPrice ? !isPriceCurrency(priceCurrency) : priceCurrency !== '')
  ) {
    throw invalidResponseError();
  }

  return {
    id,
    category,
    subcategory,
    isSeeking: value.is_seeking,
    countryCode,
    districtCode: requireString(value, 'district_code'),
    districtLabel: requireString(value, 'district_label'),
    priceMin,
    priceMax,
    priceCurrency,
    createdAt: requireDate(value, 'created_at'),
    updatedAt: requireDate(value, 'updated_at'),
  };
}

function parseMatch(value: unknown): OfferWatchMatch {
  if (!isRecord(value)) throw invalidResponseError();
  const id = value.id;
  const category = value.category;
  const subcategory = value.subcategory;
  if (
    typeof id !== 'number'
    || !Number.isSafeInteger(id)
    || id <= 0
    || typeof category !== 'string'
    || typeof subcategory !== 'string'
  ) {
    throw invalidResponseError();
  }
  return {
    offer: mapApiOfferToProfileOffer(value),
    createdAt: requireDate(value, 'created_at'),
  };
}

function cursorFromUrl(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw invalidResponseError();
  try {
    const cursor = new URL(value, 'https://svaply.local').searchParams.get('cursor');
    if (!cursor) throw invalidResponseError();
    return cursor;
  } catch {
    throw invalidResponseError();
  }
}

function parseMatchesPage(value: unknown): OfferWatchMatchesPage {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw invalidResponseError();
  }
  return {
    results: value.results.map(parseMatch),
    nextCursor: cursorFromUrl(value.next),
    previousCursor: cursorFromUrl(value.previous),
  };
}

function toApiPayload(input: OfferWatchInput): OfferWatchApiPayload {
  return {
    category: input.category,
    subcategory: input.subcategory,
    is_seeking: input.isSeeking,
    country_code: input.countryCode,
    district_code: input.districtCode,
    price_min: input.priceMin,
    price_max: input.priceMax,
    price_currency: input.priceCurrency,
  };
}

function errorFields(data: unknown): string[] {
  if (!isRecord(data)) return [];
  return Object.keys(data).filter((key) => key !== 'code' && key !== 'error');
}

function invalidResponseError(): OfferWatchApiError {
  return new OfferWatchApiError('invalid_response');
}

export class OfferWatchApiError extends Error {
  readonly kind: OfferWatchErrorKind;
  readonly status: number | null;
  readonly fields: string[];

  constructor(
    kind: OfferWatchErrorKind,
    options: { status?: number | null; fields?: string[] } = {},
  ) {
    super(`Offer watch request failed: ${kind}`);
    this.name = 'OfferWatchApiError';
    this.kind = kind;
    this.status = options.status ?? null;
    this.fields = options.fields ?? [];
  }
}

export function normalizeOfferWatchApiError(error: unknown): OfferWatchApiError {
  if (error instanceof OfferWatchApiError) return error;
  const shape = error as ApiErrorShape;
  const status = typeof shape?.response?.status === 'number'
    ? shape.response.status
    : null;
  const data = shape?.response?.data;
  const code = isRecord(data) && typeof data.code === 'string' ? data.code : '';

  if (shape?.code === 'ERR_CANCELED' || shape?.name === 'CanceledError') {
    return new OfferWatchApiError('cancelled');
  }
  if (code === 'duplicate_offer_watch') {
    return new OfferWatchApiError('duplicate', { status });
  }
  if (code === 'offer_watch_limit_reached') {
    return new OfferWatchApiError('limit', { status });
  }
  if (code === 'offer_watch_not_found' || status === 404) {
    return new OfferWatchApiError('not_found', { status });
  }
  if (code === 'offer_watch_validation_failed' || status === 400) {
    return new OfferWatchApiError('validation', {
      status,
      fields: errorFields(data),
    });
  }
  if (status === 401) return new OfferWatchApiError('unauthorized', { status });
  if (status === 403) return new OfferWatchApiError('forbidden', { status });
  if (status === 429) return new OfferWatchApiError('rate_limited', { status });
  if (!shape?.response) return new OfferWatchApiError('network');
  return new OfferWatchApiError('unknown', { status });
}

async function normalizedRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw normalizeOfferWatchApiError(error);
  }
}

export async function listOfferWatches(signal?: AbortSignal): Promise<OfferWatch[]> {
  return normalizedRequest(async () => {
    const { data } = await api.get(OFFER_WATCHES_PATH, { signal });
    if (!Array.isArray(data)) throw invalidResponseError();
    return data.map(parseOfferWatch);
  });
}

export async function getOfferWatch(
  watchId: number,
  signal?: AbortSignal,
): Promise<OfferWatch> {
  const path = watchDetailPath(watchId);
  return normalizedRequest(async () => {
    const { data } = await api.get(path, { signal });
    return parseOfferWatch(data);
  });
}

export async function createOfferWatch(
  input: OfferWatchInput,
  signal?: AbortSignal,
): Promise<OfferWatch> {
  return normalizedRequest(async () => {
    const { data } = await api.post(
      OFFER_WATCHES_PATH,
      toApiPayload(input),
      { signal },
    );
    return parseOfferWatch(data);
  });
}

export async function updateOfferWatch(
  watchId: number,
  input: OfferWatchInput,
  signal?: AbortSignal,
): Promise<OfferWatch> {
  const path = watchDetailPath(watchId);
  return normalizedRequest(async () => {
    const { data } = await api.patch(
      path,
      toApiPayload(input),
      { signal },
    );
    return parseOfferWatch(data);
  });
}

export async function deleteOfferWatch(
  watchId: number,
  signal?: AbortSignal,
): Promise<void> {
  const path = watchDetailPath(watchId);
  return normalizedRequest(async () => {
    await api.delete(path, { signal });
  });
}

export async function listOfferWatchMatches(
  watchId: number,
  params: { cursor?: string | null; signal?: AbortSignal } = {},
): Promise<OfferWatchMatchesPage> {
  const path = watchMatchesPath(watchId);
  return normalizedRequest(async () => {
    const { data } = await api.get(path, {
      params: params.cursor ? { cursor: params.cursor } : undefined,
      signal: params.signal,
    });
    return parseMatchesPage(data);
  });
}

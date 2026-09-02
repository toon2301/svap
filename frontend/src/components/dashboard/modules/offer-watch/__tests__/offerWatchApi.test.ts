import { api } from '@/lib/api';
import {
  createOfferWatch,
  deleteOfferWatch,
  getOfferWatch,
  listOfferWatchMatches,
  listOfferWatches,
  normalizeOfferWatchApiError,
  OfferWatchApiError,
  updateOfferWatch,
} from '../offerWatchApi';
import type { OfferWatchInput } from '../types';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

const input: OfferWatchInput = {
  category: 'Domácnosť a služby',
  subcategory: 'Maliarske práce',
  isSeeking: false,
  countryCode: 'SK',
  districtCode: 'nitra',
  priceMin: '10',
  priceMax: '20',
  priceCurrency: '€',
};

function apiWatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    category: input.category,
    subcategory: input.subcategory,
    is_seeking: false,
    country_code: 'SK',
    district_code: 'nitra',
    district_label: 'Nitra',
    price_min: '10.00',
    price_max: '20.00',
    price_currency: '€',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
    ...overrides,
  };
}

function apiOffer(id: number) {
  return {
    id,
    category: input.category,
    subcategory: input.subcategory,
    description: '',
    detailed_description: '',
    images: [],
    is_seeking: false,
    created_at: '2026-09-01T08:00:00Z',
  };
}

describe('offerWatchApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps the strict list response to frontend names', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [apiWatch()] });

    await expect(listOfferWatches()).resolves.toEqual([
      {
        id: 7,
        category: input.category,
        subcategory: input.subcategory,
        isSeeking: false,
        countryCode: 'SK',
        districtCode: 'nitra',
        districtLabel: 'Nitra',
        priceMin: '10.00',
        priceMax: '20.00',
        priceCurrency: '€',
        createdAt: '2026-09-01T08:00:00Z',
        updatedAt: '2026-09-01T09:00:00Z',
      },
    ]);
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/offer-watches/', {
      signal: undefined,
    });
  });

  it('sends only the public write fields for create and update', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: apiWatch() });
    mockedApi.patch.mockResolvedValueOnce({ data: apiWatch({ is_seeking: true }) });
    const payload = {
      category: input.category,
      subcategory: input.subcategory,
      is_seeking: false,
      country_code: 'SK',
      district_code: 'nitra',
      price_min: '10',
      price_max: '20',
      price_currency: '€',
    };

    await createOfferWatch(input);
    await updateOfferWatch(7, { ...input, isSeeking: true });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/auth/offer-watches/',
      payload,
      { signal: undefined },
    );
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/auth/offer-watches/7/',
      { ...payload, is_seeking: true },
      { signal: undefined },
    );
  });

  it('uses owned detail paths and rejects invalid ids before a request', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: apiWatch() });
    mockedApi.delete.mockResolvedValueOnce({ data: undefined });

    await getOfferWatch(7);
    await deleteOfferWatch(7);

    expect(mockedApi.get).toHaveBeenCalledWith('/auth/offer-watches/7/', {
      signal: undefined,
    });
    expect(mockedApi.delete).toHaveBeenCalledWith('/auth/offer-watches/7/', {
      signal: undefined,
    });
    await expect(getOfferWatch(0)).rejects.toThrow(TypeError);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('maps results, preserves created time and forwards only the opaque cursor', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        results: [apiOffer(9)],
        next: 'https://api.example.test/api/auth/offer-watches/7/matches/?cursor=next-token',
        previous: null,
      },
    });

    const page = await listOfferWatchMatches(7, { cursor: 'current-token' });

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/auth/offer-watches/7/matches/',
      { params: { cursor: 'current-token' }, signal: undefined },
    );
    expect(page.nextCursor).toBe('next-token');
    expect(page.results[0]).toMatchObject({
      offer: { id: 9 },
      createdAt: '2026-09-01T08:00:00Z',
    });
  });

  it.each([
    ['duplicate_offer_watch', 400, 'duplicate'],
    ['offer_watch_limit_reached', 400, 'limit'],
    ['offer_watch_not_found', 404, 'not_found'],
    ['offer_watch_validation_failed', 400, 'validation'],
  ])('maps backend code %s (%i) to %s', async (code, status, kind) => {
    mockedApi.post.mockRejectedValueOnce({
      response: { status, data: { code, category: ['bad'], error: 'server text' } },
    });

    await expect(createOfferWatch(input)).rejects.toMatchObject({
      kind,
      status,
      ...(kind === 'validation' ? { fields: ['category'] } : {}),
    });
  });

  it('distinguishes auth, rate limit, network and cancellation failures', () => {
    expect(normalizeOfferWatchApiError({ response: { status: 401 } }).kind)
      .toBe('unauthorized');
    expect(normalizeOfferWatchApiError({ response: { status: 403 } }).kind)
      .toBe('forbidden');
    expect(normalizeOfferWatchApiError({ response: { status: 429 } }).kind)
      .toBe('rate_limited');
    expect(normalizeOfferWatchApiError(new Error('offline')).kind).toBe('network');
    expect(normalizeOfferWatchApiError({ code: 'ERR_CANCELED' }).kind)
      .toBe('cancelled');
  });

  it('rejects malformed success bodies instead of leaking partial data', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [apiWatch({ price_min: 10 })] });
    await expect(listOfferWatches()).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('keeps an already normalized error unchanged', () => {
    const error = new OfferWatchApiError('busy');
    expect(normalizeOfferWatchApiError(error)).toBe(error);
  });
});

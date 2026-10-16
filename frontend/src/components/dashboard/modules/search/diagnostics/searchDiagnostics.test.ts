import {
  createSearchDiagnosticSnapshot,
  diagnosticCountry,
  diagnosticHttpStatus,
  type SearchDiagnosticInput,
} from './searchDiagnostics';
import {
  GEO_DETECTION_CACHE_KEY,
  GEO_DETECTION_FAILURE_TTL_MS,
  GEO_DETECTION_SUCCESS_TTL_MS,
  LAST_MANUAL_OFFER_COUNTRY_KEY,
} from '@/shared/offerCountryPreference';

const input: SearchDiagnosticInput = {
  country: 'SK', queryLength: 12, offerType: 'offer', onlyMyLocation: false,
  priceMinSet: true, priceMaxSet: false,
};
const expectedKeys = [
  'country', 'queryLength', 'offerType', 'onlyMyLocation', 'priceMinSet', 'priceMaxSet',
  'source', 'state', 'httpStatus', 'offersCount', 'usersCount', 'validCollections',
  'manualCountrySnapshot', 'ipCountrySnapshot', 'ipCacheFresh',
].sort();

beforeEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

describe('safe country and HTTP evidence', () => {
  it.each([
    ['SK', 'SK'], [' cz ', 'CZ'], ['it', 'IT'], ['AF', 'AF'],
    [null, null], [undefined, null], ['', null], ['ZZ', null],
    ['private-location@example.test', null], [401, null], [{ secret: true }, null],
  ])('retains only a registry country for %p', (value, expected) => {
    expect(diagnosticCountry(value)).toBe(expected);
  });

  it.each([100, 101, 200, 204, 299, 301, 399, 400, 401, 404, 429, 500, 599])(
    'retains real integer HTTP status %s', (status) => {
      expect(diagnosticHttpStatus(status)).toBe(status);
    },
  );

  it.each([undefined, null, 0, 99, 600, -401, 200.5, NaN, Infinity, '200', {}, true])(
    'does not invent a status for %p', (status) => {
      expect(diagnosticHttpStatus(status)).toBeNull();
    },
  );
});

describe('sanitized per-attempt diagnostic snapshot', () => {
  it('starts as pending with no invented source, response, counts or local preference', () => {
    expect(createSearchDiagnosticSnapshot(input)).toEqual({
      ...input, source: 'none', state: 'pending', httpStatus: null,
      offersCount: null, usersCount: null, validCollections: null,
      manualCountrySnapshot: null, ipCountrySnapshot: null, ipCacheFresh: null,
    });
  });

  it('records an absent request country as absent rather than a Slovak fallback', () => {
    expect(createSearchDiagnosticSnapshot({ ...input, country: null }).country).toBeNull();
    expect(createSearchDiagnosticSnapshot({ ...input, country: '' }).country).toBeNull();
  });

  it('keeps the actual request country separate from current manual and IP snapshots', () => {
    localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'pl');
    localStorage.setItem(GEO_DETECTION_CACHE_KEY, JSON.stringify({
      country: 'CZ', status: 'ok', detectedAt: Date.now(),
    }));
    expect(createSearchDiagnosticSnapshot(input)).toMatchObject({
      country: 'SK', manualCountrySnapshot: 'PL', ipCountrySnapshot: 'CZ', ipCacheFresh: true,
    });
  });

  it.each([
    ['ok', GEO_DETECTION_SUCCESS_TTL_MS - 1000, true],
    ['ok', GEO_DETECTION_SUCCESS_TTL_MS + 1000, false],
    ['failed', GEO_DETECTION_FAILURE_TTL_MS - 1000, true],
    ['failed', GEO_DETECTION_FAILURE_TTL_MS + 1000, false],
  ] as const)('reports %s IP-cache freshness after %s ms without treating it as provenance', (status, age, fresh) => {
    localStorage.setItem(GEO_DETECTION_CACHE_KEY, JSON.stringify({
      country: status === 'ok' ? 'CZ' : null, status, detectedAt: Date.now() - age,
    }));
    expect(createSearchDiagnosticSnapshot(input)).toMatchObject({
      country: 'SK', ipCountrySnapshot: status === 'ok' ? 'CZ' : null,
      ipCacheFresh: fresh,
    });
  });

  it.each([
    '{invalid', 'null', '[]', '{}', '"private-value"',
    JSON.stringify({ country: 'CZ', status: 'unknown', detectedAt: 5 }),
    JSON.stringify({ country: 'ZZ', status: 'ok', detectedAt: 5 }),
    JSON.stringify({ country: 'CZ', status: 'ok', detectedAt: 'private-value' }),
  ])('does not expose malformed IP cache %s', (stored) => {
    localStorage.setItem(GEO_DETECTION_CACHE_KEY, stored);
    expect(createSearchDiagnosticSnapshot(input)).toMatchObject({
      ipCountrySnapshot: null, ipCacheFresh: null,
    });
  });

  it('rejects arbitrary manually stored text', () => {
    localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'private-person@example.test');
    expect(createSearchDiagnosticSnapshot(input).manualCountrySnapshot).toBeNull();
  });

  it('remains usable when storage access is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    expect(createSearchDiagnosticSnapshot(input)).toMatchObject({
      country: 'SK', manualCountrySnapshot: null, ipCountrySnapshot: null, ipCacheFresh: null,
    });
  });

  it('copies only the explicit evidence whitelist and does not mutate source input', () => {
    const source = Object.freeze({
      ...input, country: ' sk ', query: 'PRIVATE QUERY', userId: 123,
      accessToken: 'SECRET TOKEN', response: { users: [{ email: 'PRIVATE EMAIL' }] },
      ip: '192.0.2.10', priceMin: 'PRIVATE PRICE',
    });
    const snapshot = createSearchDiagnosticSnapshot(source);
    expect(Object.keys(snapshot).sort()).toEqual(expectedKeys);
    expect(snapshot.country).toBe('SK');
    expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE|SECRET|192\.0\.2|userId|accessToken/);
    expect(source.country).toBe(' sk ');
  });

  it('retains only normalized codes and freshness, not raw local cache metadata', () => {
    localStorage.setItem(GEO_DETECTION_CACHE_KEY, JSON.stringify({
      country: 'CZ', status: 'ok', detectedAt: Date.now(),
      ip: '192.0.2.10', city: 'PRIVATE CITY', email: 'PRIVATE EMAIL',
    }));
    const snapshot = createSearchDiagnosticSnapshot(input);
    expect(Object.keys(snapshot).sort()).toEqual(expectedKeys);
    expect(snapshot.ipCountrySnapshot).toBe('CZ');
    expect(JSON.stringify(snapshot)).not.toMatch(/192\.0\.2|PRIVATE|detectedAt|city|email/);
  });

  it('performs no storage writes or network transmission', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const removeItem = jest.spyOn(Storage.prototype, 'removeItem');
    const clear = jest.spyOn(Storage.prototype, 'clear');
    const xhrOpen = jest.spyOn(XMLHttpRequest.prototype, 'open');
    createSearchDiagnosticSnapshot(input);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
  });
});

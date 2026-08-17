import {
  GEO_DETECTION_CACHE_KEY,
  GEO_DETECTION_SUCCESS_TTL_MS,
  LAST_MANUAL_OFFER_COUNTRY_KEY,
  readGeoDetectionCache,
  resolveNewOfferDraftCountry,
  resolvePreferredOfferCountry,
  writeGeoDetectionCache,
  writeLastManualOfferCountry,
} from './offerCountryPreference';

describe('offer country preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses saved item, manual choice, fresh IP and empty value in that order', () => {
    writeGeoDetectionCache({
      country: 'DE',
      detectedAt: Date.now(),
      status: 'ok',
    });
    writeLastManualOfferCountry('CZ');

    expect(
      resolvePreferredOfferCountry({
        savedCountryCode: 'AT',
        detectedCountryCode: 'SK',
      }),
    ).toBe('AT');
    expect(resolvePreferredOfferCountry({ detectedCountryCode: 'SK' })).toBe('CZ');

    writeLastManualOfferCountry(null);
    expect(resolvePreferredOfferCountry({ detectedCountryCode: 'SK' })).toBe('DE');

    window.localStorage.setItem(
      GEO_DETECTION_CACHE_KEY,
      JSON.stringify({
        country: null,
        detectedAt: Date.now(),
        status: 'failed',
      }),
    );
    expect(resolvePreferredOfferCountry({ detectedCountryCode: 'SK' })).toBe('');
  });

  it('ignores an expired IP country instead of falling back to Slovakia', () => {
    writeGeoDetectionCache({
      country: 'SK',
      detectedAt: Date.now() - GEO_DETECTION_SUCCESS_TTL_MS - 1,
      status: 'ok',
    });

    expect(resolvePreferredOfferCountry({ detectedCountryCode: 'SK' })).toBe('');
  });

  it('stores only the country result and never exact IP metadata', () => {
    writeGeoDetectionCache({
      country: 'IT',
      detectedAt: 123,
      status: 'ok',
      ip: '203.0.113.10',
      city: 'Rome',
    } as never);

    expect(readGeoDetectionCache()).toEqual({
      country: 'IT',
      detectedAt: 123,
      status: 'ok',
    });
    const stored = window.localStorage.getItem(GEO_DETECTION_CACHE_KEY) || '';
    expect(stored).not.toContain('203.0.113.10');
    expect(stored).not.toContain('Rome');
  });

  it('normalizes and clears the last manual country safely', () => {
    expect(writeLastManualOfferCountry(' cz ')).toBe('CZ');
    expect(window.localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('CZ');

    expect(writeLastManualOfferCountry('ZZ')).toBe('');
    expect(window.localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBeNull();
  });

  it('replaces only the legacy bare-SK default on a new draft', () => {
    writeLastManualOfferCountry('PL');

    expect(
      resolveNewOfferDraftCountry({
        initialCountryCode: 'SK',
        districtCode: '',
        district: '',
        location: '',
      }),
    ).toBe('PL');
    expect(
      resolveNewOfferDraftCountry({
        initialCountryCode: 'SK',
        districtCode: 'nitra',
        district: 'Nitra',
      }),
    ).toBe('SK');
    expect(
      resolveNewOfferDraftCountry({
        initialCountryCode: 'HU',
      }),
    ).toBe('HU');
  });
});

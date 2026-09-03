import { skillsCategories } from '@/constants/skillsCategories';
import { getDistrictOptions } from '@/shared/districtRegistry';
import {
  GEO_DETECTION_CACHE_KEY,
  LAST_MANUAL_OFFER_COUNTRY_KEY,
} from '@/shared/offerCountryPreference';
import {
  createOfferWatchDraft,
  selectOfferWatchCategory,
  selectOfferWatchCountry,
  selectOfferWatchDistrict,
  validateOfferWatchDraft,
} from '../offerWatchDraft';
import type { OfferWatch, OfferWatchDraft } from '../types';

const [CATEGORY, SUBCATEGORIES] = Object.entries(skillsCategories)[0]!;
const SUBCATEGORY = SUBCATEGORIES[0]!;
const SK_DISTRICT = getDistrictOptions('SK')[0]!;

function validDraft(overrides: Partial<OfferWatchDraft> = {}): OfferWatchDraft {
  return {
    category: CATEGORY,
    subcategory: SUBCATEGORY,
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    priceMin: '',
    priceMax: '',
    priceCurrency: '',
    ...overrides,
  };
}

function savedWatch(overrides: Partial<OfferWatch> = {}): OfferWatch {
  return {
    id: 12,
    category: CATEGORY,
    subcategory: SUBCATEGORY,
    isSeeking: true,
    countryCode: 'DE',
    districtCode: 'berlin',
    districtLabel: 'Berlin',
    priceMin: '10.00',
    priceMax: '20.00',
    priceCurrency: '€',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T09:00:00Z',
    ...overrides,
  };
}

describe('offerWatchDraft', () => {
  beforeEach(() => window.localStorage.clear());

  it('uses the same manual-country then fresh-IP precedence as new offers', () => {
    window.localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'PL');
    window.localStorage.setItem(
      GEO_DETECTION_CACHE_KEY,
      JSON.stringify({ country: 'CZ', detectedAt: Date.now(), status: 'ok' }),
    );

    expect(createOfferWatchDraft().countryCode).toBe('PL');

    window.localStorage.removeItem(LAST_MANUAL_OFFER_COUNTRY_KEY);
    expect(createOfferWatchDraft().countryCode).toBe('CZ');
  });

  it('uses saved values for editing without changing the offer-country preference', () => {
    window.localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'PL');

    expect(createOfferWatchDraft({ watch: savedWatch() })).toEqual({
      category: CATEGORY,
      subcategory: SUBCATEGORY,
      isSeeking: true,
      countryCode: 'DE',
      districtCode: 'berlin',
      priceMin: '10.00',
      priceMax: '20.00',
      priceCurrency: '€',
    });
    expect(window.localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('PL');
  });

  it('accepts only a canonical category pair', () => {
    const empty = createOfferWatchDraft();
    const selected = selectOfferWatchCategory(empty, CATEGORY, SUBCATEGORY);

    expect(selected.category).toBe(CATEGORY);
    expect(
      selectOfferWatchCategory(selected, CATEGORY, 'Vymyslená podkategória'),
    ).toBe(selected);
    expect(
      validateOfferWatchDraft(validDraft({ subcategory: 'Vymyslená podkategória' })),
    ).toEqual({ ok: false, errors: { subcategory: 'invalid_selection' } });
  });

  it('clears a district only when the country really changes', () => {
    const draft = validDraft({ districtCode: SK_DISTRICT.code });

    expect(selectOfferWatchCountry(draft, 'SK')).toBe(draft);
    expect(selectOfferWatchCountry(draft, 'CZ')).toMatchObject({
      countryCode: 'CZ',
      districtCode: '',
    });
    expect(window.localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBeNull();
  });

  it('accepts only an active district belonging to the selected country', () => {
    const draft = validDraft();
    const selected = selectOfferWatchDistrict(draft, SK_DISTRICT.code.toUpperCase());

    expect(selected.districtCode).toBe(SK_DISTRICT.code);
    expect(selectOfferWatchDistrict(draft, 'not-a-district')).toBe(draft);
    expect(
      validateOfferWatchDraft(validDraft({ districtCode: 'not-a-district' })),
    ).toEqual({ ok: false, errors: { districtCode: 'invalid_district' } });
  });

  it('normalizes comma decimals and accepts inclusive equal price bounds', () => {
    expect(
      validateOfferWatchDraft(validDraft({
        priceMin: ' 0010,50 ',
        priceMax: '10.50',
        priceCurrency: '€',
      })),
    ).toEqual({
      ok: true,
      input: expect.objectContaining({
        priceMin: '10.5',
        priceMax: '10.5',
        priceCurrency: '€',
      }),
    });
  });

  it.each(['-1', '1.234', '1e2', '100000000']) (
    'rejects invalid price %s before the API call',
    (priceMin) => {
      expect(
        validateOfferWatchDraft(validDraft({ priceMin, priceCurrency: '€' })),
      ).toEqual({ ok: false, errors: { priceMin: 'invalid_price' } });
    },
  );

  it('allows leading zeroes when the normalized value fits the backend limit', () => {
    const result = validateOfferWatchDraft(validDraft({
      priceMin: '000000001',
      priceCurrency: '$',
    }));

    expect(result).toEqual({
      ok: true,
      input: expect.objectContaining({ priceMin: '1', priceCurrency: '$' }),
    });
  });

  it('requires a supported currency with a price and clears it without prices', () => {
    expect(
      validateOfferWatchDraft(validDraft({ priceMin: '10' })),
    ).toEqual({ ok: false, errors: { priceCurrency: 'currency_required' } });
    expect(
      validateOfferWatchDraft(validDraft({
        priceMin: '10',
        priceCurrency: 'BTC' as OfferWatchDraft['priceCurrency'],
      })),
    ).toEqual({ ok: false, errors: { priceCurrency: 'unsupported_currency' } });
    expect(
      validateOfferWatchDraft(validDraft({ priceCurrency: 'Ft' })),
    ).toEqual({
      ok: true,
      input: expect.objectContaining({ priceCurrency: '' }),
    });
  });

  it('reports range order and all required selections together', () => {
    expect(
      validateOfferWatchDraft(validDraft({
        category: '',
        subcategory: '',
        countryCode: '',
        priceMin: '20',
        priceMax: '10',
        priceCurrency: 'Kč',
      })),
    ).toEqual({
      ok: false,
      errors: {
        category: 'required',
        subcategory: 'required',
        countryCode: 'required',
        priceMax: 'price_order',
      },
    });
  });
});


import type { OfferWatch } from '../types';
import {
  offerWatchPriceLabel,
  validationErrorsFromApiFields,
} from './offerWatchUi';

const t = (_key: string, fallback?: string) => fallback || _key;

function priceWatch(overrides: Partial<OfferWatch>): OfferWatch {
  return {
    id: 1,
    category: 'Kategória',
    subcategory: 'Podkategória',
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    districtLabel: '',
    priceMin: null,
    priceMax: null,
    priceCurrency: '',
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-04T08:00:00Z',
    ...overrides,
  };
}

describe('offer-watch UI helpers', () => {
  it('formats every supported price-range shape', () => {
    expect(offerWatchPriceLabel(priceWatch({}), 'sk', t)).toBe('Bez cenového obmedzenia');
    expect(offerWatchPriceLabel(priceWatch({ priceMin: '10.00', priceCurrency: '€' }), 'sk', t)).toBe('Od 10 €');
    expect(offerWatchPriceLabel(priceWatch({ priceMax: '20.50', priceCurrency: '€' }), 'sk', t)).toBe('Do 20,5 €');
    expect(offerWatchPriceLabel(priceWatch({ priceMin: '10.00', priceMax: '20.50', priceCurrency: '€' }), 'sk', t)).toBe('10 – 20,5 €');
  });

  it('maps only public API field names to safe client validation states', () => {
    expect(validationErrorsFromApiFields([
      'subcategory',
      'country_code',
      'district_code',
      'price_currency',
      'non_field_errors',
    ])).toEqual({
      subcategory: 'invalid_selection',
      countryCode: 'required',
      districtCode: 'invalid_district',
      priceCurrency: 'unsupported_currency',
    });
  });
});

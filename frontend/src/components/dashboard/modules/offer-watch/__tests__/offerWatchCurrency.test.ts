import {
  changeOfferWatchPrice,
  defaultOfferWatchCurrency,
} from '../offerWatchCurrency';
import { selectOfferWatchCountry } from '../offerWatchDraft';
import type { OfferWatchDraft } from '../types';

function draft(overrides: Partial<OfferWatchDraft> = {}): OfferWatchDraft {
  return {
    category: '',
    subcategory: '',
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    priceMin: '',
    priceMax: '',
    priceCurrency: '',
    ...overrides,
  };
}

describe('Offer Watch currency defaults', () => {
  it.each([
    ['SK', '€'],
    ['IT', '€'],
    ['BG', '€'],
    ['AX', '€'],
    ['CZ', 'Kč'],
    ['PL', 'zł'],
    ['HU', 'Ft'],
    ['US', '$'],
    ['GB', ''],
  ])('maps %s only to a supported and reliable default', (countryCode, currency) => {
    expect(defaultOfferWatchCurrency(countryCode)).toBe(currency);
  });

  it('fills currency when the first price is entered and clears it with both prices', () => {
    const priced = changeOfferWatchPrice(draft({ countryCode: 'CZ' }), 'priceMin', '10');
    expect(priced.priceCurrency).toBe('Kč');

    expect(changeOfferWatchPrice(priced, 'priceMin', '')).toMatchObject({
      priceMin: '',
      priceMax: '',
      priceCurrency: '',
    });
  });

  it('never overwrites a manually selected currency', () => {
    const manual = draft({ countryCode: 'CZ', priceCurrency: '€' });
    const priced = changeOfferWatchPrice(manual, 'priceMin', '10');
    expect(priced.priceCurrency).toBe('€');

    expect(selectOfferWatchCountry(priced, 'HU').priceCurrency).toBe('€');
  });

  it('fills an empty currency when a priced draft changes to a mapped country', () => {
    const changed = selectOfferWatchCountry(
      draft({ countryCode: 'GB', districtCode: 'legacy', priceMin: '10' }),
      'PL',
    );
    expect(changed).toMatchObject({
      countryCode: 'PL',
      districtCode: '',
      priceCurrency: 'zł',
    });
  });
});

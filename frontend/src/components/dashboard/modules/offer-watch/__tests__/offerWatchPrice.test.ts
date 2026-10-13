import { changeOfferWatchPrice } from '../offerWatchCurrency';
import { selectOfferWatchCountry } from '../offerWatchDraft';
import {
  hasOfferWatchPriceFilter, normalizeOfferWatchZeroBounds,
  normalizeOfferWatchZeroPrice, parseOfferWatchPrice,
} from '../offerWatchPrice';
import type { OfferWatchDraft } from '../types';

function draft(overrides: Partial<OfferWatchDraft> = {}): OfferWatchDraft {
  return {
    category: '', subcategory: '', isSeeking: false, countryCode: 'SK', districtCode: '',
    priceMin: '', priceMax: '', priceCurrency: '', ...overrides,
  };
}

describe('watch-only price parsing and zero normalization', () => {
  it.each([
    ['0', '0', 0], ['000,00', '0', 0], ['0010,50', '10.5', 1050],
    ['0.01', '0.01', 1], ['99999999.99', '99999999.99', 9999999999],
    [' 1.00 ', '1', 100],
  ])('parses %s without floating-point range comparisons', (input, normalized, cents) => {
    expect(parseOfferWatchPrice(input as string)).toEqual({ normalized, cents });
  });

  it.each(['', ' ', '0.', '0,', '-0', '0.000', '1e2', '100000000', 'Infinity']) (
    'keeps invalid or unfinished %s unchanged', (input) => {
      expect(parseOfferWatchPrice(input)).toBeNull();
      expect(normalizeOfferWatchZeroPrice(input)).toBe(input);
    },
  );

  it('commits only zeros and does not mutate the original draft', () => {
    const original = draft({ priceMin: '0.00', priceMax: '0,50', priceCurrency: '$' });
    expect(normalizeOfferWatchZeroBounds(original)).toMatchObject({ priceMin: '', priceMax: '0,50', priceCurrency: '$' });
    expect(original.priceMin).toBe('0.00');
    expect(normalizeOfferWatchZeroBounds(draft({ priceMin: '0', priceMax: '0', priceCurrency: '€' })))
      .toMatchObject({ priceMin: '', priceMax: '', priceCurrency: '' });
  });

  it('does not preselect currency for a transient zero but supplies it for the completed fraction', () => {
    const zero = changeOfferWatchPrice(draft({ countryCode: 'CZ' }), 'priceMin', '0');
    expect(zero.priceMin).toBe('0');
    expect(zero.priceCurrency).toBe('');
    expect(changeOfferWatchPrice(zero, 'priceMin', '0,50').priceCurrency).toBe('Kč');
  });

  it('preserves a manual currency across transient zero and clears it only on commit', () => {
    const zero = changeOfferWatchPrice(draft({ priceMin: '1', priceCurrency: '$' }), 'priceMin', '0');
    expect(zero.priceCurrency).toBe('$');
    expect(changeOfferWatchPrice(zero, 'priceMin', '0.50').priceCurrency).toBe('$');
    expect(normalizeOfferWatchZeroBounds(zero).priceCurrency).toBe('');
  });

  it('does not supply currency on country change for zero-only bounds', () => {
    expect(selectOfferWatchCountry(draft({ priceMin: '0', priceMax: '0' }), 'PL').priceCurrency).toBe('');
    expect(hasOfferWatchPriceFilter(draft())).toBe(false);
    expect(hasOfferWatchPriceFilter(draft({ priceMin: '0' }))).toBe(false);
    expect(hasOfferWatchPriceFilter(draft({ priceMax: '0.01' }))).toBe(true);
    expect(hasOfferWatchPriceFilter(draft({ priceMin: 'invalid' }))).toBe(true);
  });
});

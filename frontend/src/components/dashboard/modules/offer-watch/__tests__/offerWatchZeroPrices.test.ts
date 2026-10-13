import { skillsCategories } from '@/constants/skillsCategories';
import {
  createOfferWatchDraft, selectOfferWatchDistrict, validateOfferWatchDraft,
} from '../offerWatchDraft';
import type { OfferWatch, OfferWatchDraft } from '../types';

const [CATEGORY, SUBCATEGORIES] = Object.entries(skillsCategories)[0]!;

/** Build valid catalog filters with overridable bounds for the zero-price contract. */
function draft(overrides: Partial<OfferWatchDraft> = {}): OfferWatchDraft {
  return {
    category: CATEGORY,
    subcategory: SUBCATEGORIES[0]!,
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    priceMin: '',
    priceMax: '',
    priceCurrency: '',
    ...overrides,
  };
}

describe('Offer Watch zero price bounds', () => {
  it.each(['0', '00', '0.0', '0.00', '0,00', ' 000,00 '])(
    'saves %s as no price filter without requiring a currency',
    (zero) => {
      expect(validateOfferWatchDraft(draft({ priceMin: zero, priceMax: zero }))).toEqual({
        ok: true,
        input: expect.objectContaining({ priceMin: null, priceMax: null, priceCurrency: '' }),
      });
    },
  );

  it.each([
    ['0', '100', null, '100'],
    ['100', '0', '100', null],
    ['', '0', null, null],
    ['0', '', null, null],
    ['0,01', '0.00', '0.01', null],
    ['0.00', '0.01', null, '0.01'],
  ])('normalizes %s–%s before range and currency validation', (priceMin, priceMax, min, max) => {
    expect(validateOfferWatchDraft(draft({ priceMin, priceMax, priceCurrency: '$' }))).toEqual({
      ok: true,
      input: expect.objectContaining({
        priceMin: min,
        priceMax: max,
        priceCurrency: min === null && max === null ? '' : '$',
      }),
    });
  });

  it.each(['€', 'Kč', '$', 'zł', 'Ft'])('clears %s when both bounds are zero', (priceCurrency) => {
    const result = validateOfferWatchDraft(draft({
      priceMin: '0', priceMax: '0', priceCurrency: priceCurrency as OfferWatchDraft['priceCurrency'],
    }));
    expect(result).toEqual({ ok: true, input: expect.objectContaining({ priceCurrency: '' }) });
  });

  it.each(['-1', '-0', '0.000', '0,000', '0e0', '0.', 'NaN', '100000000']) (
    'does not silently turn malformed %s into an empty bound',
    (priceMin) => {
      expect(validateOfferWatchDraft(draft({ priceMin, priceCurrency: '€' }))).toEqual({
        ok: false, errors: { priceMin: 'invalid_price' },
      });
    },
  );

  it('still requires currency for the remaining positive bound', () => {
    expect(validateOfferWatchDraft(draft({ priceMin: '0', priceMax: '100' }))).toEqual({
      ok: false, errors: { priceCurrency: 'currency_required' },
    });
  });

  it('does not bypass location validation when price filtering is removed', () => {
    expect(validateOfferWatchDraft(draft({ priceMin: '0', districtCode: 'not-a-district' })))
      .toEqual({ ok: false, errors: { districtCode: 'invalid_district' } });
    const selected = draft({ districtCode: 'bratislava-i' });
    expect(selectOfferWatchDistrict(selected, '')).toMatchObject({ districtCode: '' });
  });

  it.each([
    ['0.00', '0.00', '', '', ''],
    ['0.00', '100.00', '', '100.00', '$'],
    ['100.00', '0.00', '100.00', '', '$'],
    ['0.01', null, '0.01', '', '$'],
  ])('loads legacy %s–%s bounds without changing positive prices', (priceMin, priceMax, min, max, currency) => {
    const watch: OfferWatch = {
      ...draft(), id: 1, districtLabel: '', priceMin, priceMax, priceCurrency: '$',
      createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    };
    expect(createOfferWatchDraft({ watch })).toMatchObject({
      priceMin: min, priceMax: max, priceCurrency: currency,
    });
    expect(watch.priceMin).toBe(priceMin);
    expect(watch.priceMax).toBe(priceMax);
  });
});

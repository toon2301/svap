import { isCountryMissingForNewOffer } from './offerCountryRequirement';

describe('isCountryMissingForNewOffer', () => {
  it.each([undefined, null, '', '  ', 'ZZ'])(
    'requires a supported country for a new offer: %p',
    (countryCode) => {
      expect(isCountryMissingForNewOffer({ countryCode })).toBe(true);
    },
  );

  it('accepts a supported country for a new offer', () => {
    expect(isCountryMissingForNewOffer({ countryCode: ' it ' })).toBe(false);
  });

  it('keeps a legacy saved offer editable without a country', () => {
    expect(
      isCountryMissingForNewOffer({ offerId: 42, countryCode: '' }),
    ).toBe(false);
  });
});

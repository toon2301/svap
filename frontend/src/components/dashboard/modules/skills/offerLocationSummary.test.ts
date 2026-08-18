import {
  getOfferCountryDisplayName,
  getOfferLocationSummary,
} from './offerLocationSummary';

describe('offerLocationSummary', () => {
  it('prefers city, then district, then the localized country', () => {
    expect(
      getOfferLocationSummary({
        location: ' Brno ',
        district: 'Brno-město',
        countryCode: 'CZ',
        locale: 'sk',
        emptyLabel: 'Pridať lokalitu',
      }),
    ).toBe('Brno');

    expect(
      getOfferLocationSummary({
        location: '',
        district: 'Brno-město',
        countryCode: 'CZ',
        locale: 'sk',
        emptyLabel: 'Pridať lokalitu',
      }),
    ).toBe('Brno-město');

    expect(
      getOfferLocationSummary({
        location: '',
        district: '',
        countryCode: 'IT',
        locale: 'sk',
        emptyLabel: 'Pridať lokalitu',
      }),
    ).toBe(getOfferCountryDisplayName('IT', 'sk'));
  });

  it('uses the empty label when no valid geographical value exists', () => {
    expect(
      getOfferLocationSummary({
        location: ' ',
        district: '',
        countryCode: '',
        locale: 'sk',
        emptyLabel: 'Pridať lokalitu',
      }),
    ).toBe('Pridať lokalitu');
  });
});

import fs from 'fs';
import path from 'path';
import frontendCountryRegistry from './countryRegistry.json';
import frontendDistrictRegistry from './districtRegistry.json';
import {
  getOfferCountryEntries,
  getOfferCountryFallbackName,
  normalizeOfferCountryCode,
} from './countryRegistry';
import {
  findDistrictByLabel,
  getDistrictOptions,
  getOfferDistrictLabel,
  isInactiveOfferDistrictCode,
  resolveInitialOfferDistrictSelection,
} from './districtRegistry';

describe('offer country registry', () => {
  it('contains all ISO alpha-2 countries plus the XK compatibility code', () => {
    const entries = getOfferCountryEntries();

    expect(entries).toHaveLength(250);
    expect(entries.filter((entry) => entry.standard === 'iso-3166-1')).toHaveLength(249);
    expect(entries.find((entry) => entry.code === 'XK')?.standard).toBe('compatibility');
  });

  it('normalizes only allowlisted country codes', () => {
    expect(normalizeOfferCountryCode(' it ')).toBe('IT');
    expect(normalizeOfferCountryCode('us')).toBe('US');
    expect(normalizeOfferCountryCode('ZZ')).toBe('');
    expect(normalizeOfferCountryCode('USA')).toBe('');
    expect(getOfferCountryFallbackName('US')).toBe('United States');
  });

  it('keeps country validity independent from district availability', () => {
    expect(normalizeOfferCountryCode('IT')).toBe('IT');
    expect(getDistrictOptions('IT')).toEqual([]);
    expect(getDistrictOptions('SK')).not.toEqual([]);
  });

  it('exposes exactly the current Slovak, Czech, and Polish district counts', () => {
    expect(getDistrictOptions('SK')).toHaveLength(79);
    expect(getDistrictOptions('CZ')).toHaveLength(77);
    expect(getDistrictOptions('PL')).toHaveLength(380);
    expect(getDistrictOptions('CZ').map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        'praha',
        'prachatice',
        'most',
        'teplice',
        'semily',
        'rychnov-nad-kneznou',
        'uherske-hradiste',
      ]),
    );
    expect(getDistrictOptions('PL').map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        'boleslawiecki',
        'brzeski-malopolskie',
        'brzeski-opolskie',
        'katovice',
        'walbrzyski',
        'walbrzych',
      ]),
    );
  });

  it('keeps legacy Polish names while exposing corrected canonical labels', () => {
    expect(findDistrictByLabel('PL', 'Katovice')).toMatchObject({
      code: 'katovice',
      label: 'Katowice',
      officialCode: '2469',
    });
    expect(findDistrictByLabel('PL', 'Lodž')).toMatchObject({
      code: 'lodz',
      label: 'Łódź',
      officialCode: '1061',
    });
    expect(findDistrictByLabel('PL', 'Lodz')).toMatchObject({
      code: 'lodz',
      label: 'Łódź',
      officialCode: '1061',
    });
    expect(findDistrictByLabel('PL', 'Jastrzębie Zdrój')).toMatchObject({
      code: 'jastrzebie-zdroj',
      label: 'Jastrzębie-Zdrój',
      officialCode: '2467',
    });
  });

  it('disambiguates same-named Polish districts by voivodeship', () => {
    expect(findDistrictByLabel('PL', 'Brzeski (Małopolskie)')).toMatchObject({
      code: 'brzeski-malopolskie',
      officialCode: '1202',
    });
    expect(findDistrictByLabel('PL', 'Brzeski (Opolskie)')).toMatchObject({
      code: 'brzeski-opolskie',
      officialCode: '1601',
    });
  });

  it('hides an inactive legacy district but still resolves existing data', () => {
    expect(getDistrictOptions('CZ')).toHaveLength(77);
    expect(getDistrictOptions('CZ', { includeInactive: true })).toHaveLength(78);
    expect(
      getDistrictOptions('CZ').some((entry) => entry.code === 'valasske-mezirici'),
    ).toBe(false);
    expect(isInactiveOfferDistrictCode('CZ', 'valasske-mezirici')).toBe(true);
    expect(getOfferDistrictLabel('CZ', 'valasske-mezirici')).toBe(
      'Valašské Meziříčí',
    );
    expect(
      resolveInitialOfferDistrictSelection({
        countryCode: 'CZ',
        districtCode: 'valasske-mezirici',
        districtLabel: 'Valašské Meziříčí',
      }),
    ).toEqual({
      countryCode: 'CZ',
      districtCode: 'valasske-mezirici',
      districtLabel: 'Valašské Meziříčí',
    });
  });

  it('resolves a current Czech district alias to its canonical value', () => {
    expect(findDistrictByLabel('CZ', 'Hlavní město Praha')).toMatchObject({
      code: 'praha',
      label: 'Praha',
      active: true,
    });
  });

  it('keeps committed frontend registry copies synchronized with backend data', () => {
    const backendDataDir = path.resolve(process.cwd(), '..', 'backend', 'accounts', 'data');
    const backendCountries = JSON.parse(
      fs.readFileSync(path.join(backendDataDir, 'country_registry.json'), 'utf8'),
    );
    const backendDistricts = JSON.parse(
      fs.readFileSync(path.join(backendDataDir, 'district_registry.json'), 'utf8'),
    );

    expect(frontendCountryRegistry).toEqual(backendCountries);
    expect(frontendDistrictRegistry).toEqual(backendDistricts);
  });
});

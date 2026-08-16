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

  it('exposes current Hungarian districts and keeps legacy values inactive', () => {
    const activeEntries = getDistrictOptions('HU');
    const allEntries = getDistrictOptions('HU', { includeInactive: true });

    expect(activeEntries).toHaveLength(197);
    expect(allEntries).toHaveLength(206);
    expect(new Set(allEntries.map((entry) => entry.code)).size).toBe(206);
    expect(new Set(activeEntries.map((entry) => entry.officialCode)).size).toBe(197);
    expect(activeEntries.every((entry) => Boolean(entry.officialCode))).toBe(true);
    expect(activeEntries.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        'boly',
        'budakeszi',
        'budapest-01-ker',
        'budapest-23-ker',
        'sasd',
        'tolna',
      ]),
    );

    expect(activeEntries.some((entry) => entry.code === 'budapest')).toBe(false);
    expect(isInactiveOfferDistrictCode('HU', 'budapest')).toBe(true);
    expect(getOfferDistrictLabel('HU', 'budapest')).toBe('Budapest');
    expect(findDistrictByLabel('HU', 'Boly')).toMatchObject({
      code: 'boly',
      label: 'Bóly',
      officialCode: '024',
    });
  });

  it('restores an existing inactive Hungarian district without making it selectable', () => {
    expect(
      resolveInitialOfferDistrictSelection({
        countryCode: 'HU',
        districtCode: 'budapest',
        districtLabel: 'Budapest',
      }),
    ).toEqual({
      countryCode: 'HU',
      districtCode: 'budapest',
      districtLabel: 'Budapest',
    });
  });

  it('exposes current Austrian districts without Vienna municipal districts', () => {
    const activeEntries = getDistrictOptions('AT');
    const allEntries = getDistrictOptions('AT', { includeInactive: true });

    expect(activeEntries).toHaveLength(94);
    expect(allEntries).toHaveLength(96);
    expect(new Set(allEntries.map((entry) => entry.code)).size).toBe(96);
    expect(new Set(activeEntries.map((entry) => entry.officialCode)).size).toBe(94);
    expect(activeEntries.every((entry) => Boolean(entry.officialCode))).toBe(true);
    expect(findDistrictByLabel('AT', 'Wien')).toMatchObject({
      code: 'wien',
      officialCode: '900',
    });
    expect(findDistrictByLabel('AT', 'Klagenfurt am Worthersee')).toMatchObject({
      code: 'klagenfurt-am-worthersee',
      label: 'Klagenfurt am Wörthersee',
      officialCode: '201',
    });
    expect(
      activeEntries.some(
        (entry) => entry.officialCode >= '901' && entry.officialCode <= '923',
      ),
    ).toBe(false);
  });

  it('keeps historical Austrian districts visible but not selectable', () => {
    expect(getDistrictOptions('AT').map((entry) => entry.code)).not.toEqual(
      expect.arrayContaining(['schwechat', 'wien-umgebung']),
    );
    expect(isInactiveOfferDistrictCode('AT', 'schwechat')).toBe(true);
    expect(isInactiveOfferDistrictCode('AT', 'wien-umgebung')).toBe(true);
    expect(getOfferDistrictLabel('AT', 'schwechat')).toBe('Schwechat');
    expect(
      resolveInitialOfferDistrictSelection({
        countryCode: 'AT',
        districtCode: 'schwechat',
        districtLabel: 'Schwechat',
      }),
    ).toEqual({
      countryCode: 'AT',
      districtCode: 'schwechat',
      districtLabel: 'Schwechat',
    });
  });

  it('exposes current German districts and preserves legacy values', () => {
    const activeEntries = getDistrictOptions('DE');
    const allEntries = getDistrictOptions('DE', { includeInactive: true });

    expect(activeEntries).toHaveLength(401);
    expect(allEntries).toHaveLength(444);
    expect(new Set(allEntries.map((entry) => entry.code)).size).toBe(444);
    expect(new Set(activeEntries.map((entry) => entry.label)).size).toBe(401);
    expect(new Set(activeEntries.map((entry) => entry.officialCode)).size).toBe(401);
    expect(activeEntries.every((entry) => Boolean(entry.officialCode))).toBe(true);

    expect(findDistrictByLabel('DE', 'Munchen (Stadt)')).toMatchObject({
      code: 'munchen-stadt',
      label: 'M\u00fcnchen (Stadt)',
      officialCode: '09162',
    });
    expect(findDistrictByLabel('DE', 'Osnabruck (Landkreis)')).toMatchObject({
      code: 'osnabruck-landkreis',
      label: 'Osnabr\u00fcck (Landkreis)',
      officialCode: '03459',
    });
    expect(findDistrictByLabel('DE', 'Hassberge')).toMatchObject({
      code: 'hassberge',
      label: 'Ha\u00dfberge',
      officialCode: '09674',
    });
  });

  it('restores inactive German values and prefers active duplicate labels', () => {
    expect(getDistrictOptions('DE').some((entry) => entry.code === 'munchen')).toBe(false);
    expect(isInactiveOfferDistrictCode('DE', 'munchen')).toBe(true);
    expect(isInactiveOfferDistrictCode('DE', 'wesel-2')).toBe(true);
    expect(findDistrictByLabel('DE', 'Wesel', { includeInactive: true })).toMatchObject({
      code: 'wesel',
      active: true,
      officialCode: '05170',
    });
    expect(
      resolveInitialOfferDistrictSelection({
        countryCode: 'DE',
        districtCode: 'munchen',
        districtLabel: 'M\u00fcnchen',
      }),
    ).toEqual({
      countryCode: 'DE',
      districtCode: 'munchen',
      districtLabel: 'M\u00fcnchen',
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

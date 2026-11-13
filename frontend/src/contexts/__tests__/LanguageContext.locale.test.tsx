import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { LanguageProvider, localeFromBrowser, localeFromCountry, useLanguage } from '../LanguageContext';
import * as languageContext from '../LanguageContext';
import { GEO_DETECTION_CACHE_KEY, LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import sk from '../../../messages/sk.json';
import cs from '../../../messages/cs.json';
import en from '../../../messages/en.json';
import de from '../../../messages/de.json';
import pl from '../../../messages/pl.json';
import hu from '../../../messages/hu.json';

jest.unmock('@/contexts/LanguageContext');

const wrapper = ({ children }: PropsWithChildren) => <LanguageProvider>{children}</LanguageProvider>;
const dictionaries = { sk, cs, en, de, pl, hu };

describe('language remains independent from the search country', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(GEO_DETECTION_CACHE_KEY, JSON.stringify({ country: 'IT', detectedAt: Date.now(), status: 'ok' }));
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'sk-SK' });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['sk-SK'] });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(Object.entries(dictionaries))('retains saved locale %s regardless of detected country', (locale, dictionary) => {
    localStorage.setItem('appLocale', locale);
    const hook = renderHook(useLanguage, { wrapper });
    expect(hook.result.current.locale).toBe(locale);
    expect(hook.result.current.searchCountry).toBe('IT');
    expect(hook.result.current.t('common.save')).toBe(dictionary.common.save);
    expect(hook.result.current.t('missing.path', 'fallback')).toBe('fallback');
    expect(hook.result.current.t('common.save.unavailable')).toBe('common.save.unavailable');
    expect(hook.result.current.t('common', 'object fallback')).toBe('object fallback');
  });

  it('allows changing locale without changing either country preference', () => {
    const hook = renderHook(useLanguage, { wrapper });
    for (const locale of ['cs', 'en', 'de', 'pl', 'hu', 'sk'] as const) {
      act(() => hook.result.current.setLocale(locale));
      expect(hook.result.current.locale).toBe(locale);
      expect(hook.result.current.searchCountry).toBe('IT');
      expect(hook.result.current.country).toBe('IT');
      expect(localStorage.getItem('appLocale')).toBe(locale);
    }
  });

  it.each([
    ['SK', 'sk'], ['CZ', 'cs'], ['PL', 'pl'], ['DE', 'de'], ['AT', 'de'], ['HU', 'hu'], ['IT', null], [null, null],
  ] as const)('keeps existing country-to-locale mapping %s', (country, expected) => {
    expect(localeFromCountry(country)).toBe(expected);
  });

  it.each([
    ['pl-PL', 'pl'], ['sk-SK', 'sk'], ['cs-CZ', 'cs'], ['cz-CZ', 'cs'], ['de-AT', 'de'],
    ['hu-HU', 'hu'], ['en-GB', 'en'], ['ja-JP', 'en'], ['fr-FR', 'en'], ['th-TH', 'en'], ['', 'en'],
  ])('keeps browser locale mapping %s independent of country detection (unknown language gives English)', (language, expected) => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: [language] });
    Object.defineProperty(navigator, 'language', { configurable: true, value: language });
    expect(localeFromBrowser()).toBe(expected);
  });

  it('uses navigator.language when the language preference list is empty', () => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: [] });
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'pl-PL' });
    expect(localeFromBrowser()).toBe('pl');
  });

  it('falls back safely to English when browser language access throws', () => {
    Object.defineProperty(navigator, 'languages', { configurable: true, get: () => { throw new Error('Denied'); } });
    expect(localeFromBrowser()).toBe('en');
  });

  it('rejects useLanguage outside its required provider', () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(useLanguage)).toThrow('useLanguage must be used within LanguageProvider');
    log.mockRestore();
  });

  it('preserves the existing public geo-cache exports and their time limits', () => {
    expect(languageContext.GEO_DETECTION_CACHE_KEY).toBe(GEO_DETECTION_CACHE_KEY);
    expect(languageContext.GEO_DETECTION_SUCCESS_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(languageContext.GEO_DETECTION_FAILURE_TTL_MS).toBe(30 * 60 * 1000);
    const entry = { country: 'SK', detectedAt: Date.now(), status: 'ok' } as const;
    languageContext.writeGeoDetectionCache(entry);
    expect(languageContext.readGeoDetectionCache()).toEqual(entry);
    expect(languageContext.isGeoDetectionCacheFresh(entry)).toBe(true);
  });
});

/**
 * Jazyk pri prvom otvorení bez uloženej voľby (nález 332, R2). Poradie: ručná voľba (`appLocale`), krajina z IP adresy
 * (SK, CZ, PL, DE, AT a HU dajú svoj jazyk), jazyk prehliadača (pl, sk, cs, de, hu, en) a nakoniec angličtina pre zvyšok
 * sveta, takže Slovák na dovolenke v Thajsku so slovenským telefónom dostane slovenčinu a Thajčan s thajským telefónom
 * angličtinu.
 */
describe('jazyk bez uloženej voľby: krajina, jazyk prehliadača a náhrada (nález 332)', () => {
  /** Čerstvý výsledok zisťovania krajiny v úložisku (bez volania `ipapi.co`); `null` je zlyhané zisťovanie. */
  const detectCountry = (country: string | null) =>
    localStorage.setItem(
      GEO_DETECTION_CACHE_KEY,
      JSON.stringify({ country, detectedAt: Date.now(), status: country ? 'ok' : 'failed' }),
    );

  const browserSpeaks = (language: string) => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: language });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: [language] });
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it.each([
    // Zvyšok sveta, jazyk prehliadača mimo šiestich jazykov aplikácie: angličtina.
    ['TH', 'th-TH', 'en'],
    ['TH', 'fr-FR', 'en'],
    ['IT', 'ja-JP', 'en'],
    [null, 'ja-JP', 'en'],
    [null, '', 'en'],
    // Zvyšok sveta, jazyk prehliadača z šiestich: druhý signál rozhodne.
    ['TH', 'sk-SK', 'sk'],
    ['TH', 'pl-PL', 'pl'],
    ['IT', 'de-DE', 'de'],
    ['US', 'en-US', 'en'],
    [null, 'hu-HU', 'hu'],
    // Krajina zo šiestich má prednosť pred jazykom prehliadača.
    ['SK', 'fr-FR', 'sk'],
    ['PL', 'en-US', 'pl'],
    ['CZ', 'de-DE', 'cs'],
    ['AT', 'ja-JP', 'de'],
    ['DE', 'sk-SK', 'de'],
    ['HU', 'th-TH', 'hu'],
  ])('krajina %s a jazyk prehliadača %j dajú jazyk %s', (country, language, expected) => {
    detectCountry(country);
    browserSpeaks(language);

    const hook = renderHook(useLanguage, { wrapper });

    expect(hook.result.current.locale).toBe(expected);
  });

  it('ručne zvolený jazyk má prednosť pred krajinou aj jazykom prehliadača', () => {
    localStorage.setItem('appLocale', 'cs');
    detectCountry('PL');
    browserSpeaks('de-DE');

    const hook = renderHook(useLanguage, { wrapper });

    expect(hook.result.current.locale).toBe('cs');
  });

  it('s uloženou krajinou formulára rozhoduje jazyk prehliadača a mimo šiestich jazykov je to angličtina', () => {
    localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'CZ');
    detectCountry('SK');
    browserSpeaks('fr-FR');

    const hook = renderHook(useLanguage, { wrapper });

    expect(hook.result.current.locale).toBe('en');
  });
});

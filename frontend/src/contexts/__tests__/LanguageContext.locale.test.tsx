import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { LanguageProvider, localeFromBrowser, localeFromCountry, useLanguage } from '../LanguageContext';
import * as languageContext from '../LanguageContext';
import { GEO_DETECTION_CACHE_KEY } from '@/shared/offerCountryPreference';
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
    ['hu-HU', 'hu'], ['en-GB', 'en'], ['ja-JP', 'sk'], ['', 'sk'],
  ])('keeps browser locale mapping %s independent of country detection', (language, expected) => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: [language] });
    Object.defineProperty(navigator, 'language', { configurable: true, value: language });
    expect(localeFromBrowser()).toBe(expected);
  });

  it('uses navigator.language when the language preference list is empty', () => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: [] });
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'pl-PL' });
    expect(localeFromBrowser()).toBe('pl');
  });

  it('falls back safely when browser language access throws', () => {
    Object.defineProperty(navigator, 'languages', { configurable: true, get: () => { throw new Error('Denied'); } });
    expect(localeFromBrowser()).toBe('sk');
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

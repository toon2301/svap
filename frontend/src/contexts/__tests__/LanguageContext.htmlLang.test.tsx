import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import { GEO_DETECTION_CACHE_KEY } from '@/shared/offerCountryPreference';

jest.unmock('@/contexts/LanguageContext');

const wrapper = ({ children }: PropsWithChildren) => <LanguageProvider>{children}</LanguageProvider>;

const LOCALES = ['sk', 'cs', 'en', 'pl', 'de', 'hu'] as const;

/**
 * Atribút `lang` na `<html>` (nález 335). Úvodné HTML zo servera (`app/layout.tsx`) má pevné `lang="sk"`, lebo server
 * jazyk nepozná, a jazyk aplikácie sa zisťuje až v prehliadači. Poskytovateľ jazyka ho po načítaní vyrovná s jazykom
 * aplikácie, aby čítačky obrazovky, ponuka prekladu v prehliadači a kontrola pravopisu používali správny jazyk. Testy
 * používajú skutočného poskytovateľa, uložené voľby, simuláciu zisťovania krajiny (`ipapi.co`) a jazyka prehliadača.
 */
const htmlLang = () => document.documentElement.lang;

/** Čerstvý výsledok zisťovania krajiny v úložisku (bez volania `ipapi.co`); `null` je zlyhané zisťovanie. */
const detectCountry = (country: string | null) =>
  localStorage.setItem(
    GEO_DETECTION_CACHE_KEY,
    JSON.stringify({ country, detectedAt: Date.now(), status: country ? 'ok' : 'failed' }),
  );

/** Prehliadač hlási daný jazyk. */
const browserSpeaks = (language: string) => {
  Object.defineProperty(navigator, 'language', { configurable: true, value: language });
  Object.defineProperty(navigator, 'languages', { configurable: true, value: [language] });
};

const originalFetch = global.fetch;

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
  // Úvodné HTML zo servera má `lang="sk"`; každý test začína z neho.
  document.documentElement.lang = 'sk';
});

afterEach(() => {
  global.fetch = originalFetch;
  document.documentElement.lang = 'sk';
});

describe('LanguageProvider: atribút lang na <html> (nález 335)', () => {
  it.each(LOCALES)('uložená voľba %s nastaví lang na rovnaký kód, nech je krajina a jazyk prehliadača akýkoľvek', (locale) => {
    localStorage.setItem('appLocale', locale);
    detectCountry('IT');
    browserSpeaks('fr-FR');

    const hook = renderHook(useLanguage, { wrapper });

    expect(hook.result.current.locale).toBe(locale);
    expect(htmlLang()).toBe(locale);
  });

  it('bez uloženej voľby, pri zlyhanom zisťovaní krajiny a jazyku prehliadača mimo šiestich jazykov je lang en', () => {
    detectCountry(null);
    browserSpeaks('fr-FR');

    const hook = renderHook(useLanguage, { wrapper });

    expect(hook.result.current.locale).toBe('en');
    expect(htmlLang()).toBe('en');
  });

  it.each([
    ['SK', 'sk'],
    ['CZ', 'cs'],
    ['PL', 'pl'],
    ['DE', 'de'],
    ['AT', 'de'],
    ['HU', 'hu'],
  ])('jazyk z krajiny %s nastaví lang na %s, aj keď prehliadač hlási iný jazyk', (country, expected) => {
    detectCountry(country);
    browserSpeaks('fr-FR');

    renderHook(useLanguage, { wrapper });

    expect(htmlLang()).toBe(expected);
  });

  it('pri krajine mimo šiestich jazykov rozhodne jazyk prehliadača a lang ho nasleduje', () => {
    detectCountry('TH');
    browserSpeaks('pl-PL');

    renderHook(useLanguage, { wrapper });

    expect(htmlLang()).toBe('pl');
  });

  it('ručná voľba má prednosť: lang zodpovedá uloženej voľbe, nie krajine ani jazyku prehliadača', () => {
    localStorage.setItem('appLocale', 'cs');
    detectCountry('PL');
    browserSpeaks('de-DE');

    renderHook(useLanguage, { wrapper });

    expect(htmlLang()).toBe('cs');
  });

  it('neplatná uložená voľba sa ignoruje a lang patrí platnému jazyku', () => {
    localStorage.setItem('appLocale', 'xx');
    detectCountry(null);
    browserSpeaks('hu-HU');

    renderHook(useLanguage, { wrapper });

    expect(htmlLang()).toBe('hu');
  });

  it('`setLocale` zmení lang pri každej zmene jazyka', () => {
    detectCountry('SK');
    browserSpeaks('sk-SK');
    const hook = renderHook(useLanguage, { wrapper });
    expect(htmlLang()).toBe('sk');

    for (const locale of ['cs', 'en', 'de', 'pl', 'hu', 'sk'] as const) {
      act(() => hook.result.current.setLocale(locale));

      expect(hook.result.current.locale).toBe(locale);
      expect(htmlLang()).toBe(locale);
    }
  });

  it('kým sa krajina zisťuje, ostáva lang sk (ako úvodné HTML) a po zistení krajiny sa vyrovná s jazykom', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ country_code: 'PL' }) });
    browserSpeaks('fr-FR');

    const hook = renderHook(useLanguage, { wrapper });

    expect(hook.result.current.locale).toBe('sk');
    expect(htmlLang()).toBe('sk');
    await waitFor(() => expect(htmlLang()).toBe('pl'));
    expect(hook.result.current.locale).toBe('pl');
  });
});

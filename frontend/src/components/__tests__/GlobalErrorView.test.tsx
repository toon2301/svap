/**
 * Stránka `global-error` (nález 33): obsah, jazyk a texty vo všetkých šiestich jazykoch appky.
 *
 * Stránka beží bez poskytovateľov (jazyk, téma) a bez štýlov z `globals.css`, preto si jazyk číta sama
 * z `localStorage` a z prehliadača.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import cs from '../../../messages/cs.json';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';
import hu from '../../../messages/hu.json';
import pl from '../../../messages/pl.json';
import sk from '../../../messages/sk.json';
import GlobalErrorView, {
  globalErrorTexts,
  readGlobalErrorLocale,
  type GlobalErrorLocale,
} from '../GlobalErrorView';

const MESSAGES = { sk, cs, en, de, pl, hu };
const LOCALES = Object.keys(MESSAGES) as GlobalErrorLocale[];
const KEYS = ['title', 'description', 'reload', 'home'] as const;

/** Prehliadač hlási daný jazyk (jsdom má predvolene `en-US`). */
function browserSpeaks(language: string) {
  jest.spyOn(window.navigator, 'language', 'get').mockReturnValue(language);
  jest.spyOn(window.navigator, 'languages', 'get').mockReturnValue([language]);
}

afterEach(() => {
  jest.restoreAllMocks();
  window.localStorage.clear();
});

describe('texty stránky global-error', () => {
  it.each(LOCALES)('%s: sú vyplnené všetky štyri texty', (locale) => {
    for (const key of KEYS) {
      expect(MESSAGES[locale].appError[key].trim().length).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES.filter((locale) => locale !== 'sk'))(
    '%s: žiadny text nie je skopírovaná slovenčina',
    (locale) => {
      for (const key of KEYS) {
        expect(MESSAGES[locale].appError[key]).not.toBe(sk.appError[key]);
      }
    },
  );

  it.each(LOCALES)('%s: `globalErrorTexts` vracia texty zo súboru s prekladmi', (locale) => {
    expect(globalErrorTexts(locale)).toEqual(MESSAGES[locale].appError);
  });
});

describe('jazyk stránky global-error', () => {
  it.each(LOCALES)('%s: uložená voľba používateľa má prednosť pred jazykom prehliadača', (locale) => {
    browserSpeaks('en-US');
    window.localStorage.setItem('appLocale', locale);

    expect(readGlobalErrorLocale()).toBe(locale);
  });

  it.each([
    ['de-AT', 'de'],
    ['pl-PL', 'pl'],
    ['cs-CZ', 'cs'],
    ['hu-HU', 'hu'],
    ['en-GB', 'en'],
    ['sk-SK', 'sk'],
  ])('bez uloženej voľby sa použije jazyk prehliadača %s', (language, expected) => {
    browserSpeaks(language);

    expect(readGlobalErrorLocale()).toBe(expected);
  });

  it('neznámy jazyk prehliadača dá slovenčinu', () => {
    browserSpeaks('fr-FR');

    expect(readGlobalErrorLocale()).toBe('sk');
  });

  it.each(['xx', '', 'constructor', '__proto__', 'toString'])(
    'neplatná uložená voľba (%j) sa ignoruje a použije sa jazyk prehliadača',
    (saved) => {
      browserSpeaks('de-DE');
      window.localStorage.setItem('appLocale', saved);

      expect(readGlobalErrorLocale()).toBe('de');
    },
  );

  it('nedostupné úložisko nezhodí stránku', () => {
    browserSpeaks('pl-PL');
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(readGlobalErrorLocale()).toBe('pl');
  });
});

describe('GlobalErrorView', () => {
  it.each(LOCALES)('%s: ukáže nadpis, vysvetlenie a obe tlačidlá v danom jazyku', (locale) => {
    render(<GlobalErrorView locale={locale} />);
    const texts = MESSAGES[locale].appError;

    expect(screen.getByRole('heading', { level: 1, name: texts.title })).toBeInTheDocument();
    expect(screen.getByText(texts.description)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.reload })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.home })).toBeInTheDocument();
  });

  it('chybu oznámi čítačkám obrazovky (role alert)', () => {
    render(<GlobalErrorView locale="sk" />);

    expect(screen.getByRole('alert')).toHaveTextContent(sk.appError.title);
  });

  it('tlačidlo načíta aplikáciu znova', () => {
    const onReload = jest.fn();
    render(<GlobalErrorView locale="sk" onReload={onReload} />);

    fireEvent.click(screen.getByRole('button', { name: sk.appError.reload }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('odkaz vedie na úvodnú stránku obyčajným odkazom (bez routera)', () => {
    render(<GlobalErrorView locale="en" />);

    expect(screen.getByRole('link', { name: en.appError.home })).toHaveAttribute('href', '/');
  });

  it('nepotrebuje žiadneho poskytovateľa (jazyk, téma, router)', () => {
    expect(() => render(<GlobalErrorView locale="hu" />)).not.toThrow();
  });
});

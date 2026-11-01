/**
 * `app/global-error.tsx` (nález 33): chyba, ktorá zhodila koreňový layout, sa hlási do Sentry a ukáže sa
 * jednoduchá stránka v jazyku používateľa.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as Sentry from '@sentry/nextjs';
import de from '../../../messages/de.json';
import sk from '../../../messages/sk.json';
import GlobalError from '../global-error';

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;

/**
 * `<html>` a `<body>` sa v testovacom kontajneri (`<div>`) vykreslia s varovaním o neplatnom vnorení;
 * to je očakávané, iné chyby konzoly test prepúšťa.
 */
function silenceHtmlNestingWarning() {
  const original = console.error;
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (String(args[0]).includes('validateDOMNesting') || String(args[0]).includes('cannot be a child of')) return;
    original(...args);
  });
}

/** Prehliadač hlási daný jazyk (jsdom má predvolene `en-US`, čo by dalo angličtinu). */
function browserSpeaks(language: string) {
  jest.spyOn(window.navigator, 'language', 'get').mockReturnValue(language);
  jest.spyOn(window.navigator, 'languages', 'get').mockReturnValue([language]);
}

beforeEach(() => {
  captureException.mockClear();
  silenceHtmlNestingWarning();
});

afterEach(() => {
  jest.restoreAllMocks();
  window.localStorage.clear();
  // React 19 nastavuje `lang` a štýl priamo na `<html>` dokumentu; ďalší test ich nemá zdediť.
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('style');
});

describe('global-error', () => {
  it('nahlási chybu do Sentry', () => {
    const error = Object.assign(new Error('koreňový layout spadol'), { digest: 'abc' });

    render(<GlobalError error={error} />);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it('nahlási aj ďalšiu, inú chybu', () => {
    const first = new Error('prvá');
    const second = new Error('druhá');
    const view = render(<GlobalError error={first} />);

    view.rerender(<GlobalError error={second} />);

    expect(captureException.mock.calls.map(([e]) => (e as Error).message)).toEqual(['prvá', 'druhá']);
  });

  it('tú istú chybu pri prekreslení nehlási znova', () => {
    const error = new Error('jedna chyba');
    const view = render(<GlobalError error={error} />);

    view.rerender(<GlobalError error={error} />);

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('zlyhanie hlásenia do Sentry náhradnú stránku nerozbije', () => {
    browserSpeaks('fr-FR');
    captureException.mockImplementationOnce(() => {
      throw new Error('Sentry zlyhal');
    });

    const { container } = render(<GlobalError error={new Error('x')} />);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(container).toHaveTextContent(sk.appError.title);
  });

  it('bez uloženej voľby a pri neznámom jazyku prehliadača ukáže slovenčinu', () => {
    browserSpeaks('fr-FR');

    const { container } = render(<GlobalError error={new Error('x')} />);

    expect(container).toHaveTextContent(sk.appError.title);
    expect(document.documentElement).toHaveAttribute('lang', 'sk');
  });

  it('po zobrazení prepne na jazyk, ktorý si používateľ uložil', async () => {
    browserSpeaks('fr-FR');
    window.localStorage.setItem('appLocale', 'de');

    const { container } = render(<GlobalError error={new Error('x')} />);
    await act(async () => {});

    expect(container).toHaveTextContent(de.appError.title);
    expect(document.documentElement).toHaveAttribute('lang', 'de');
  });

  it('server vykreslí celý dokument (html, body) s nadpisom aj tlačidlami', () => {
    browserSpeaks('fr-FR');

    const markup = renderToStaticMarkup(<GlobalError error={new Error('x')} />);

    expect(markup).toContain('<html lang="sk"');
    expect(markup).toContain('<body');
    expect(markup).toContain(sk.appError.title);
    expect(markup).toContain(sk.appError.reload);
    expect(markup).toContain('href="/"');
  });

  it('do stránky sa nedostane text ani zásobník chyby', () => {
    const error = new Error('tajný detail chyby');
    error.stack = 'Error: tajný detail chyby\n    at secret.ts:1:1';

    const markup = renderToStaticMarkup(<GlobalError error={error} />);

    expect(markup).not.toContain('tajný detail chyby');
    expect(markup).not.toContain('secret.ts');
  });
});

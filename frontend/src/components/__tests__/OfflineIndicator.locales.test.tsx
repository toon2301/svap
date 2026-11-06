/**
 * Pruh o stave pripojenia je v jazyku aplikácie (nález 177). Oba texty boli v komponente natvrdo po slovensky,
 * takže ich pri výpadku siete videl používateľ rovnako v češtine, poľštine, nemčine, maďarčine aj angličtine.
 * Test beží so skutočným `LanguageProvider` a skutočnými súbormi s textami (globálny mock jazyka je vypnutý),
 * takže zlyhá aj vtedy, keď sa kľúč stratí z niektorého jazyka alebo komponent text znova zadá natvrdo.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { GEO_DETECTION_CACHE_KEY } from '@/shared/offerCountryPreference';
import OfflineIndicator from '../OfflineIndicator';

jest.unmock('@/contexts/LanguageContext');

const LOCALES = ['sk', 'cs', 'en', 'pl', 'de', 'hu'] as const;
type Locale = (typeof LOCALES)[number];

/** Dohodnuté texty pruhu; slovenčina je rovnaká ako doterajší text v komponente. */
const TEXTS: Record<Locale, { offline: string; online: string }> = {
  sk: {
    offline: 'Offline režim - niektoré funkcie môžu byť obmedzené.',
    online: 'Pripojenie obnovené! Aplikácia je online.',
  },
  cs: {
    offline: 'Režim offline - některé funkce mohou být omezené.',
    online: 'Připojení obnoveno! Aplikace je online.',
  },
  en: {
    offline: 'Offline mode - some features may be limited.',
    online: 'Connection restored! The app is online.',
  },
  pl: {
    offline: 'Tryb offline - niektóre funkcje mogą być ograniczone.',
    online: 'Połączenie przywrócone! Aplikacja jest online.',
  },
  de: {
    offline: 'Offline-Modus - einige Funktionen sind möglicherweise eingeschränkt.',
    online: 'Verbindung wiederhergestellt! Die App ist online.',
  },
  hu: {
    offline: 'Offline mód - egyes funkciók korlátozottak lehetnek.',
    online: 'A kapcsolat helyreállt! Az alkalmazás online.',
  },
};

/** Nastaví, čo o pripojení hlási prehliadač (`navigator.onLine`). */
function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

/** Vykreslí pruh v danom jazyku aplikácie; čerstvý odhad krajiny zabráni tomu, aby provider volal sieť. */
function renderIn(locale: Locale) {
  localStorage.setItem('appLocale', locale);
  localStorage.setItem(
    GEO_DETECTION_CACHE_KEY,
    JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }),
  );
  return render(
    <LanguageProvider>
      <OfflineIndicator />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  setOnLine(true);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('OfflineIndicator – texty v jazyku aplikácie', () => {
  it.each(LOCALES)('jazyk %s: pruh pri výpadku pripojenia', (locale) => {
    setOnLine(false);
    renderIn(locale);

    expect(screen.getByText(TEXTS[locale].offline)).toBeInTheDocument();
  });

  it.each(LOCALES)('jazyk %s: pruh po obnovení pripojenia', (locale) => {
    setOnLine(false);
    renderIn(locale);

    setOnLine(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByText(TEXTS[locale].online)).toBeInTheDocument();
    expect(screen.queryByText(TEXTS[locale].offline)).not.toBeInTheDocument();
  });
});

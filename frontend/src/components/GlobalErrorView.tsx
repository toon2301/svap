'use client';

/**
 * Obsah stránky `global-error` – chyba, ktorá zhodila aj koreňový layout (nález 33).
 *
 * `app/global-error.tsx` nahrádza celý koreňový layout, takže tu nie sú dostupné poskytovatelia (jazyk,
 * téma), štýly z `globals.css` ani router. Preto:
 * - jazyk sa číta priamo (uložená voľba `appLocale`, inak jazyk prehliadača, inak slovenčina),
 * - texty sú v `messages/*.json` pod kľúčom `appError` (všetkých 6 jazykov), rovnako ako ostatné texty,
 * - vzhľad je zapísaný priamo v štýloch; farby pozadia a textu preberá z režimu prehliadača (`Canvas`,
 *   `CanvasText`), takže stránka je čitateľná vo svetlom aj tmavom režime,
 * - návrat na úvod je obyčajný odkaz, nie `next/link` (ten potrebuje router).
 */

import type { CSSProperties } from 'react';
import cs from '../../messages/cs.json';
import de from '../../messages/de.json';
import en from '../../messages/en.json';
import hu from '../../messages/hu.json';
import pl from '../../messages/pl.json';
import sk from '../../messages/sk.json';

export type GlobalErrorLocale = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type GlobalErrorTexts = { title: string; description: string; reload: string; home: string };

/** Kľúč v `localStorage`, pod ktorým si appka pamätá zvolený jazyk (rovnaký ako v `LanguageContext`). */
const LOCALE_STORAGE_KEY = 'appLocale';

const TEXTS: Record<GlobalErrorLocale, GlobalErrorTexts> = {
  sk: sk.appError,
  cs: cs.appError,
  en: en.appError,
  de: de.appError,
  pl: pl.appError,
  hu: hu.appError,
};

function isGlobalErrorLocale(value: unknown): value is GlobalErrorLocale {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TEXTS, value);
}

/** Texty stránky v danom jazyku (všetkých 6 jazykov appky). */
export function globalErrorTexts(locale: GlobalErrorLocale): GlobalErrorTexts {
  return TEXTS[locale];
}

/**
 * Jazyk prehliadača zúžený na jazyky appky; neznámy jazyk dá slovenčinu. Rovnaké pravidlo ako
 * `localeFromBrowser` v `LanguageContext`, no tu je zámerne vlastná kópia: stránka `global-error` sa ukazuje
 * vtedy, keď niečo zlyhalo v koreni appky, a nemá závisieť od modulov, ktoré mohli chybu spôsobiť.
 */
function localeFromNavigator(): GlobalErrorLocale {
  try {
    const language = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    const value = language.toLowerCase();
    if (value.startsWith('pl')) return 'pl';
    if (value.startsWith('sk')) return 'sk';
    if (value.startsWith('cs') || value.startsWith('cz')) return 'cs';
    if (value.startsWith('de')) return 'de';
    if (value.startsWith('hu')) return 'hu';
    if (value.startsWith('en')) return 'en';
  } catch {
    // Bez údajov z prehliadača ostane slovenčina.
  }
  return 'sk';
}

/**
 * Jazyk, v ktorom sa má chyba ukázať: uložená voľba používateľa, inak jazyk prehliadača, inak slovenčina.
 * Úložisko nemusí byť dostupné (súkromný režim, zablokované cookies) – to nie je dôvod, aby stránka spadla.
 */
export function readGlobalErrorLocale(): GlobalErrorLocale {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isGlobalErrorLocale(saved)) return saved;
  } catch {
    // Bez úložiska rozhodne jazyk prehliadača.
  }
  return localeFromNavigator();
}

const STYLES = {
  page: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: 'Canvas',
    color: 'CanvasText',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '28rem',
    textAlign: 'center',
  },
  title: { margin: '0 0 12px', fontSize: '1.5rem', lineHeight: 1.3, fontWeight: 700 },
  description: { margin: '0 0 24px', fontSize: '1rem', lineHeight: 1.5, opacity: 0.8 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    background: '#9333ea',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  link: {
    padding: '12px 24px',
    border: '1px solid currentColor',
    borderRadius: '8px',
    color: 'inherit',
    fontSize: '1rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
} satisfies Record<string, CSSProperties>;

function reloadPage() {
  window.location.reload();
}

/** Jednoduchá stránka s výzvou načítať aplikáciu znova (`onReload` je len na testovanie). */
export default function GlobalErrorView({
  locale,
  onReload = reloadPage,
}: {
  locale: GlobalErrorLocale;
  onReload?: () => void;
}) {
  const texts = globalErrorTexts(locale);
  return (
    <main style={STYLES.page}>
      <div role="alert" style={STYLES.card}>
        <h1 style={STYLES.title}>{texts.title}</h1>
        <p style={STYLES.description}>{texts.description}</p>
        <div style={STYLES.actions}>
          <button type="button" style={STYLES.button} onClick={onReload}>
            {texts.reload}
          </button>
          {/* Obyčajný odkaz zámerne: po chybe v koreni appky sa router nesmie použiť, treba čistý nový load. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={STYLES.link}>
            {texts.home}
          </a>
        </div>
      </div>
    </main>
  );
}

'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';
import GlobalErrorView, {
  globalErrorTexts,
  readGlobalErrorLocale,
  type GlobalErrorLocale,
} from '@/components/GlobalErrorView';

/**
 * Chyba, ktorá zhodila koreňový layout (nález 33): hlási sa do Sentry a ukáže jednoduchú stránku.
 *
 * Next ju používa namiesto celého koreňového layoutu, preto si sám vykreslí `<html>` aj `<body>`.
 * Bez tohto súboru sa chyby vykresľovania do Sentry nehlásili a každý build pri nástroji Sentry hlásil
 * varovanie. Podrobnosti o vzhľade a jazyku sú v `GlobalErrorView`.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  // Jazyk sa zisťuje až po zobrazení: pri vykreslení na serveri nie je dostupný `localStorage` a rozdiel
  // oproti serveru by spôsobil chybu pri hydratácii.
  const [locale, setLocale] = useState<GlobalErrorLocale>('sk');

  useEffect(() => {
    try {
      Sentry.captureException(error);
    } catch {
      // Zlyhanie hlásenia nesmie zhodiť aj náhradnú stránku (rovnako ako v `ErrorBoundary`).
    }
  }, [error]);

  useEffect(() => {
    setLocale(readGlobalErrorLocale());
  }, []);

  return (
    <html lang={locale} style={{ colorScheme: 'light dark' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{globalErrorTexts(locale).title}</title>
      </head>
      <body style={{ margin: 0 }}>
        <GlobalErrorView locale={locale} />
      </body>
    </html>
  );
}

'use client';

import { getConfiguredApiUrl } from '@/lib/apiUrl';

/** Cesta súboru fotky príspevku alebo náhľadu zdieľaného obsahu, bez základu API. */
const FEED_FILE_PATH = /^\/auth\/feed\/posts\/\d+\/(?:images\/\d+\/file|shared-thumbnail)\/?$/;

/**
 * Adresa fotky Nástenky pre `<img src>`, ktorá smeruje na doménu frontendu (nález 274).
 *
 * Backend skladá adresy fotiek s vlastným hostom (za proxy frontendu je to host backendu). Prehliadač takú
 * požiadavku pošle bez prihlasovacieho cookie, ktoré patrí doméne frontendu, takže ju backend berie ako anonymnú a
 * fotky súkromného autora (aj jeho vlastné) vráti ako 404. Cesta `/api/...` na doméne frontendu cookie nesie a Next
 * ju preposiela na backend, rovnako ako ostatné volania API (pozri aj `toRelativeApiPath` v `lib/feedApi.ts`).
 *
 * Prepisuje sa len pri relatívnom základe API (frontend preposiela `/api`) a len adresa súboru fotky príspevku alebo
 * náhľadu zdieľania. Všetko ostatné (iný host API, úložisko, portfólio, lokálne náhľady) ostáva bez zmeny.
 */
export function sameOriginFeedImageUrl(rawUrl: string | null | undefined): string {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return '';

  const configured = getConfiguredApiUrl();
  if (!configured.startsWith('/')) return trimmed;
  const apiBase = configured.replace(/\/+$/, '');

  let parsed: URL;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    parsed = new URL(trimmed, origin);
  } catch {
    return trimmed;
  }

  if (!parsed.pathname.startsWith(`${apiBase}/`)) return trimmed;
  if (!FEED_FILE_PATH.test(parsed.pathname.slice(apiBase.length))) return trimmed;
  return `${parsed.pathname}${parsed.search}`;
}

/**
 * Detekcia a normalizácia chránených portfolio image URL.
 *
 * Backend servíruje portfolio obrázky cez privátny proxy endpoint
 * `/api/auth/portfolio/<item_id>/images/<image_id>/file/`, ktorý vyžaduje cookie
 * autentifikáciu. `<img src>` obíde axios klient (žiadny 401-refresh a pri
 * cross-origin absolútnej URL nemusí ísť 1st-party access_token cookie), preto
 * takúto URL sťahujeme cez `api` ako blob.
 *
 * Tu je len čistá (bez React/blob) logika: či je URL chránená a aká je
 * axios-relatívna cesta (voči baseURL klienta `api`, ktorý je namountovaný na
 * `/api`) – tá ide cez same-origin proxy, takže cookie je 1st-party. Verejné
 * obrázky (S3, blob:, data:, iné cesty) sa vracajú ako null → načítajú sa priamo.
 */

import { getConfiguredApiUrl } from './apiUrl';

function normalizeBasePath(value: string): string {
  return value.replace(/\/+$/, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Regex pre chránenú portfolio file cestu voči danému API base path (napr. `/api`):
 * `<base>/auth/portfolio/<id>/images/<id>/file/`. Base sa berie dynamicky (nie
 * natvrdo `/api`), aby detekcia aj strip vychádzali z jedného zdroja (apiBasePath).
 */
function buildPortfolioImageFilePathRegExp(basePath: string): RegExp {
  return new RegExp(
    `^${escapeRegExp(basePath)}/auth/portfolio/\\d+/images/\\d+/file/?$`,
  );
}

/** Base path klienta `api` (napr. `/api`) – z neho odvodíme axios-relatívnu cestu. */
function apiBasePath(): string {
  const configured = getConfiguredApiUrl();
  if (!configured) return '/api';
  if (configured.startsWith('/')) return normalizeBasePath(configured);
  try {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return normalizeBasePath(new URL(configured, origin).pathname);
  } catch {
    return '/api';
  }
}

/**
 * Ak je `rawUrl` chránená portfolio file URL, vráti axios-relatívnu cestu
 * (voči baseURL klienta `api`) vrátane query (napr. `?variant=medium`).
 * Inak vráti null – verejný/neznámy obrázok sa načíta priamo cez `<img src>`.
 */
export function resolveProtectedPortfolioImageRequestUrl(
  rawUrl: string | null | undefined,
): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let pathname: string;
  let search = '';
  try {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmed, origin);
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    return null;
  }

  const base = apiBasePath();
  if (!buildPortfolioImageFilePathRegExp(base).test(pathname)) return null;

  const relativePath =
    base && pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
  return `${relativePath}${search}`;
}

export function isProtectedPortfolioImageUrl(rawUrl: string | null | undefined): boolean {
  return resolveProtectedPortfolioImageRequestUrl(rawUrl) !== null;
}

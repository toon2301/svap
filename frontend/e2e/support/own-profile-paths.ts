/** Len adresy vlastného účtu z autentifikovanej odpovede; hodnoty sa nikdy nelogujú. */
export type OwnProfilePaths = { canonical: string; numeric: string };

/**
 * Backend generuje slugy aj s bodkami. Prítomný chybný slug sa nesmie potichu
 * zameniť za ID; číselný fallback zostáva len pre chýbajúci historický slug.
 */
export function ownProfilePaths(value: unknown): OwnProfilePaths {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Príprava profilu: odpoveď nemá platnú štruktúru.');
  }
  const { id, slug } = value as Record<string, unknown>;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Príprava profilu: chýba platná identita vlastného účtu.');
  }
  const numeric = `/dashboard/users/${id}`;
  if (slug === undefined || slug === null || slug === '') return { canonical: numeric, numeric };
  if (typeof slug !== 'string' || slug.length > 150 || !/^[A-Za-z0-9._-]+$/.test(slug)
    || slug === '.' || slug === '..') {
    throw new Error('Príprava profilu: server vrátil nepodporovaný tvar slugu.');
  }
  return { canonical: `/dashboard/users/${encodeURIComponent(slug)}`, numeric };
}

/**
 * Presná doména a cesta; jediná voliteľná koncová lomka zodpovedá route kontraktu.
 * Query a fragment nepatria ku kontrole sekcie a ich hodnoty sa nevypisujú.
 */
export function matchesAppPath(actualUrl: string, expectedPath: string, appOrigin: string): boolean {
  try {
    const actual = new URL(actualUrl);
    const expectedOrigin = new URL(appOrigin);
    return ['http:', 'https:'].includes(expectedOrigin.protocol)
      && !actual.username && !actual.password && !expectedOrigin.username && !expectedOrigin.password
      && actual.origin === expectedOrigin.origin
      && (actual.pathname === expectedPath || actual.pathname === `${expectedPath}/`);
  } catch {
    return false;
  }
}

/** Číselný údaj servera, chýbajúca platná hodnota alebo neúspešné odčítanie. */
export type AppDuration = number | 'chýba' | 'nezistiteľné';

/** Len bezpečné metadáta; hodnoty cookies a hlavičky CSRF do tohto typu nepatria. */
export type ResponseDetails = {
  appDurationMs: AppDuration;
  refreshAuth?: { cookieNames: string[] | null; csrfHeaderPresent: boolean | null };
};

/** Minimálne údaje požiadavky potrebné na rozhodnutie, čo sa má vypísať. */
export type ResponseEntry = {
  path: string;
  startedAt: number;
  durationMs: number | null;
  status: number | null;
  responseDetails?: ResponseDetails;
};

// Pevné názvy aplikácie a štandardných auth cookies. Neznámy názov môže tiež
// obsahovať identifikátor; namiesto jeho textu sa preto použije iba kategória other.
const BASE_COOKIE_NAMES = [
  'access_token', 'refresh_token', 'auth_state', 'csrftoken', 'sessionid',
  'google_oauth_state', 'google_oauth_nonce', 'csrf_token',
];
const COOKIE_NAMES = new Set(BASE_COOKIE_NAMES.flatMap(name => [name, `__Host-${name}`, `__Secure-${name}`]));
const REFRESH_PATHS = new Set(['/api/token/refresh/', '/api/auth/token/refresh/']);

/** Rozpozná iba dohodnuté cesty obnovy, nie query či podobný prefix. */
export function isRefreshPath(path: string): boolean { return REFRESH_PATHS.has(path); }

/** Prijme výlučne nezáporné celé bezpečné ms, nikdy text či čiastočný parse tokenu. */
export function parseAppDuration(raw: unknown): number | 'chýba' {
  if (typeof raw !== 'string') return 'chýba';
  const value = raw.trim();
  if (!/^\d{1,16}$/.test(value)) return 'chýba';
  const duration = Number(value);
  return Number.isSafeInteger(duration) ? duration : 'chýba';
}

/** Zoradí jedinečné povolené názvy; žiadny neznámy text sa neprepíše do výstupu. */
export function safeCookieNames(names: readonly unknown[]): string[] {
  return [...new Set(names.map(name => typeof name === 'string' && COOKIE_NAMES.has(name) ? name : 'other'))].sort();
}

/** Zahrnie všetky prijaté obnovy a odpovede dlhšie než 5 s, aj keď telo ešte dobieha. */
export function needsResponseDetails(entry: ResponseEntry, elapsedMs: number): boolean {
  if (entry.status === null) return false;
  return isRefreshPath(entry.path) || (entry.durationMs ?? elapsedMs - entry.startedAt) > 5000;
}

/** Formátuje iba čísla, pevné príznaky a povolené názvy, nie surové HTTP údaje. */
export function formatResponseDetails(entry: ResponseEntry, elapsedMs: number): string[] {
  if (!needsResponseDetails(entry, elapsedMs)) return [];
  const details = entry.responseDetails;
  const raw = details?.appDurationMs;
  const duration = typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0
    ? raw : raw === 'chýba' ? 'chýba' : 'nezistiteľné';
  const lines = [`        X-App-Duration-Ms: ${duration}`];
  if (isRefreshPath(entry.path) && (entry.status === 401 || entry.status === 403)) {
    const names = details?.refreshAuth?.cookieNames;
    const cookies = Array.isArray(names) ? safeCookieNames(names).join(',') || 'žiadne' : 'nezistiteľné';
    const present = details?.refreshAuth?.csrfHeaderPresent;
    const csrf = present === true ? 'áno' : present === false ? 'nie' : 'nezistiteľné';
    lines.push(`        refresh cookies: ${cookies}`, `        refresh X-CSRFToken: ${csrf}`);
  }
  return lines;
}

import { isRefreshPath } from './response-diagnostics-format';
import type { CsrfRequestSnapshot, RefreshProvenance } from './refresh-provenance-format';

type RequestSource = { url(): string; method(): string };
const CSRF_PATH = '/api/auth/csrf-token/';
const MAX_ORIGINS = 16;

/** Parsovanie sa používa iba na porovnanie; URL ani query sa nikdy nevracajú do dôkazov. */
function httpUrl(raw: string): URL | null {
  try {
    const value = new URL(raw);
    return ['http:', 'https:'].includes(value.protocol) && !value.username && !value.password ? value : null;
  } catch { return null; }
}

/**
 * Pasívna korelácia udalostí. Snímok sa uzavrie pri začiatku obnovy, takže odpoveď
 * CSRF doručená až neskôr nemôže spätne vyzerať ako dokončená príprava obnovy.
 */
export class RefreshProvenanceObserver {
  private readonly csrfRequests = new WeakMap<RequestSource, CsrfRequestSnapshot>();
  private readonly lastCsrfByOrigin = new Map<string, CsrfRequestSnapshot>();

  /** Pozoruje iba presný CSRF GET a obnovu; nečíta hlavičky, cookies ani telá. */
  onRequest(request: RequestSource, pageUrl: string, atMs: number): RefreshProvenance | undefined {
    const url = httpUrl(request.url());
    if (!url) return undefined;
    if (request.method() === 'GET' && url.pathname === CSRF_PATH) {
      const csrf: CsrfRequestSnapshot = { startedAtMs: atMs, responseAtMs: null, finishedAtMs: null, status: null, failed: false };
      this.csrfRequests.set(request, csrf);
      this.lastCsrfByOrigin.delete(url.origin);
      this.lastCsrfByOrigin.set(url.origin, csrf);
      if (this.lastCsrfByOrigin.size > MAX_ORIGINS) this.lastCsrfByOrigin.delete(this.lastCsrfByOrigin.keys().next().value!);
    }
    if (!isRefreshPath(url.pathname)) return undefined;
    const page = httpUrl(pageUrl);
    const csrf = this.lastCsrfByOrigin.get(url.origin);
    return { sameOrigin: page ? page.origin === url.origin : null, snapshotAtMs: atMs, csrf: csrf ? { ...csrf } : null };
  }

  /** Čas hlavičiek neznamená dokončené telo; uchová sa iba stav a čas. */
  onResponse(request: RequestSource, status: number, atMs: number): void {
    const csrf = this.csrfRequests.get(request);
    if (!csrf) return;
    csrf.status = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
    csrf.responseAtMs = atMs;
  }

  /** Dokončenie alebo zlyhanie nemení už vytvorené snímky obnovy. */
  onEnd(request: RequestSource, atMs: number, failed: boolean): void {
    const csrf = this.csrfRequests.get(request);
    if (!csrf) return;
    csrf.finishedAtMs = atMs;
    csrf.failed = failed;
  }
}

import type { Page, Request } from '@playwright/test';
import { captureWithin } from './evidence-deadline';
import { diagnosticPath } from './diagnostic-identifiers';
import { safeCookieNames } from './response-diagnostics-format';

type Sample = { from: number; at: number; names: string[] | null };
type Event = { at: number; kind: 'requestfailed' | 'page-crash' | 'browser-disconnected'; path: string };
type Clock = { now(): number; every(callback: () => void): ReturnType<typeof setInterval>;
  cancel(timer: ReturnType<typeof setInterval>): void };
const CLOCK: Clock = { now: Date.now, every: callback => setInterval(callback, 1000), cancel: clearInterval };

/** Kruhová pamäť len názvov a časov. Nečíta storageState, hodnoty cookies ani telá. */
export function observeCookieTimeline(page: Page, clock: Clock = CLOCK) {
  const originAt = clock.now();
  const samples: Sample[] = [];
  const events: Event[] = [];
  const context = page.context();
  const browser = context.browser();
  let stopped = false;
  let busy = false;
  let omittedSamples = 0;
  let omittedEvents = 0;
  let firstRequestFailedAt: number | null = null;

  const sample = (): void => {
    if (stopped) return;
    const from = clock.now();
    const append = (names: string[] | null): void => {
      if (stopped) return;
      if (samples.length === 120) { samples.shift(); omittedSamples += 1; }
      samples.push({ from, at: clock.now(), names });
    };
    // Zaseknuté SDK čítanie nevyvolá každú sekundu ďalšie čítanie ani rast sľubov.
    if (busy) { append(null); return; }
    busy = true;
    const read = Promise.resolve().then(() => context.cookies())
      .then(cookies => safeCookieNames(cookies.map(cookie => cookie.name)));
    void read.then(() => { busy = false; }, () => { busy = false; });
    void captureWithin(() => read, 1000).then(append);
  };
  const record = (kind: Event['kind'], path = 'n/a'): void => {
    if (stopped) return;
    if (kind === 'requestfailed' && firstRequestFailedAt === null) firstRequestFailedAt = clock.now();
    if (events.length === 40) { events.shift(); omittedEvents += 1; }
    events.push({ at: clock.now(), kind, path });
  };
  const failed = (request: Request): void => {
    try {
      if (!['document', 'fetch', 'xhr'].includes(request.resourceType())) return;
      record('requestfailed', diagnosticPath(new URL(request.url()).pathname));
    } catch { /* Nečitateľná adresa nemení pôvodný výsledok. */ }
  };
  const crashed = (): void => record('page-crash');
  const disconnected = (): void => record('browser-disconnected');
  page.on('requestfailed', failed);
  page.on('crash', crashed);
  browser?.on('disconnected', disconnected);
  const timer = clock.every(sample);
  sample(); // Bez čakania pred beforeEach alebo pôvodným gestom.

  return {
    /** Odpojí sa pred bežným zatvorením kontextu, aby teardown nevyzeral ako pád. */
    stop(): string {
      stopped = true;
      clock.cancel(timer);
      page.off('requestfailed', failed);
      page.off('crash', crashed);
      browser?.off('disconnected', disconnected);
      const rows = [
        `[E2E-COOKIE-RING] originAt=${originAt} samples=${samples.length} events=${events.length}`
          + ` omittedSamples=${omittedSamples} omittedEvents=${omittedEvents}`
          + ` firstRequestFailedAt=${firstRequestFailedAt ?? 'n/a'} relation=temporal-only`,
        ...samples.map(item => `[E2E-COOKIE-SAMPLE] from=${item.from} at=${item.at}`
          + ` names=${item.names === null ? 'nezistiteľné' : safeCookieNames(item.names).join(',') || 'žiadne'}`),
        ...events.map(item => `[E2E-BROWSER-EVENT] at=${item.at} kind=${item.kind} path=${item.path}`),
      ];
      return rows.join('\n');
    },
  };
}

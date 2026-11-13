import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Page, Request, Response } from '@playwright/test';
import { RefreshProvenanceObserver } from '../support/refresh-provenance';
import { formatRefreshProvenance, type RefreshProvenance } from '../support/refresh-provenance-format';
import { formatEvidence, type ActivityEntry } from '../support/page-activity-format';
import { observePage } from '../support/page-activity';
import { safeEvidence } from './safe-run-report';

const PRIVATE = 'SYNTHETIC_PRIVATE_VALUE_NEVER_PRINT';
const ORIGIN = 'https://diagnostic.invalid';
const CSRF = '/api/auth/csrf-token/';
const REFRESH = '/api/token/refresh/';
/** Zdroj nemá dostupné telá ani hlavičky; čistý pozorovateľ ich nepotrebuje. */
const request = (path: string, method = 'POST', origin = ORIGIN) => ({ url: () => origin + path, method: () => method });

test('zhoda pôvodu porovná protokol, doménu aj port bez vypisovania URL', () => {
  const observer = new RefreshProvenanceObserver();
  assert.equal(observer.onRequest(request(REFRESH), ORIGIN + '/dashboard', 1)?.sameOrigin, true);
  assert.equal(observer.onRequest(request(REFRESH, 'POST', ORIGIN + ':8443'), ORIGIN, 2)?.sameOrigin, false);
  assert.equal(observer.onRequest(request(REFRESH, 'POST', 'http://diagnostic.invalid'), ORIGIN, 3)?.sameOrigin, false);
  assert.equal(observer.onRequest(request(REFRESH, 'POST', 'https://other.invalid'), ORIGIN, 4)?.sameOrigin, false);
  assert.equal(observer.onRequest(request(REFRESH), 'about:blank', 5)?.sameOrigin, null);
  assert.equal(observer.onRequest(request(REFRESH), PRIVATE, 6)?.sameOrigin, null);
  assert.equal(observer.onRequest({ url: () => PRIVATE, method: () => 'POST' }, ORIGIN, 7), undefined);
  assert.equal(observer.onRequest(request(REFRESH, 'POST', 'https://name:password@diagnostic.invalid'), ORIGIN, 8), undefined);
});

test('snímok obsahuje len predchádzajúci GET rovnakého pôvodu, nie podobnú cestu alebo POST', () => {
  const observer = new RefreshProvenanceObserver();
  observer.onRequest(request(CSRF, 'POST'), ORIGIN, 1);
  observer.onRequest(request(CSRF + 'extra', 'GET'), ORIGIN, 2);
  observer.onRequest(request(CSRF, 'GET', 'https://other.invalid'), ORIGIN, 3);
  assert.equal(observer.onRequest(request(REFRESH), ORIGIN, 4)?.csrf, null);
  const csrf = request(CSRF + '?private=' + PRIVATE, 'GET');
  observer.onRequest(csrf, ORIGIN, 5);
  observer.onResponse(csrf, 200, 6);
  observer.onEnd(csrf, 7, false);
  const snapshot = observer.onRequest(request(REFRESH), ORIGIN, 8);
  assert.deepEqual(snapshot, { sameOrigin: true, snapshotAtMs: 8,
    csrf: { startedAtMs: 5, responseAtMs: 6, finishedAtMs: 7, status: 200, failed: false } });
  assert.ok(!JSON.stringify(snapshot).includes(PRIVATE));
  assert.equal(observer.onRequest(request('/api/auth/me/', 'GET'), ORIGIN, 9), undefined);
});

test('neskoršia odpoveď ani nový GET nemenia snímok vytvorený pri začiatku obnovy', () => {
  const observer = new RefreshProvenanceObserver();
  const first = request(CSRF, 'GET');
  observer.onRequest(first, ORIGIN, 1);
  const pending = observer.onRequest(request(REFRESH), ORIGIN, 2)!;
  observer.onResponse(first, 200, 3);
  observer.onEnd(first, 4, false);
  assert.deepEqual(pending.csrf, { startedAtMs: 1, responseAtMs: null, finishedAtMs: null, status: null, failed: false });
  const received = observer.onRequest(request('/api/auth/token/refresh/'), ORIGIN, 5)!;
  observer.onRequest(request(CSRF, 'GET'), ORIGIN, 6);
  assert.equal(received.csrf?.status, 200);
  assert.equal(received.csrf?.finishedAtMs, 4);
  assert.equal(observer.onRequest(request(REFRESH), ORIGIN, 7)?.csrf?.startedAtMs, 6);
});

test('zlyhanie GET a hlavičky bez dokončeného tela sa rozlišujú', () => {
  const observer = new RefreshProvenanceObserver();
  const failed = request(CSRF, 'GET');
  observer.onRequest(failed, ORIGIN, 1);
  observer.onEnd(failed, 2, true);
  assert.deepEqual(observer.onRequest(request(REFRESH), ORIGIN, 3)?.csrf,
    { startedAtMs: 1, responseAtMs: null, finishedAtMs: 2, status: null, failed: true });
  const headersOnly = request(CSRF, 'GET');
  observer.onRequest(headersOnly, ORIGIN, 4);
  observer.onResponse(headersOnly, 204, 5);
  assert.deepEqual(observer.onRequest(request(REFRESH), ORIGIN, 6)?.csrf,
    { startedAtMs: 4, responseAtMs: 5, finishedAtMs: null, status: 204, failed: false });
  observer.onResponse(request('/unobserved', 'GET'), 200, 7);
  observer.onEnd(request('/unobserved', 'GET'), 8, true);
  observer.onResponse(headersOnly, 999, 9);
  assert.equal(observer.onRequest(request(REFRESH), ORIGIN, 10)?.csrf?.status, null);
});

test('pamäť pôvodov je ohraničená a posledný GET patrí ku konkrétnemu pôvodu', () => {
  const observer = new RefreshProvenanceObserver();
  for (let index = 0; index < 17; index += 1) observer.onRequest(request(CSRF, 'GET', `https://host${index}.invalid`), ORIGIN, index);
  assert.equal(observer.onRequest(request(REFRESH, 'POST', 'https://host0.invalid'), ORIGIN, 18)?.csrf, null);
  assert.equal(observer.onRequest(request(REFRESH, 'POST', 'https://host16.invalid'), ORIGIN, 19)?.csrf?.startedAtMs, 16);
});

test('formát a export povolia len príznaky, pevnú cestu, stavy a celé časy', () => {
  const value: RefreshProvenance = { sameOrigin: false, snapshotAtMs: 4,
    csrf: { startedAtMs: 1, responseAtMs: 2, finishedAtMs: 3, status: 200, failed: false } };
  const lines = formatRefreshProvenance(value);
  assert.deepEqual(safeEvidence(lines.join('\n')), lines);
  assert.match(lines.join('\n'), /refresh same origin: nie/);
  assert.match(lines.join('\n'), /csrf-token\/ status=200 start=1 response=2 end=3 snapshot=4 failed=nie/);
  assert.match(formatRefreshProvenance(undefined).join('\n'), /nezistiteľné/);
  assert.match(formatRefreshProvenance({ sameOrigin: true, snapshotAtMs: 1, csrf: null }).join('\n'), /nepozorované/);
  const unsafe = { sameOrigin: PRIVATE, snapshotAtMs: PRIVATE, csrf: {
    startedAtMs: PRIVATE, responseAtMs: Infinity, finishedAtMs: -1, status: PRIVATE, failed: PRIVATE,
    origin: PRIVATE, value: PRIVATE, path: PRIVATE,
  } } as unknown as RefreshProvenance;
  assert.ok(!formatRefreshProvenance(unsafe).join('\n').includes(PRIVATE));
});

/** Udalosti sú syntetické; metódy s citlivým obsahom by test okamžite zhodili. */
class FakePage extends EventEmitter {
  url() { return ORIGIN + '/dashboard'; }
  context() { return { cookies: async () => [] }; }
  async evaluate() { return null; }
  asPage() { return this as unknown as Page; }
}
/** Minimálny pár Playwright udalostí bez tiel a kompletných hlavičiek. */
function pair(path: string, method: string, status: number) {
  const req = { ...request(path, method), resourceType: () => 'fetch', response: async () => response,
    headerValue: async () => PRIVATE, failure: () => null,
    postData: () => { throw new Error(PRIVATE); }, allHeaders: () => { throw new Error(PRIVATE); },
  } as unknown as Request;
  const response = { request: () => req, status: () => status, headerValue: async () => '1',
    json: () => { throw new Error(PRIVATE); }, text: () => { throw new Error(PRIVATE); },
  } as unknown as Response;
  return { request: req, response };
}

test('skutočný PageActivity zapojí udalosti a žiadne súkromné hodnoty nevypíše', async context => {
  let now = 0;
  context.mock.method(Date, 'now', () => now);
  const page = new FakePage();
  const activity = observePage(page.asPage());
  const csrf = pair(CSRF + '?private=' + PRIVATE, 'GET', 200);
  now = 5; page.emit('request', csrf.request);
  now = 9; page.emit('response', csrf.response);
  now = 11; page.emit('requestfinished', csrf.request);
  await Promise.resolve();
  const refresh = pair(REFRESH, 'POST', 403);
  now = 12; page.emit('request', refresh.request);
  now = 13; page.emit('response', refresh.response);
  const text = await activity.report('syntetický pôvod', 'webkit-mobile');
  assert.match(text, /refresh same origin: áno/);
  assert.match(text, /status=200 start=5 response=9 end=11 snapshot=12 failed=nie/);
  assert.ok(!text.includes(PRIVATE));
  assert.ok(!text.includes(ORIGIN));
});

test('čakanie bez odpovede je spodná hranica, nie serverový timeout; staršia obnova zostáva', () => {
  const base: ActivityEntry = { method: 'GET', path: '/api/auth/me/', query: '', startedAt: 0,
    durationMs: 23_456, status: null, failure: 'Load failed ' + PRIVATE };
  const text = formatEvidence({ title: 'test', project: 'webkit-mobile', elapsedMs: 25_000, url: '/dashboard', snapshot: null,
    pageErrors: [], consoleErrors: 0, entries: [base, { ...base, path: REFRESH, durationMs: null, failure: null },
      ...Array.from({ length: 41 }, () => ({ ...base, status: 200, failure: null, durationMs: 1 }))] });
  assert.match(text, /bez odpovede do konca testu \(aspoň 25\.000 s\)/);
  assert.ok(text.includes(REFRESH));
  const failed = formatEvidence({ title: 'test', project: 'webkit-mobile', elapsedMs: 25_000, url: '/', snapshot: null,
    pageErrors: [], consoleErrors: 0, entries: [base] });
  assert.match(failed, /bez odpovede do konca testu \(aspoň 23\.456 s\)/);
  assert.deepEqual(safeEvidence(failed).filter(line => line.includes('no response:')),
    ['        no response: bez odpovede do konca testu (aspoň 23.456 s)']);
  assert.ok(!failed.includes(PRIVATE));
});

test('odpoveď, zrušenie a neplatný čas nedostanú tvrdenie o čakaní bez odpovede', () => {
  const base: ActivityEntry = { method: 'GET', path: '/api/auth/me/', query: '', startedAt: 0,
    durationMs: 100, status: null, failure: null };
  for (const entry of [
    { ...base, status: 200 },
    { ...base, failure: 'Request cancelled' },
    { ...base, failure: 'net::ERR_ABORTED' },
    { ...base, durationMs: Number.NaN },
  ]) {
    const text = formatEvidence({ title: 'test', project: 'webkit-mobile', elapsedMs: 25_000, url: '/', snapshot: null,
      pageErrors: [], consoleErrors: 0, entries: [entry] });
    assert.ok(!text.includes('no response:'));
  }
});

import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Page, Request, Response, TestInfo } from '@playwright/test';
import { observePage, reportFailureEvidence } from '../support/page-activity';
import { formatEvidence, type ActivityEntry } from '../support/page-activity-format';
import { readResponseDetails } from '../support/response-diagnostics';
import {
  formatResponseDetails, isRefreshPath, needsResponseDetails, parseAppDuration, safeCookieNames,
  type ResponseEntry,
} from '../support/response-diagnostics-format';

const PRIVATE = 'SYNTHETIC_SECRET_NEVER_PRINT';
const header = (value: string | null) => ({ headerValue: async () => value });
const emptyContext = { cookies: async () => [] };
const entry = (overrides: Partial<ResponseEntry> = {}): ResponseEntry => ({
  path: '/api/token/refresh/', startedAt: 0, durationMs: 10, status: 403, ...overrides,
});

test('trvanie prijíma iba celé nezáporné bezpečné ms', () => {
  for (const [raw, expected] of [['0', 0], [' 37 ', 37], ['0002', 2], ['9007199254740991', Number.MAX_SAFE_INTEGER]] as const) {
    assert.equal(parseAppDuration(raw), expected);
  }
  for (const raw of [null, undefined, {}, 10, '', ' ', '-1', '1.2', '1e3', 'NaN', 'Infinity',
    '9007199254740992', '11111111111111111', `12${PRIVATE}`, `12\r\n${PRIVATE}`]) {
    assert.equal(parseAppDuration(raw), 'chýba');
  }
});

test('názvy cookies sú jedinečné, bezpečné a bez ľubovoľných identifikátorov', () => {
  const names = safeCookieNames(['refresh_token', PRIVATE, 'csrftoken', 'refresh_token', 123, '__Host-access_token']);
  assert.deepEqual(names, ['__Host-access_token', 'csrftoken', 'other', 'refresh_token']);
  assert.ok(!names.join(',').includes(PRIVATE));
  assert.equal(isRefreshPath('/api/token/refresh/'), true);
  assert.equal(isRefreshPath('/api/auth/token/refresh/'), true);
  for (const value of ['/api/token/refresh/extra', '/api/token/refresh/?token=private', '/api/auth/me/']) {
    assert.equal(isRefreshPath(value), false);
  }
});

test('obnova sa zaznamená vždy, ostatné odpovede až striktne nad 5000 ms', () => {
  assert.equal(needsResponseDetails(entry({ status: 200 }), 10), true);
  assert.equal(needsResponseDetails(entry({ status: null }), 10_000), false);
  assert.equal(needsResponseDetails(entry({ path: '/api/auth/me/', durationMs: 5000 }), 6000), false);
  assert.equal(needsResponseDetails(entry({ path: '/api/auth/me/', durationMs: 5001 }), 6000), true);
  assert.equal(needsResponseDetails(entry({ path: '/api/auth/me/', durationMs: null }), 5001), true);
  assert.deepEqual(formatResponseDetails(entry({ path: '/api/auth/me/' }), 10), []);
});

test('formát má aj chýbajúce a nezistiteľné údaje bez surových hodnôt', () => {
  assert.ok(formatResponseDetails(entry(), 10).join('\n').includes('X-App-Duration-Ms: nezistiteľné'));
  const details = {
    appDurationMs: 'chýba' as const,
    refreshAuth: { cookieNames: [], csrfHeaderPresent: null },
  };
  const output = formatResponseDetails(entry({ responseDetails: details }), 10).join('\n');
  assert.ok(output.includes('X-App-Duration-Ms: chýba'));
  assert.ok(output.includes('refresh cookies: žiadne'));
  assert.ok(output.includes('refresh X-CSRFToken: nezistiteľné'));
  const unsafe = {
    appDurationMs: PRIVATE,
    refreshAuth: { cookieNames: [PRIVATE], csrfHeaderPresent: PRIVATE, value: PRIVATE },
  } as unknown as NonNullable<ResponseEntry['responseDetails']>;
  assert.ok(!formatResponseDetails(entry({ responseDetails: unsafe }), 10).join('\n').includes(PRIVATE));
  assert.ok(!formatResponseDetails(entry({ status: 200, responseDetails: details }), 10).join('\n').includes('refresh cookies'));
});

test('číta sa jediná vybraná hlavička; bežná odpoveď nečíta cookies ani CSRF', async () => {
  const selected: string[] = [];
  const response = { headerValue: async (name: string) => { selected.push(name); return '23'; } };
  const forbidden = { headerValue: async () => { throw new Error(PRIVATE); } };
  const context = { cookies: async () => { throw new Error(PRIVATE); } };
  assert.deepEqual(await readResponseDetails(response, forbidden, context, false), { appDurationMs: 23 });
  assert.deepEqual(selected, ['x-app-duration-ms']);
});

test('hodnota cookie sa ani neprečíta a CSRF hodnota sa zmení iba na áno', async () => {
  let cookieValueReads = 0;
  const cookie = { name: 'refresh_token', get value() { cookieValueReads += 1; throw new Error(PRIVATE); } };
  const details = await readResponseDetails(header('7'), header(PRIVATE), { cookies: async () => [cookie] }, true);
  assert.equal(cookieValueReads, 0);
  assert.deepEqual(details, { appDurationMs: 7, refreshAuth: { cookieNames: ['refresh_token'], csrfHeaderPresent: true } });
  const output = formatResponseDetails(entry({ responseDetails: details }), 10).join('\n');
  assert.ok(output.includes('refresh X-CSRFToken: áno'));
  assert.ok(!output.includes(PRIVATE));
  assert.ok(!JSON.stringify(details).includes(PRIVATE));
});

test('neprítomná CSRF hlavička je nie; prítomná prázdna hlavička je stále áno', async () => {
  const absent = await readResponseDetails(header(null), header(null), emptyContext, true);
  const empty = await readResponseDetails(header('0'), header(''), emptyContext, true);
  assert.equal(absent.refreshAuth?.csrfHeaderPresent, false);
  assert.equal(empty.refreshAuth?.csrfHeaderPresent, true);
  assert.ok(formatResponseDetails(entry({ responseDetails: absent }), 10).join('\n').includes('X-CSRFToken: nie'));
});

test('chyby odčítania neprepíšu citlivý text a nespôsobia chybu testu', async () => {
  const broken = { headerValue: async () => { throw new Error(PRIVATE); } };
  const context = { cookies: async () => { throw new Error(PRIVATE); } };
  const details = await readResponseDetails(broken, broken, context, true);
  assert.deepEqual(details, { appDurationMs: 'nezistiteľné', refreshAuth: { cookieNames: null, csrfHeaderPresent: null } });
  assert.ok(!JSON.stringify(details).includes(PRIVATE));
});

test('zaseknuté čítanie má vlastný rozpočet a nezmení sa na nekonečný teardown', { timeout: 4000 }, async () => {
  const broken = { headerValue: (): Promise<string | null> => new Promise(() => undefined) };
  const context = { cookies: (): Promise<{ name: string }[]> => new Promise(() => undefined) };
  const details = await readResponseDetails(broken, broken, context, true);
  assert.equal(details.appDurationMs, 'nezistiteľné');
  assert.equal(details.refreshAuth?.cookieNames, null);
  assert.equal(details.refreshAuth?.csrfHeaderPresent, null);
});

/** Stránka vracia iba technickú snímku a kontext s názvami syntetických cookies. */
class FakePage extends EventEmitter {
  names = ['refresh_token', 'csrftoken'];
  cookieReads = 0;
  url() { return 'https://diagnostic.invalid/dashboard'; }
  context() { return { cookies: async () => { this.cookieReads += 1; return this.names.map(name => ({ name })); } }; }
  async evaluate() { return {
    readyState: 'complete', viewerReady: true, loadingMarkers: 0, scrollTop: 0, scrollHeight: 1000,
    clientHeight: 600, panelAriaHidden: null, active: null, domContentLoadedMs: 1, loadMs: 2,
  }; }
  asPage() { return this as unknown as Page; }
}

/** Bez tiel či kompletných hlavičiek; tieto metódy by odhalili chybu projekcie. */
function pair(path: string, status = 403) {
  const request = {
    resourceType: () => 'fetch', method: () => 'POST', url: () => `https://diagnostic.invalid${path}`,
    headerValue: async (name: string) => { assert.equal(name, 'x-csrftoken'); return PRIVATE; },
    response: async () => response,
  } as unknown as Request;
  const response = {
    request: () => request, status: () => status,
    headerValue: async (name: string) => { assert.equal(name, 'x-app-duration-ms'); return '17'; },
    text: () => { throw new Error(PRIVATE); }, json: () => { throw new Error(PRIVATE); },
  } as unknown as Response;
  return { request, response };
}

test('odmietnutá obnova sa odčíta pri odpovedi, nie až pri neskoršom reporte', async () => {
  const page = new FakePage();
  const activity = observePage(page.asPage());
  const item = pair('/api/token/refresh/');
  page.emit('request', item.request);
  page.emit('response', item.response);
  // Odčítanie sa začne súbežne; po tejto mikrotaske sa cookie snapshot už vytvoril.
  await Promise.resolve();
  page.names = [];
  const output = await activity.report('odpoveď', 'webkit-mobile');
  assert.equal(page.cookieReads, 1);
  assert.match(output, /\/api\/token\/refresh\/\s+403\s+…/);
  assert.ok(output.includes('X-App-Duration-Ms: 17'));
  assert.ok(output.includes('refresh cookies: csrftoken,refresh_token'));
  assert.ok(!output.includes(PRIVATE));
});

test('nepozorovaná odpoveď ani zatvorený kontext nezlomia test či neodhalia chybu', async context => {
  const page = new FakePage();
  const activity = observePage(page.asPage());
  const ignored = pair('/api/token/refresh/');
  assert.doesNotThrow(() => page.emit('response', ignored.response));
  assert.equal(page.cookieReads, 0);
  const item = pair('/api/token/refresh/');
  page.emit('request', item.request);
  context.mock.method(page, 'context', () => { throw new Error(PRIVATE); });
  assert.doesNotThrow(() => page.emit('response', item.response));
  const output = await activity.report('zatvorený kontext', 'webkit-mobile');
  assert.ok(output.includes('refresh X-CSRFToken: nezistiteľné'));
  assert.ok(!output.includes(PRIVATE));
});

test('pomalá odpoveď doplní trvanie a hlavičky neukončia hľadanie pred telom', async context => {
  let clock = 0;
  context.mock.method(Date, 'now', () => clock);
  const page = new FakePage();
  const activity = observePage(page.asPage());
  const item = pair('/api/auth/search/global/', 200);
  page.emit('request', item.request);
  clock = 2000;
  page.emit('response', item.response);
  assert.equal(activity.searchQuietForMs(), 0);
  clock = 5001;
  const unfinished = await activity.report('pomalé telo', 'webkit-desktop');
  assert.ok(unfinished.includes('X-App-Duration-Ms: 17'));
  page.emit('requestfinished', item.request);
  await Promise.resolve();
  clock = 5010;
  assert.equal(activity.searchQuietForMs(), 9);
  const finished = await activity.report('odpoveď', 'webkit-desktop');
  assert.ok(finished.includes('X-App-Duration-Ms: 17'));
  assert.equal(page.cookieReads, 0);
});

test('staršia obnova a pomalá odpoveď sa nestratia po viac než 40 ďalších záznamoch', () => {
  const basic = { method: 'GET', path: '/api/auth/me/', query: '', startedAt: 0, durationMs: 1, status: 200, failure: null };
  const entries: ActivityEntry[] = [
    { ...basic, path: '/api/token/refresh/', responseDetails: { appDurationMs: 2 } },
    { ...basic, durationMs: 6000, responseDetails: { appDurationMs: 3 } },
    ...Array.from({ length: 43 }, () => ({ ...basic })),
  ];
  const output = formatEvidence({ title: 'test', project: 'webkit-mobile', elapsedMs: 7000,
    url: '/dashboard', entries, pageErrors: [], consoleErrors: 0, snapshot: null });
  assert.ok(output.includes('3 older omitted'));
  assert.ok(output.includes('X-App-Duration-Ms: 2'));
  assert.ok(output.includes('X-App-Duration-Ms: 3'));
});

test('ani výpis ani príloha neobsahujú hodnotu cookie, token, telo či surovú chybu', async context => {
  const page = new FakePage();
  const output: string[] = [];
  context.mock.method(console, 'log', (value: unknown) => output.push(String(value)));
  observePage(page.asPage());
  const item = pair('/api/token/refresh/', 401);
  page.emit('request', item.request);
  page.emit('response', item.response);
  const info = {
    status: 'failed', expectedStatus: 'passed', titlePath: ['bezpečnosť'], project: { name: 'webkit-mobile' },
    attach: async (_name: string, options: { body: string }) => { output.push(options.body); },
  } as unknown as TestInfo;
  await reportFailureEvidence(page.asPage(), info);
  assert.equal(output.length, 2);
  for (const text of output) {
    assert.ok(text.includes('X-App-Duration-Ms: 17'));
    assert.ok(text.includes('refresh X-CSRFToken: áno'));
    assert.ok(!text.includes(PRIVATE));
  }
});

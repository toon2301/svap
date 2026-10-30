import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import type { Page, Request, TestInfo } from '@playwright/test';
import { diagnosticMethod, diagnosticPath, diagnosticQuery, diagnosticTitle } from '../support/diagnostic-identifiers';
import { observePage, reportFailureEvidence } from '../support/page-activity';
import type { PageSnapshot } from '../support/page-activity-format';

const snapshot: PageSnapshot = {
  readyState: 'complete', domContentLoadedMs: 10, loadMs: 20, loadingMarkers: 0,
  scrollTop: 0, scrollHeight: 1200, clientHeight: 700, panelAriaHidden: 'true',
  viewerReady: true, active: null,
};

/** Minimálna stránka pre test pozorovania; nikdy nespúšťa prehliadač ani sieť. */
class FakePage extends EventEmitter {
  address = 'https://diagnostics.invalid/search?q=DO_NOT_PUBLISH&tab=offers';
  snapshot: () => Promise<PageSnapshot> = async () => snapshot;
  url(): string { return this.address; }
  evaluate(): Promise<PageSnapshot> { return this.snapshot(); }
  asPage(): Page { return this as unknown as Page; }
}

/** Požiadavka poskytuje len technické metódy; čítanie tela by test okamžite zhodilo. */
function request(url: string, status = 200, failure: string | null = null): Request {
  return {
    resourceType: () => 'fetch', method: () => 'GET', url: () => url,
    response: async () => ({ status: () => status, json: () => { throw new Error('Telo sa nesmie čítať.'); } }),
    failure: () => failure ? { errorText: failure } : null,
  } as unknown as Request;
}

/** Umožní dokončiť asynchrónne zaznamenanie HTTP stavu bez pridávania aplikačných čakaní. */
async function finish(page: FakePage, item: Request): Promise<void> {
  page.emit('requestfinished', item);
  await Promise.resolve();
  await Promise.resolve();
}

test('cesty, názvy parametrov a metódy nepustia neznáme identifikátory', () => {
  assert.equal(diagnosticPath('/api/auth/offer-watches/123/matches/'), '/api/auth/offer-watches/:n/matches/');
  assert.equal(diagnosticPath('/dashboard/users/DO_NOT_PUBLISH'), '/dashboard/users/:id');
  assert.equal(diagnosticPath('/api/DO_NOT_PUBLISH/long-private-slug'), '/api/:other/:other');
  assert.equal(diagnosticPath('/reset-password/private-code/private-token'), '/reset-password/:id/:id');
  assert.equal(diagnosticQuery('?q=DO_NOT_PUBLISH&tab=offers&DO_NOT_PUBLISH=value'), ':param,q(14),tab');
  assert.equal(diagnosticMethod('PRIVATE_METHOD'), 'OTHER');
  assert.equal(diagnosticMethod('POST'), 'POST');
  assert.equal(diagnosticTitle('test /search?q=DO_NOT_PUBLISH&tab=offers'), 'test /search?q=[value]&tab=[value]');
  assert.equal(diagnosticTitle('test https://private.invalid/path'), 'test [url]');
});

test('pozorovateľ je jediný a zachytí prípravný request bez čítania jeho tela', async () => {
  const page = new FakePage();
  const activity = observePage(page.asPage());
  assert.equal(observePage(page.asPage()), activity);
  assert.equal(page.listenerCount('request'), 1);
  const item = request('https://diagnostics.invalid/api/auth/me/');
  page.emit('request', item);
  await finish(page, item);
  const text = await activity.report('príprava', 'webkit-mobile');
  assert.match(text, /GET\s+\/api\/auth\/me\/\s+200/);
  assert.ok(!text.includes('DO_NOT_PUBLISH'));
});

test('stav 401 a sieťový pád zostanú rozlíšené od pending bez úniku textov', async () => {
  const page = new FakePage();
  const activity = observePage(page.asPage());
  const denied = request('https://diagnostics.invalid/api/auth/me/', 401);
  page.emit('request', denied);
  await finish(page, denied);
  const failed = request('https://diagnostics.invalid/api/auth/search/?q=PRIVATE_QUERY', 0, 'Could not connect to DO_NOT_PUBLISH');
  page.emit('request', failed);
  page.emit('requestfailed', failed);
  const pending = request('https://diagnostics.invalid/api/auth/search/global/?q=PRIVATE_QUERY');
  page.emit('request', pending);
  assert.equal(activity.searchQuietForMs(), 0);
  page.emit('console', { type: () => 'error', text: () => 'DO_NOT_PUBLISH' });
  page.emit('pageerror', { name: 'PRIVATE_ERROR_NAME', message: 'DO_NOT_PUBLISH' });
  const text = await activity.report('sieť', 'webkit-desktop');
  assert.match(text, /\/api\/auth\/me\/\s+401/);
  assert.ok(text.includes('FAILED(unreachable)'));
  assert.match(text, /\/api\/auth\/search\/global\/ \[q\(13\)\]\s+pending/);
  assert.ok(text.includes('page errors: 1 (Error) | console errors: 1'));
  for (const value of ['PRIVATE_QUERY', 'DO_NOT_PUBLISH', 'PRIVATE_ERROR_NAME']) assert.ok(!text.includes(value));
});

test('po odmietnutí snímky zostane cesta aj sieť dostupná', async () => {
  const page = new FakePage();
  page.snapshot = async () => { throw new Error('DO_NOT_PUBLISH'); };
  const text = await observePage(page.asPage()).report('pád', 'webkit-desktop');
  assert.ok(text.includes('url: /search [q(14),tab]'));
  assert.ok(text.includes('page state: unavailable'));
  assert.ok(!text.includes('DO_NOT_PUBLISH'));
});

test('nekonečná snímka neblokuje dôkazy a zachová bezpečnú URL', { timeout: 4000 }, async () => {
  const page = new FakePage();
  page.snapshot = () => new Promise(() => undefined);
  const text = await observePage(page.asPage()).report('pád', 'webkit-desktop');
  assert.ok(text.includes('page state: unavailable'));
  assert.ok(text.includes('url: /search [q(14),tab]'));
});

test('report sa vytvorí pri páde, nie pri PASS, očakávanom páde ani SKIP', async (context) => {
  const page = new FakePage();
  observePage(page.asPage());
  const logged: unknown[] = [];
  context.mock.method(console, 'log', (value: unknown) => logged.push(value));
  const attachments: { name: string; body: unknown }[] = [];
  const info = (status: string, expectedStatus = 'passed') => ({
    status, expectedStatus, titlePath: ['príprava'], project: { name: 'webkit-mobile' },
    attach: async (name: string, options: { body: unknown }) => { attachments.push({ name, body: options.body }); },
  } as unknown as TestInfo);
  await reportFailureEvidence(page.asPage(), info('passed'));
  await reportFailureEvidence(page.asPage(), info('skipped'));
  await reportFailureEvidence(page.asPage(), info('failed', 'failed'));
  assert.equal(attachments.length, 0);
  await reportFailureEvidence(page.asPage(), info('failed'), '[E2E-SESSION] snapshot=unavailable observedAt=0');
  assert.equal(logged.length, 1);
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].name, 'failure-evidence');
  assert.ok(String(attachments[0].body).includes('[E2E-SESSION] snapshot=unavailable'));
});

test('odmietnutá príloha ani pokazený logger neprekryjú pôvodný pád', async (context) => {
  const page = new FakePage();
  observePage(page.asPage());
  context.mock.method(console, 'log', () => { throw new Error('DO_NOT_PUBLISH'); });
  let attached = 0;
  const info = {
    status: 'failed', expectedStatus: 'passed', titlePath: ['príprava'], project: { name: 'webkit-mobile' },
    attach: async () => { attached += 1; throw new Error('DO_NOT_PUBLISH'); },
  } as unknown as TestInfo;
  await assert.doesNotReject(reportFailureEvidence(page.asPage(), info));
  assert.equal(attached, 1);
  assert.equal(info.status, 'failed');
});

test('neukončená príloha má vlastný rozpočet, nie nekonečný teardown', { timeout: 4000 }, async (context) => {
  const page = new FakePage();
  observePage(page.asPage());
  context.mock.method(console, 'log', () => undefined);
  const info = {
    status: 'failed', expectedStatus: 'passed', titlePath: ['príprava'], project: { name: 'webkit-mobile' },
    attach: () => new Promise(() => undefined),
  } as unknown as TestInfo;
  await reportFailureEvidence(page.asPage(), info);
  assert.equal(info.status, 'failed');
});

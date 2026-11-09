import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Page } from '@playwright/test';
import { observeCookieTimeline } from '../support/cookie-timeline';

const PRIVATE = 'SYNTHETIC_VALUE_NEVER_PRINT';

/** Riadená sekundová vzorka bez siete, skutočných cookies alebo prehliadača. */
function fixture(read: () => Promise<Array<{ name: string }>> = async () => []) {
  const page = new EventEmitter();
  const browser = new EventEmitter();
  const context = { cookies: read, browser: () => browser };
  Object.assign(page, { context: () => context });
  let at = 100_000;
  let tick = () => {};
  let cancelled = false;
  const timeline = observeCookieTimeline(page as unknown as Page, {
    now: () => at,
    every: callback => { tick = callback; return 0 as unknown as ReturnType<typeof setInterval>; },
    cancel: () => { cancelled = true; },
  });
  return { page, browser, timeline, tick: () => { at += 1000; tick(); }, cancelled: () => cancelled };
}

/** Dokončí len mikrotasky SDK čítania, neposúva čas testov aplikácie. */
async function settle() { for (let index = 0; index < 16; index += 1) await Promise.resolve(); }

test('ukladá iba povolené názvy; getter hodnoty cookie sa nikdy neprečíta', async () => {
  const f = fixture(async () => [
    { name: 'refresh_token', get value(): string { throw new Error(PRIVATE); } },
    { name: PRIVATE, get value(): string { throw new Error(PRIVATE); } },
    { name: 'csrftoken' }, { name: 'refresh_token' },
  ]);
  await settle();
  const text = f.timeline.stop();
  assert.match(text, /names=csrftoken,other,refresh_token/);
  assert.ok(!text.includes(PRIVATE));
});

test('úspešné prázdne cookies sa odlišujú od neúspešného odčítania', async () => {
  const empty = fixture();
  await settle();
  assert.match(empty.timeline.stop(), /names=žiadne/);
  const rejected = fixture(async () => { throw new Error(PRIVATE); });
  await settle();
  const text = rejected.timeline.stop();
  assert.match(text, /names=nezistiteľné/);
  assert.ok(!text.includes(PRIVATE));
});

test('zachytí prechod neprázdne → prázdne a čas prvej chyby bez URL údajov', async () => {
  let names = ['access_token'];
  const f = fixture(async () => names.map(name => ({ name })));
  await settle();
  names = [];
  f.tick();
  await settle();
  f.page.emit('requestfailed', { resourceType: () => 'fetch',
    url: () => `https://diagnostic.invalid/api/auth/dashboard/users/${PRIVATE}/profile/?q=${PRIVATE}` });
  f.page.emit('crash');
  f.browser.emit('disconnected');
  const text = f.timeline.stop();
  assert.match(text, /from=100000 at=100000 names=access_token/);
  assert.match(text, /from=101000 at=101000 names=žiadne/);
  assert.match(text, /at=101000 kind=requestfailed path=\/api\/auth\/dashboard\/users\/:id\/profile\//);
  assert.match(text, /kind=page-crash/);
  assert.match(text, /kind=browser-disconnected/);
  assert.ok(!text.includes(PRIVATE));
});

test('kruhová pamäť má najviac 120 vzoriek a 40 udalostí', async () => {
  const f = fixture();
  await settle();
  for (let index = 0; index < 130; index += 1) { f.tick(); await settle(); f.page.emit('crash'); }
  const text = f.timeline.stop();
  assert.match(text, /samples=120 events=40 omittedSamples=11 omittedEvents=90/);
  assert.equal((text.match(/^\[E2E-COOKIE-SAMPLE\]/gm) ?? []).length, 120);
  assert.equal((text.match(/^\[E2E-BROWSER-EVENT\]/gm) ?? []).length, 40);
});

test('neprekrýva zaseknuté SDK čítania; busy nie je prázdny zoznam', async () => {
  let calls = 0;
  let resolve: (value: Array<{ name: string }>) => void = () => {};
  const f = fixture(() => { calls += 1; return new Promise(done => { resolve = done; }); });
  await settle();
  for (let index = 0; index < 10; index += 1) f.tick();
  assert.equal(calls, 1);
  const text = f.timeline.stop();
  assert.ok(!text.includes('names=žiadne'));
  assert.match(text, /names=nezistiteľné/);
  resolve([{ name: PRIVATE }]);
  await settle();
  assert.equal(f.timeline.stop(), text, 'Neskorý výsledok po stop sa nesmie zapísať.');
});

test('stop odstráni časovač a poslucháče, bežné zatvorenie nie je pád', async () => {
  const f = fixture();
  await settle();
  const text = f.timeline.stop();
  assert.equal(f.cancelled(), true);
  assert.equal(f.page.listenerCount('crash'), 0);
  assert.equal(f.page.listenerCount('requestfailed'), 0);
  assert.equal(f.browser.listenerCount('disconnected'), 0);
  f.page.emit('crash'); f.browser.emit('disconnected'); f.tick();
  assert.equal(f.timeline.stop(), text);
});

test('ignoruje obrázky a nečitateľné adresy bez propagácie textu chyby', async () => {
  const f = fixture();
  await settle();
  f.page.emit('requestfailed', { resourceType: () => 'image', url: () => PRIVATE });
  f.page.emit('requestfailed', { resourceType: () => 'fetch', url: () => { throw new Error(PRIVATE); } });
  assert.match(f.timeline.stop(), /events=0/);
});

test('čas prvého requestfailed nezmizne po preplnení kruhu udalostí', async () => {
  const f = fixture();
  await settle();
  const failed = { resourceType: () => 'fetch', url: () => 'https://diagnostic.invalid/api/auth/me/' };
  f.page.emit('requestfailed', failed);
  for (let index = 0; index < 50; index += 1) { f.tick(); await settle(); f.page.emit('requestfailed', failed); }
  assert.match(f.timeline.stop(), /firstRequestFailedAt=100000/);
});

test('zaseknuté čítanie má nezistiteľnú vzorku aj bez ďalšieho intervalu', { timeout: 4000 }, async () => {
  let resolve: (value: Array<{ name: string }>) => void = () => {};
  const f = fixture(() => new Promise(done => { resolve = done; }));
  await new Promise(done => setTimeout(done, 1100));
  const text = f.timeline.stop();
  assert.match(text, /samples=1/);
  assert.match(text, /names=nezistiteľné/);
  resolve([]);
  await settle();
  assert.equal(f.timeline.stop(), text);
});

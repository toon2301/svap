import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Page } from '@playwright/test';
import { formatLanguageTapEvidence, observeLanguageTaps } from '../support/language-tap-diagnostics';

const event = {
  phase: 'capture', kind: 'pointerdown', choice: 'cs', stored: 'sk',
  prevented: false, trusted: true, atMs: 125,
};
const snapshot = { stored: 'sk', selected: ['sk'], backMatchesStored: 1, events: [event], dropped: 0 };
const labels = { sk: 'sk', cs: 'cs', en: 'en', de: 'de', pl: 'pl', hu: 'hu' };

test('formát obsahuje iba pevné polia diagnostiky gesta', () => {
  assert.equal(formatLanguageTapEvidence(snapshot), [
    '[E2E-TAP] snapshot=available stored=sk selected=sk backMatchesStored=1 events=1 dropped=0',
    '[E2E-TAP] phase=capture kind=pointerdown choice=cs stored=sk prevented=false trusted=true atMs=125',
  ].join('\n'));
});

test('chýbajúca alebo chybná snímka neunikne do výstupu', () => {
  for (const value of [null, undefined, false, 'DO_NOT_PUBLISH', [], {},
    { ...snapshot, stored: 'DO_NOT_PUBLISH' }, { ...snapshot, selected: ['DO_NOT_PUBLISH'] },
    { ...snapshot, selected: Array(7).fill('sk') }, { ...snapshot, events: {} },
    { ...snapshot, dropped: -1 }, { ...snapshot, dropped: 0.5 },
    { ...snapshot, dropped: Infinity }, { ...snapshot, backMatchesStored: 'DO_NOT_PUBLISH' },
    { ...snapshot, backMatchesStored: 11 }]) {
    assert.equal(formatLanguageTapEvidence(value), '[E2E-TAP] snapshot=unavailable');
  }
});

test('všetky jazyky, fázy a typy udalostí zostanú enumami', () => {
  for (const locale of ['sk', 'cs', 'en', 'de', 'pl', 'hu']) {
    for (const kind of ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'click']) {
      for (const phase of ['capture', 'bubble']) {
        const output = formatLanguageTapEvidence({ ...snapshot, stored: locale,
          selected: [locale], events: [{ ...event, choice: locale, stored: locale, kind, phase }] });
        assert.ok(output.includes(`phase=${phase} kind=${kind} choice=${locale} stored=${locale}`));
      }
    }
  }
  assert.ok(formatLanguageTapEvidence({ ...snapshot, stored: 'other', selected: [], backMatchesStored: null })
    .startsWith('[E2E-TAP] snapshot=available stored=other selected=none backMatchesStored=n/a'));
});

test('neznáme hodnoty udalostí a nadbytočné súkromné polia sa nevypíšu', () => {
  const invalid = [null, false, [], 'DO_NOT_PUBLISH',
    { ...event, phase: 'DO_NOT_PUBLISH' }, { ...event, kind: 'DO_NOT_PUBLISH' },
    { ...event, choice: 'DO_NOT_PUBLISH' }, { ...event, stored: 'DO_NOT_PUBLISH' },
    { ...event, prevented: 'DO_NOT_PUBLISH' }, { ...event, trusted: 'DO_NOT_PUBLISH' },
    { ...event, atMs: 'DO_NOT_PUBLISH' }, { ...event, atMs: -1 }];
  const output = formatLanguageTapEvidence({ ...snapshot, private: 'DO_NOT_PUBLISH',
    events: [...invalid, { ...event, private: 'DO_NOT_PUBLISH' }] });
  assert.ok(!output.includes('DO_NOT_PUBLISH'));
  assert.ok(output.includes(`events=1 dropped=${invalid.length}`));
});

test('výstup má pevný limit osemdesiat udalostí', () => {
  const output = formatLanguageTapEvidence({ ...snapshot, events: Array(100).fill(event), dropped: 2 });
  assert.equal(output.split('\n').length, 81);
  assert.ok(output.includes('events=80 dropped=22'));
});

test('neúspešné čítanie alebo priloženie diagnostiky nezakryje pôvodnú chybu', async () => {
  const output: string[] = [];
  const previousLog = console.log;
  console.log = (value: string) => { output.push(value); };
  try {
    const page = {
      addInitScript: async () => undefined,
      evaluate: async () => { throw new Error('DO_NOT_PUBLISH'); },
    } as unknown as Page;
    const finish = await observeLanguageTaps(page, {
      attach: async () => { throw new Error('DO_NOT_PUBLISH'); },
    }, labels);
    const original = new Error('ORIGINAL_ASSERTION_FAILURE');
    await assert.rejects(async () => {
      try { throw original; } finally { await finish(); }
    }, (error) => error === original);
    assert.deepEqual(output, ['[E2E-TAP] moment=finally\n[E2E-TAP] snapshot=unavailable']);
  } finally { console.log = previousLog; }
});

test('zlyhanie inštalácie nemení beh a nespustí ďalšie čítanie stránky', async () => {
  let reads = 0;
  const attachments: string[] = [];
  const previousLog = console.log;
  console.log = () => undefined;
  try {
    const finish = await observeLanguageTaps({
      addInitScript: async () => { throw new Error('DO_NOT_PUBLISH'); },
      evaluate: async () => { reads += 1; return snapshot; },
    } as unknown as Page, { attach: async (_name, options) => {
      attachments.push(options?.body?.toString() ?? '');
    } }, labels);
    await finish();
    assert.equal(reads, 0);
    assert.deepEqual(attachments, ['[E2E-TAP] moment=finally\n[E2E-TAP] snapshot=unavailable']);
  } finally { console.log = previousLog; }
});

test('snímka vzniká až pri ukončení, bez náhradného kliku alebo zápisu', async () => {
  const calls: string[] = [];
  const previousLog = console.log;
  console.log = () => undefined;
  try {
    const finish = await observeLanguageTaps({
      addInitScript: async () => { calls.push('install'); },
      evaluate: async () => { calls.push('snapshot'); return snapshot; },
    } as unknown as Page, { attach: async (name) => { calls.push(name); } }, labels);
    assert.deepEqual(calls, ['install']);
    await finish();
    assert.deepEqual(calls, ['install', 'snapshot', 'language-tap-evidence']);
  } finally { console.log = previousLog; }
});

test('pozorovateľ nemá sieť, textové snímky ani zásah do udalostí', () => {
  const source = fs.readFileSync(path.join(__dirname, '../support/language-tap-diagnostics.ts'), 'utf8');
  assert.ok(!/\.(?:preventDefault|stopPropagation|stopImmediatePropagation|tap|click)\s*\(/.test(source));
  assert.ok(!/\b(?:fetch|innerText|textContent|innerHTML|storageState|cookies)\b/.test(source));
  assert.ok(!/localStorage\.setItem/.test(source));
  assert.ok(source.includes('passive: true'));
});

test('označenie okamihu sa tiež nedá zneužiť na vypísanie textu', async () => {
  const output: string[] = [];
  const previousLog = console.log;
  console.log = (value: string) => { output.push(value); };
  try {
    const finish = await observeLanguageTaps({
      addInitScript: async () => undefined, evaluate: async () => snapshot,
    } as unknown as Page, { attach: async () => undefined }, labels);
    await finish('DO_NOT_PUBLISH' as never);
    assert.ok(output[0].startsWith('[E2E-TAP] moment=finally\n'));
    assert.ok(!output[0].includes('DO_NOT_PUBLISH'));
  } finally { console.log = previousLog; }
});

test('produkčný špec má iba zdôvodnenú výnimku 225 a pôvodné asercie', () => {
  const spec = fs.readFileSync(path.join(__dirname, '../mobile-language-header.spec.ts'), 'utf8').replace(/\r\n/g, '\n');
  const start = spec.indexOf('test(`mobile: ${theme} language changes update the top title');
  const end = spec.indexOf('test(`mobile: ${theme} language app Back', start);
  assert.ok(start > 0 && end > start);
  const body = spec.slice(start, end);
  assert.match(body, /\}\)\.click\(\);\s*await expectMobileLanguage\(page, nextLocale\);/);
  assert.ok(body.includes('Nález 225:'));
  assert.ok(body.includes("localStorage.getItem('appLocale')"));
  assert.ok(!/\.tap\(|waitForTimeout|test\.(?:fail|fixme)|setTimeout/.test(body));
  assert.ok(body.indexOf("finishTapDiagnostics('before-reload')") < body.indexOf('await page.reload()'));
  assert.ok(body.includes('finally {\n      await finishTapDiagnostics();'));
});

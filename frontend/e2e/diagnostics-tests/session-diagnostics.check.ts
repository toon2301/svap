import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createSessionDiagnostics, formatSessionDiagnostics, parseSessionDiagnostics, readSessionDiagnostics,
  safeSessionError, sessionDiagnosticsPath, sessionErrorKind, formatSessionDiagnostic,
} from '../support/session-diagnostics';
import { startSessionKeeper } from '../support/sessionKeeper';

/** Každý test používa len vlastný dočasný priečinok, nikdy reálny prihlasovací stav alebo Railway. */
async function directory(t: { after: (callback: () => Promise<void>) => void }): Promise<string> {
  const value = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-session-diagnostics-'));
  t.after(() => fs.rm(value, { recursive: true, force: true }));
  return value;
}

/** Čaká len na lokálny predikát; nemení časové limity Playwright asercií. */
async function until(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Lokálna podmienka nebola splnená.');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('metadata vzniknú bez čítania alebo existencie súboru cookies', async (t) => {
  const target = path.join(await directory(t), 'neexistujuci-storage.json');
  const lines: string[] = [];
  const recorder = await createSessionDiagnostics(target, (line) => lines.push(line));
  await recorder.flush();
  const snapshot = await readSessionDiagnostics(target);
  assert.equal(snapshot?.generation, 1);
  assert.equal(snapshot?.events[0].kind, 'initial-storage');
  assert.equal(snapshot?.events[0].attempt, 0);
  assert.equal(lines.length, 1);
  await assert.rejects(fs.stat(target), { code: 'ENOENT' });
  assert.match(formatSessionDiagnostics(snapshot, 100), /relation=temporal-only/);
});

test('generácia rastie až po úspešnom zápise; samotný refresh ju nemení', async (t) => {
  const target = path.join(await directory(t), 'user.json');
  const recorder = await createSessionDiagnostics(target, () => undefined);
  recorder.record({ kind: 'attempt-start' });
  recorder.record({ kind: 'refresh-start' });
  recorder.record({ kind: 'refresh-response', status: 200 });
  recorder.record({ kind: 'refresh-success' });
  recorder.record({ kind: 'storage-start' });
  recorder.record({ kind: 'storage-failure', errorKind: 'filesystem' });
  await recorder.flush();
  assert.equal((await readSessionDiagnostics(target))?.generation, 1);
  recorder.record({ kind: 'attempt-start' });
  recorder.record({ kind: 'storage-start' });
  recorder.record({ kind: 'storage-success' });
  await recorder.flush();
  const snapshot = await readSessionDiagnostics(target);
  assert.equal(snapshot?.generation, 2);
  assert.equal(snapshot?.events.at(-1)?.attempt, 2);
  assert.equal(snapshot?.events.at(-1)?.generation, 2);
  assert.equal(snapshot?.events.filter((event) => event.kind === 'refresh-start').length, 1);
});

test('surové texty a nepovolené polia sa nedostanú zo snapshotu do výpisu', () => {
  const injected = 'SUKROMNY_OBSAH';
  const value = {
    runStartedAt: 1, generation: 2, storedAt: 3, privateValue: injected,
    events: [
      { kind: 'refresh-response', at: 4, attempt: 1, generation: 2, status: 403, errorKind: injected, detail: injected },
      { kind: injected, at: 5, attempt: 1, generation: 2, status: 200 },
    ],
  };
  const snapshot = parseSessionDiagnostics(value);
  assert.equal(snapshot?.events.length, 1);
  assert.equal(snapshot?.events[0].errorKind, null);
  const text = formatSessionDiagnostics(snapshot, 6);
  assert.match(text, /status=403/);
  assert.ok(!text.includes(injected));
  assert.ok(!JSON.stringify(snapshot).includes(injected));
});

test('číta sa len konečná povolená história a neplatné čísla sa odmietnu', () => {
  const event = { kind: 'refresh-response', at: 4, attempt: 1, generation: 2, status: 200, errorKind: null };
  const valid = { runStartedAt: 1, generation: 2, storedAt: 3, events: Array.from({ length: 90 }, () => event) };
  assert.equal(parseSessionDiagnostics(valid)?.events.length, 40);
  assert.equal(parseSessionDiagnostics({ ...valid, generation: -1 }), null);
  assert.equal(parseSessionDiagnostics({ ...valid, storedAt: Number.NaN }), null);
  assert.equal(parseSessionDiagnostics(null), null);
  assert.equal(parseSessionDiagnostics('SUKROMNY_OBSAH'), null);
  assert.equal(parseSessionDiagnostics({ ...valid, events: null }), null);
  assert.deepEqual(parseSessionDiagnostics({ ...valid, events: [null, 'SUKROMNY_OBSAH'] })?.events, []);
  const invalidStatus = parseSessionDiagnostics({ ...valid, events: [{ ...event, status: 700 }] });
  assert.equal(invalidStatus?.events[0].status, null);
});

test('chýbajúci, poškodený a príliš veľký sidecar je unavailable, nie chyba testu', async (t) => {
  const target = path.join(await directory(t), 'user.json');
  assert.equal(await readSessionDiagnostics(target), null);
  assert.equal(formatSessionDiagnostics(null, 1), '[E2E-SESSION] snapshot=unavailable observedAt=1');
  await fs.writeFile(sessionDiagnosticsPath(target), '{');
  assert.equal(await readSessionDiagnostics(target), null);
  await fs.writeFile(sessionDiagnosticsPath(target), 'x'.repeat(32_769));
  assert.equal(await readSessionDiagnostics(target), null);
});

test('sériový zápis drží poradie a najviac 40 udalostí', async (t) => {
  const target = path.join(await directory(t), 'user.json');
  const recorder = await createSessionDiagnostics(target, () => undefined);
  for (let i = 0; i < 45; i += 1) {
    recorder.record({ kind: 'attempt-start' });
    recorder.record({ kind: 'storage-success' });
  }
  await recorder.flush();
  const snapshot = await readSessionDiagnostics(target);
  assert.equal(snapshot?.generation, 46);
  assert.equal(snapshot?.events.length, 40);
  assert.equal(snapshot?.events.at(-1)?.attempt, 45);
});

test('chyba diagnostického zápisu alebo emitovania nemení výsledok', async (t) => {
  const target = path.join(await directory(t), 'neexistujuci-priecinok', 'user.json');
  const lines: string[] = [];
  const recorder = await createSessionDiagnostics(target, (line) => lines.push(line));
  recorder.record({ kind: 'refresh-response', status: 200 });
  await recorder.flush();
  assert.ok(lines.some((line) => line === '[E2E-SESSION] kind=diagnostics-write-failure errorKind=filesystem'));
  assert.ok(lines.every((line) => !line.includes(target)));
  const quiet = await createSessionDiagnostics(target, () => { throw new Error('SUKROMNY_OBSAH'); });
  quiet.record({ kind: 'refresh-start' });
  await quiet.flush();
});

test('varovanie vracia len povolený HTTP kód alebo pevnú kategóriu', () => {
  assert.equal(safeSessionError(new Error('HTTP 401\nSUKROMNY_OBSAH'), 'refresh'), 'HTTP 401');
  assert.equal(safeSessionError(new Error('HTTP 401 SUKROMNY_OBSAH'), 'refresh'), 'other');
  assert.equal(safeSessionError(new Error('SUKROMNY_OBSAH'), 'refresh'), 'other');
  assert.equal(safeSessionError(new Error('SUKROMNY_OBSAH'), 'storage'), 'filesystem');
  assert.equal(sessionErrorKind(Object.assign(new Error('SUKROMNY_OBSAH'), { name: 'TimeoutError' }), 'refresh'), 'timeout');
  assert.equal(safeSessionError({ toString() { throw new Error('SUKROMNY_OBSAH'); } }, 'refresh'), 'other');
  assert.equal(formatSessionDiagnostics(null, Number.NaN), '[E2E-SESSION] snapshot=unavailable observedAt=0');
  assert.equal(formatSessionDiagnostic({ kind: 'SUKROMNY_OBSAH' } as never), '[E2E-SESSION] kind=other');
});

test('global setup nečíta text formulára ani ho nevkladá do prihlasovacej chyby', async () => {
  const source = await fs.readFile(path.join(__dirname, '..', 'global-setup.ts'), 'utf8');
  assert.doesNotMatch(source, /allInnerTexts|innerText\s*\(|textContent\s*\(/);
  assert.doesNotMatch(source, /alerts\.join|detail\s*\?/);
  assert.match(source, /Prihlásenie zlyhalo \(\$\{outcome\}\)/);
});

test('keeper zapisuje časovanie bez zmeny serializácie alebo úspešnej obnovy', async (t) => {
  const target = path.join(await directory(t), 'user.json');
  const diagnostics = await createSessionDiagnostics(target, () => undefined);
  let calls = 0;
  let active = 0;
  let maxActive = 0;
  const keeper = startSessionKeeper({
    storageStatePath: target, intervalMs: 10, diagnostics,
    refresh: async () => {
      calls += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 25));
      active -= 1;
      return { cookies: [], origins: [] };
    },
  });
  try { await until(() => calls >= 2); } finally { await keeper.stop(); }
  await diagnostics.flush();
  assert.equal(maxActive, 1);
  const snapshot = await readSessionDiagnostics(target);
  assert.equal(snapshot?.generation, calls + 1);
  const events = snapshot?.events.map((event) => event.kind) ?? [];
  assert.deepEqual(events.slice(1, 7), ['attempt-start', 'refresh-start', 'refresh-success', 'storage-start', 'storage-success', 'attempt-start']);
  assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), { cookies: [], origins: [] });
});

test('ani pozorovateľ, ktorý vyhadzuje výnimky, nezastaví keeper', async (t) => {
  const target = path.join(await directory(t), 'user.json');
  let calls = 0;
  const keeper = startSessionKeeper({
    storageStatePath: target, intervalMs: 10,
    diagnostics: { record() { throw new Error('SUKROMNY_OBSAH'); }, async flush() {} },
    refresh: async () => { calls += 1; return { cookies: [], origins: [] }; },
  });
  try { await until(() => calls >= 1); } finally { await keeper.stop(); }
  assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), { cookies: [], origins: [] });
});

test('odmietnutý refresh sa zaznamená bez zmeny starej generácie a bez textu chyby', async (t) => {
  const target = path.join(await directory(t), 'user.json');
  const initial = { cookies: [], origins: [] };
  await fs.writeFile(target, JSON.stringify(initial));
  const diagnostics = await createSessionDiagnostics(target, () => undefined);
  const warnings: string[] = [];
  const keeper = startSessionKeeper({
    storageStatePath: target, intervalMs: 20, diagnostics,
    refresh: async () => {
      diagnostics.record({ kind: 'refresh-response', status: 403 });
      throw new Error('HTTP 403\nSUKROMNY_OBSAH');
    },
    warn: (line) => { warnings.push(line); void keeper.stop(); },
  });
  try { await until(() => warnings.length === 1); } finally { await keeper.stop(); }
  await diagnostics.flush();
  const snapshot = await readSessionDiagnostics(target);
  assert.equal(snapshot?.generation, 1);
  assert.deepEqual(snapshot?.events.map((event) => event.kind), ['initial-storage', 'attempt-start', 'refresh-start', 'refresh-response', 'refresh-failure']);
  assert.equal(snapshot?.events.at(-2)?.status, 403);
  assert.equal(snapshot?.events.at(-1)?.errorKind, 'http');
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('HTTP 403'));
  assert.ok(!warnings[0].includes('SUKROMNY_OBSAH'));
  assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), initial);
});

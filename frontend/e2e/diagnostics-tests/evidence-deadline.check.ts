import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import test from 'node:test';
import { captureWithin } from '../support/evidence-deadline';

test('úspešná diagnostika zachová hodnotu a vyčistí časovač', async (context) => {
  const clear = context.mock.method(globalThis, 'clearTimeout');
  const value = { count: 3, ready: true };
  assert.equal(await captureWithin(async () => value, 1_000), value);
  assert.equal(clear.mock.callCount(), 1);
});

test('zamietnutá diagnostika vráti null a vyčistí časovač', async (context) => {
  const clear = context.mock.method(globalThis, 'clearTimeout');
  assert.equal(await captureWithin(async () => {
    throw new Error('Syntetická chyba, ktorej text sa nesmie vypísať.');
  }, 1_000), null);
  assert.equal(clear.mock.callCount(), 1);
});

test('synchronický throw operácie sa tiež zmení na null', async (context) => {
  const clear = context.mock.method(globalThis, 'clearTimeout');
  assert.equal(await captureWithin(() => {
    throw new Error('Syntetický synchronický throw.');
  }, 1_000), null);
  assert.equal(clear.mock.callCount(), 1);
});

test('neukončená diagnostika po deadline vráti null a vyčistí časovač', async (context) => {
  const clear = context.mock.method(globalThis, 'clearTimeout');
  assert.equal(await captureWithin(() => new Promise<never>(() => {}), 5), null);
  assert.equal(clear.mock.callCount(), 1);
});

test('neskoré zamietnutie po deadline nevytvorí unhandledRejection', async () => {
  let rejectOperation!: (reason: Error) => void;
  const operation = new Promise<never>((_resolve, reject) => { rejectOperation = reject; });
  assert.equal(await captureWithin(() => operation, 5), null);
  rejectOperation(new Error('Syntetické neskoré zamietnutie.'));
  // Node test runner označí nezachytené zamietnutie za chybu; žiadny handler ho tu nepotláča.
  await nextTurn();
});

test('neskorý úspech už nezmení výsledok deadline', async () => {
  let resolveOperation!: (value: number) => void;
  const operation = new Promise<number>((resolve) => { resolveOperation = resolve; });
  const result = await captureWithin(() => operation, 5);
  resolveOperation(42);
  await nextTurn();
  assert.equal(result, null);
});

test('neplatné rozpočty nespustia operáciu ani časovač', async (context) => {
  const timer = context.mock.method(globalThis, 'setTimeout');
  let calls = 0;
  for (const budget of [0, -1, NaN, Infinity, 2_147_483_648]) {
    assert.equal(await captureWithin(async () => { calls += 1; return true; }, budget), null);
  }
  assert.equal(calls, 0);
  assert.equal(timer.mock.callCount(), 0);
});

test('hodnoty false, nula a undefined nie sú chybou diagnostiky', async () => {
  assert.equal(await captureWithin(async () => false, 1_000), false);
  assert.equal(await captureWithin(async () => 0, 1_000), 0);
  assert.equal(await captureWithin(async () => undefined, 1_000), undefined);
});

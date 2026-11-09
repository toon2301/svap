import assert from 'node:assert/strict';
import test from 'node:test';
import type { Page } from '@playwright/test';
import { cleanupFeedPosts } from '../support/feed';

/** Nahradí iba hranicu API, bez siete a bez vytvárania obsahu. */
function fixture(status: number, data: unknown) {
  const calls: Array<{ method: string; url: string }> = [];
  const page = { url: () => 'https://diagnostic.invalid/dashboard',
    evaluate: async (_code: unknown, args: { method: string; url: string }) => {
      calls.push(args);
      return args.method === 'GET' ? { status, data } : { status: 204, data: null };
    } } as unknown as Page;
  return { page, calls };
}

test('GET 500 pri neznámom ID je chyba upratania, nie úspech ani retry', async () => {
  const f = fixture(500, null);
  assert.deepEqual(await cleanupFeedPosts(f.page, [], 'unique'), [{ id: null, status: 500 }]);
  assert.equal(f.calls.length, 1);
});

test('chyba zoznamu zostane viditeľná aj po odstránení známych ID v správnom poradí', async () => {
  const f = fixture(403, null);
  assert.deepEqual(await cleanupFeedPosts(f.page, [2, 1], 'unique'),
    [{ id: 2, status: 204 }, { id: 1, status: 204 }, { id: null, status: 403 }]);
  assert.deepEqual(f.calls.map(call => call.method), ['DELETE', 'DELETE', 'GET']);
  assert.ok(f.calls[0].url.endsWith('/2/') && f.calls[1].url.endsWith('/1/'));
});

test('prázdny zoznam je platný iba s HTTP 200 a platným formátom', async () => {
  for (const data of [[], { results: [] }]) {
    assert.deepEqual(await cleanupFeedPosts(fixture(200, data).page, [], 'unique'), []);
  }
  for (const data of [null, {}, { results: null }, { results: 'invalid' }]) {
    assert.deepEqual(await cleanupFeedPosts(fixture(200, data).page, [], 'unique'), [{ id: null, status: 0 }]);
  }
});

test('fallback maže iba presnú jedinečnú značku behu a už známe ID neopakuje', async () => {
  const f = fixture(200, { results: [
    { id: 1, caption: '[e2e] unique' }, { id: 2, caption: '[e2e] unique' },
    { id: 3, caption: '[e2e] other' }, { id: 4, caption: 'unique' },
  ] });
  assert.deepEqual(await cleanupFeedPosts(f.page, [1], 'unique'), [{ id: 1, status: 204 }, { id: 2, status: 204 }]);
  assert.equal(f.calls.filter(call => call.method === 'DELETE').length, 2);
});

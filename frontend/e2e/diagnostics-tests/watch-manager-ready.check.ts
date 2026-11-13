import assert from 'node:assert/strict';
import test from 'node:test';
import type { Page, Response } from '@playwright/test';
import { isWatchManagerResponse, waitForWatchManagerResponse } from '../support/offer-watch-manager-ready';

/** Žiadny backend, body ani cookies: len presný výber pôvodnej odpovede aplikácie. */
test('správa čaká na presný GET rovnakého pôvodu, nie matches, zápis alebo cudzí server', () => {
  const origin = 'https://diagnostic.invalid';
  const response = (url: string, method = 'GET') => ({ url: () => url, request: () => ({ method: () => method }) }) as unknown as Response;
  assert.equal(isWatchManagerResponse(response(origin + '/api/auth/offer-watches/'), origin + '/dashboard'), true);
  assert.equal(isWatchManagerResponse(response(origin + '/api/auth/offer-watches/?private=DO_NOT_PRINT'), origin), true);
  for (const [url, method] of [
    [origin + '/api/auth/offer-watches/', 'POST'], [origin + '/api/auth/offer-watches/1/matches/', 'GET'],
    ['https://other.invalid/api/auth/offer-watches/', 'GET'], ['not-a-url', 'GET'],
  ]) assert.equal(isWatchManagerResponse(response(url, method), origin), false);
  assert.equal(isWatchManagerResponse(response(origin + '/api/auth/offer-watches/'), 'about:blank'), false);
});

const ORIGIN = 'https://diagnostic.invalid';

/** Syntetická odpoveď dovoľuje čítať iba metódu, adresu a stav, nikdy telo. */
function candidate(status: number, path = '/api/auth/offer-watches/', method = 'GET', origin = ORIGIN): Response {
  return { status: () => status, url: () => origin + path, request: () => ({ method: () => method }),
    json: () => { throw new Error('Čakanie nesmie čítať telo odpovede.'); },
  } as unknown as Response;
}

/** Odoberie skutočný filter pomocníka, bez siete, vlastných retry alebo zmeny timeoutu. */
function selection(): (response: Response) => boolean {
  let predicate!: (response: Response) => boolean;
  const page = { url: () => ORIGIN + '/dashboard',
    waitForResponse: (next: typeof predicate, ...options: unknown[]) => {
      assert.equal(options.length, 0, 'Pôvodný timeout sa nesmie meniť.');
      predicate = next;
      return Promise.resolve(candidate(200));
    },
  } as unknown as Page;
  void waitForWatchManagerResponse(page);
  return response => predicate(response);
}

test('priama odpoveď a konečné HTTP chyby sa neignorujú v čakaní na správu', () => {
  for (const status of [200, 400, 403, 404, 429, 500, 503]) {
    assert.equal(selection()(candidate(status)), true);
  }
});

test('preskočí len prvú 401; výsledok jedného opakovania môže byť aj konečná chyba', () => {
  for (const status of [200, 401, 403, 500]) {
    const select = selection();
    assert.equal(select(candidate(401)), false);
    assert.equal(select(candidate(status)), true);
  }
});

test('nesúvisiace odpovede nespotrebujú jednu podporovanú obnovu relácie', () => {
  const select = selection();
  for (const other of [candidate(401, '/api/auth/me/'), candidate(401, '/api/token/refresh/', 'POST'),
    candidate(401, '/api/auth/offer-watches/1/matches/'), candidate(401, '/api/auth/offer-watches/', 'POST'),
    candidate(401, '/api/auth/offer-watches/', 'GET', 'https://other.invalid')]) {
    assert.equal(select(other), false);
  }
  assert.equal(select(candidate(401)), false);
  assert.equal(select(candidate(200)), true);
});

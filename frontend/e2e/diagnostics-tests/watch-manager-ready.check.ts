import assert from 'node:assert/strict';
import test from 'node:test';
import type { Response } from '@playwright/test';
import { isWatchManagerResponse } from '../support/offer-watch-manager-ready';

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

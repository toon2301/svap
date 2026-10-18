/** @jest-environment node */

import { forgetSearchScroll, prepareSearchScrollRefresh, readSearchScroll, refreshSearchScroll, rememberSearchScroll } from './searchScrollMemory';

it('is safe in the real server environment without replacing browser globals', () => {
  expect(rememberSearchScroll).not.toThrow();
  expect(readSearchScroll(105)).toBeNull();
  expect(() => forgetSearchScroll('missing')).not.toThrow();
  expect(() => refreshSearchScroll('missing', 50)).not.toThrow();
  expect(prepareSearchScrollRefresh('missing', 50)).toBeNull();
});

/** @jest-environment node */

import { forgetSearchScroll, readSearchScroll, rememberSearchScroll } from './searchScrollMemory';

it('is safe in the real server environment without replacing browser globals', () => {
  expect(rememberSearchScroll).not.toThrow();
  expect(readSearchScroll(105)).toBeNull();
  expect(() => forgetSearchScroll('missing')).not.toThrow();
});

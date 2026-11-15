/**
 * @jest-environment node
 */
import { isAppleMobile, isInstalledApp } from '../pushPlatform';

/**
 * Zisťovanie zariadenia pre výzvu na push (nález 321, etapa 3b) beží aj pri vykresľovaní na serveri, kde nie je `window`
 * ani `navigator`: nesmie vyhodiť chybu a vráti „nie“.
 */
describe('pushPlatform bez window (vykresľovanie na serveri)', () => {
  it('prostredie nemá window', () => {
    expect(typeof window).toBe('undefined');
  });

  it('isAppleMobile nevyhodí chybu a vráti false', () => {
    expect(isAppleMobile()).toBe(false);
  });

  it('isInstalledApp nevyhodí chybu a vráti false', () => {
    expect(isInstalledApp()).toBe(false);
  });
});

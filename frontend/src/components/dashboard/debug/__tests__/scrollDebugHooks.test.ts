/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 * Hooky scroll API a history: záznam zápisu a nezmenené pôvodné správanie.
 */

import { installScrollDebug, uninstallScrollDebug } from '../scrollDebugInstall';
import { parseCallSite, scrollDebugFreshEntry, scrollDebugTag } from '../scrollDebugHooks';
import { getScrollDebugLines, resetScrollDebugLogForTests } from '../scrollDebugLog';
import { resetScrollDebugStateForTests, scrollDebugState } from '../scrollDebugState';

const scrollTopDescriptor = () => Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
const newLines = (before: number) => getScrollDebugLines().slice(before);

let main: HTMLElement;
let card: HTMLElement;
let outside: HTMLElement;
let intoView: jest.Mock;
const realIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  sessionStorage.clear();
  resetScrollDebugLogForTests();
  resetScrollDebugStateForTests();
  // jsdom scrollIntoView nemá – podvrh s vlastným výsledkom, aby sa dalo
  // overiť, že hook ho vráti nezmenený.
  intoView = jest.fn(() => 'pôvodný výsledok');
  Element.prototype.scrollIntoView = intoView as unknown as typeof Element.prototype.scrollIntoView;
  document.body.innerHTML = '<main data-dashboard-main><div class="highlight-offer-card x y"></div></main><section></section>';
  main = document.querySelector('main')!;
  card = main.querySelector('div')!;
  outside = document.querySelector('section')!;
});

afterEach(() => {
  uninstallScrollDebug();
  Element.prototype.scrollIntoView = realIntoView;
  window.history.replaceState(null, '', '/');
});

describe('bez príznaku', () => {
  it('scrollDebugTag / scrollDebugFreshEntry nič nerobia a porovnanie sa nevolá', () => {
    const isSame = jest.fn(() => true);
    scrollDebugTag('fresh-entry reset');
    scrollDebugFreshEntry({ slug: 'a' }, { id: 1 }, isSame);
    main.scrollTop = 10;
    expect(isSame).not.toHaveBeenCalled();
    expect(getScrollDebugLines()).toEqual([]);
    expect(main.scrollTop).toBe(10);
  });
});

describe('s príznakom', () => {
  it('zápis do main.scrollTop: hodnota, pred, po a kto; hodnota sa naozaj zapíše', () => {
    main.scrollTop = 40;
    installScrollDebug();
    const before = getScrollDebugLines().length;
    main.scrollTop = 120;
    expect(main.scrollTop).toBe(120);
    const [line] = newLines(before);
    expect(line).toMatch(/^C0 \+\d+ SET main\.scrollTop=120 pred=40 po=120 sh=0 @scrollDebugHooks\.test\.ts:\d+:\d+$/);
    expect(scrollDebugState.mainWrites).toHaveLength(1);
    expect(scrollDebugState.mainWrites[0]).toMatchObject({ smooth: false, before: 40, after: 120, target: null });
  });

  it('značka sa pripojí k najbližšiemu zápisu a spotrebuje sa', () => {
    installScrollDebug();
    const before = getScrollDebugLines().length;
    scrollDebugTag('fresh-entry reset');
    main.scrollTop = 0;
    main.scrollTop = 5;
    const [first, second] = newLines(before);
    expect(first).toMatch(/SET main\.scrollTop=0 .*\[fresh-entry reset\]$/);
    expect(second).not.toContain('[fresh-entry reset]');
  });

  it('iné prvky sa nezaznamenávajú a zápis prejde', () => {
    installScrollDebug();
    const before = getScrollDebugLines().length;
    outside.scrollTop = 30;
    card.scrollTop = 7;
    expect(outside.scrollTop).toBe(30);
    expect(card.scrollTop).toBe(7);
    expect(newLines(before)).toEqual([]);
  });

  it('scrollIntoView vnútri main: rovnaké argumenty, rovnaký this a výsledok, záznam', () => {
    installScrollDebug();
    const before = getScrollDebugLines().length;
    const options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };
    const result = card.scrollIntoView(options);
    expect(result).toBe('pôvodný výsledok');
    expect(intoView).toHaveBeenCalledTimes(1);
    expect(intoView.mock.calls[0]).toEqual([options]);
    expect(intoView.mock.calls[0][0]).toBe(options);
    expect(intoView.mock.contexts[0]).toBe(card);
    expect(newLines(before)).toEqual([
      expect.stringMatching(
        /INTOVIEW div\.highlight-offer-card\.x \(smooth\/center\) smooth pred=0 sh=0 cieľ≈0 @scrollDebugHooks\.test\.ts:\d+:\d+$/,
      ),
    ]);
    expect(scrollDebugState.mainWrites[scrollDebugState.mainWrites.length - 1]).toMatchObject({ smooth: true, target: 0, after: null });
  });

  it('scrollIntoView bez argumentov volá pôvodnú funkciu tiež bez argumentov', () => {
    installScrollDebug();
    card.scrollIntoView();
    expect(intoView.mock.calls[0]).toEqual([]);
  });

  it('scrollIntoView mimo main: bez záznamu, pôvodné volanie', () => {
    installScrollDebug();
    const before = getScrollDebugLines().length;
    expect(outside.scrollIntoView(false)).toBe('pôvodný výsledok');
    expect(intoView.mock.calls[0]).toEqual([false]);
    expect(newLines(before)).toEqual([]);
  });

  it('výnimka z pôvodnej funkcie prejde ďalej', () => {
    intoView.mockImplementation(() => {
      throw new Error('boom');
    });
    installScrollDebug();
    expect(() => card.scrollIntoView({ block: 'center' })).toThrow('boom');
  });

  it('history: len pathname a kľúče offer/highlight/tab; replace bez zmeny sa len počíta', () => {
    installScrollDebug();
    const before = getScrollDebugLines().length;
    window.history.pushState({}, '', '/dashboard/users/abc?offer=11&q=tajne&tab=offers');
    window.history.replaceState({}, '', '/dashboard/users/abc?offer=11&q=tajne&tab=offers');
    window.history.replaceState({}, '', '/dashboard/users/abc?tab=offers');
    expect(window.location.pathname).toBe('/dashboard/users/abc');
    expect(newLines(before)).toEqual([
      expect.stringMatching(/URL push \/dashboard\/users\/abc\?offer=11&tab=offers$/),
      expect.stringMatching(/URL replace \/dashboard\/users\/abc\?tab=offers$/),
    ]);
    expect(getScrollDebugLines().join('\n')).not.toContain('tajne');
    expect(scrollDebugState.sameUrlReplaces).toBe(1);
  });

  it('FRESH: výsledok, kľúč a značky DOM', () => {
    installScrollDebug();
    const before = getScrollDebugLines().length;
    const isSame = jest.fn(() => true);
    scrollDebugFreshEntry({ slug: 'anton' }, { id: 12, slug: null }, isSame);
    scrollDebugFreshEntry(null, { id: 12 }, isSame);
    expect(isSame).toHaveBeenCalledTimes(1);
    expect(newLines(before)).toEqual([
      expect.stringMatching(/FRESH true cieľ=-\/anton profil=12\/- dom:brána=0 upraviť=0 zvýraznená=1 url=\/$/),
      expect.stringMatching(/FRESH false cieľ=žiadny profil=12\/- /),
    ]);
  });

  it('inštalácia je idempotentná a odinštalovanie vráti pôvodné funkcie', () => {
    const originalSetter = scrollTopDescriptor()?.set;
    const originalPush = window.history.pushState;
    installScrollDebug();
    const hookedSetter = scrollTopDescriptor()?.set;
    expect(hookedSetter).not.toBe(originalSetter);
    installScrollDebug();
    expect(scrollTopDescriptor()?.set).toBe(hookedSetter);

    const before = getScrollDebugLines().length;
    main.scrollTop = 3;
    expect(newLines(before)).toHaveLength(1);

    uninstallScrollDebug();
    expect(scrollTopDescriptor()?.set).toBe(originalSetter);
    expect(Element.prototype.scrollIntoView).toBe(intoView);
    expect(window.history.pushState).toBe(originalPush);
  });
});

describe('parseCallSite', () => {
  it('V8: rámec 0 je wrapper, rámec 1 volajúci; chunk bez hashu', () => {
    const stack = [
      'Error',
      '    at HTMLElement.set [as scrollTop] (https://svaply.test/_next/static/chunks/2117-0a1b2c3d4e5f6789.js:1:1000)',
      '    at https://svaply.test/_next/static/chunks/6036-9e1d2c0e0c2b3a4f.js:1:805924',
    ].join('\n');
    expect(parseCallSite(stack, 1)).toBe('6036:1:805924');
  });

  it('WebKit: rámce meno@url, natívne rámce sa preskočia', () => {
    const stack = [
      'set@https://svaply.test/_next/static/chunks/2117-0a1b2c3d4e5f6789.js:1:1000',
      'forEach@[native code]',
      '@https://svaply.test/_next/static/chunks/app/dashboard/page-11aa22bb33cc44dd.js:1:497448',
    ].join('\n');
    expect(parseCallSite(stack, 1)).toBe('page:1:497448');
  });

  it('dev zdroj ostane čitateľný, query sa zahodí', () => {
    expect(
      parseCallSite(
        'x@webpack-internal:///(app-pages-browser)/./src/a.ts:1:1\ny@http://localhost:3000/src/useProfileFreshEntry.ts?v=12:46:15',
        1,
      ),
    ).toBe('useProfileFreshEntry.ts:46:15');
  });

  it('chýbajúci stack alebo rámec', () => {
    expect(parseCallSite(undefined, 1)).toBe('?');
    expect(parseCallSite('Error\n    at only (a.js:1:1)', 1)).toBe('?');
  });
});

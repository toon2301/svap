/**
 * Pamäť scrollu profilu: pozícia, ktorú nesie udalosť kroku histórie.
 *
 * Po F5 na recenziách router po kroku späť prepíše `history.state` bez vlastných kľúčov skôr, než
 * profil stihne prečítať pozíciu. Pozícia sa preto zachytí z `event.state` pri `popstate`. Zvyšok
 * správania modulu je v `profileScrollMemory.test.ts`.
 */

import {
  PROFILE_SCROLL_CARRY_TTL_MS,
  PROFILE_SCROLL_RESTORE_TIMEOUT_MS,
  clearRememberedProfileScroll,
  readRememberedProfileScroll,
  startProfileScrollRestore,
} from './profileScrollMemory';

const KEY = '__svaplyProfileScroll';
const PROFILE = '/dashboard/users/peter?tab=offers';

type FakeMain = {
  main: HTMLElement;
  setHeight: (value: number) => void;
  /** Každý zápis do `scrollTop` v poradí. */
  writes: number[];
};

/** `<main>` s riadenou geometriou (jsdom žiadnu nepozná): zápisy sa zaznamenávajú. */
function mountMain({ scrollTop = 0, scrollHeight = 0, clientHeight = 700 } = {}): FakeMain {
  const main = document.createElement('main');
  main.setAttribute('data-dashboard-main', '');
  const writes: number[] = [];
  let top = scrollTop;
  let height = scrollHeight;
  Object.defineProperty(main, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value;
      writes.push(value);
    },
  });
  Object.defineProperty(main, 'scrollHeight', { configurable: true, get: () => height });
  Object.defineProperty(main, 'clientHeight', { configurable: true, get: () => clientHeight });
  document.body.appendChild(main);
  return { main, setHeight: (value) => (height = value), writes };
}

const frames = (ms: number) => jest.advanceTimersByTime(ms);

beforeEach(() => {
  jest.useFakeTimers();
  window.history.replaceState(null, '', PROFILE);
  document.body.innerHTML = '';
  clearRememberedProfileScroll();
});

afterEach(() => {
  // Obnova, ktorú test nechal bežať (stráži pozíciu), sa dokončí: jej poslucháče na `window` by inak
  // prežili do ďalšieho testu a zmazali by mu zapamätanú pozíciu.
  jest.advanceTimersByTime(PROFILE_SCROLL_RESTORE_TIMEOUT_MS + 1000);
  jest.useRealTimers();
  document.body.innerHTML = '';
});

/**
 * Po F5 na recenziách router po kroku späť prepíše `history.state` bez vlastných kľúčov skôr,
 * než profil stihne prečítať pozíciu. `event.state` sa nemení, preto sa pozícia zachytí z neho.
 */
describe('position carried by the popstate event', () => {
  /** Krok späť na profil: udalosť nesie pôvodný stav záznamu, router ho medzitým prepíše. */
  function popBackToProfile(top: number | null, { overwrite = true } = {}) {
    const state = top === null ? null : { __NA: true, [KEY]: { version: 1, top } };
    window.history.replaceState(overwrite ? { __NA: true } : state, '', PROFILE);
    // Udalosť nesie pôvodný stav záznamu, aj keď `history.state` je už prepísaný.
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }

  it('restores although the router overwrote the history state before the profile mounted', () => {
    popBackToProfile(2262);
    expect(readRememberedProfileScroll()).toBeNull();
    const fresh = mountMain({ scrollHeight: 664 });

    startProfileScrollRestore();
    fresh.setHeight(7000);
    frames(16);

    expect(fresh.writes).toEqual([2262]);
  });

  it('ignores it when the page is a different address than the one popped to', () => {
    popBackToProfile(2262);
    window.history.replaceState({ __NA: true }, '', '/dashboard/users/someone-else?tab=offers');
    const fresh = mountMain({ scrollHeight: 7000 });

    startProfileScrollRestore();
    frames(1000);

    expect(fresh.writes).toEqual([]);
  });

  it('accepts a different query on the same page (the tab parameter is added after the pop)', () => {
    popBackToProfile(2262);
    window.history.replaceState({ __NA: true }, '', '/dashboard/users/peter');
    const fresh = mountMain({ scrollHeight: 7000 });

    startProfileScrollRestore();

    expect(fresh.writes).toEqual([2262]);
  });

  it('a later step without a remembered position cancels the earlier one', () => {
    popBackToProfile(2262);
    popBackToProfile(null);
    const fresh = mountMain({ scrollHeight: 7000 });

    startProfileScrollRestore();
    frames(1000);

    expect(fresh.writes).toEqual([]);
  });

  it('is used up by a finished restore (once the guarding has run out)', () => {
    popBackToProfile(2262);
    const first = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    expect(first.writes).toEqual([2262]);
    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS);
    first.main.remove();

    const second = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    frames(1000);

    expect(second.writes).toEqual([]);
  });

  it('is handed to the page that replaces the restored one while it is still guarded', () => {
    popBackToProfile(2262);
    const first = mountMain({ scrollHeight: 7000 });
    const stop = startProfileScrollRestore();
    expect(first.writes).toEqual([2262]);
    stop();
    first.main.remove();

    // Router vymenil stránku a stav histórie je prepísaný bez našich kľúčov: ostáva pozícia v pamäti.
    window.history.replaceState({ __NA: true }, '', PROFILE);
    const second = mountMain({ scrollHeight: 664 });
    startProfileScrollRestore();
    second.setHeight(7000);
    frames(16);

    expect(second.writes).toEqual([2262]);
  });

  it('is forgotten after the time to live when nobody used it', () => {
    popBackToProfile(2262);

    frames(PROFILE_SCROLL_CARRY_TTL_MS + 100);

    const late = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    frames(1000);
    expect(late.writes).toEqual([]);
  });

  it('still counts as carried just before the time to live runs out', () => {
    popBackToProfile(2262);

    frames(PROFILE_SCROLL_CARRY_TTL_MS - 100);

    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    expect(fresh.writes).toEqual([2262]);
  });

  it('a write extends the time to live (the page is replaced later on a slow device)', () => {
    popBackToProfile(2262);
    frames(PROFILE_SCROLL_CARRY_TTL_MS - 1000);
    const first = mountMain({ scrollHeight: 7000 });
    const stop = startProfileScrollRestore();
    expect(first.writes).toEqual([2262]);
    stop();
    first.main.remove();

    frames(PROFILE_SCROLL_CARRY_TTL_MS - 100);

    const second = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    expect(second.writes).toEqual([2262]);
  });

  it('is forgotten when the restore gives up', () => {
    popBackToProfile(2262);
    mountMain({ scrollHeight: 664 });
    startProfileScrollRestore();
    window.dispatchEvent(new Event('touchstart'));

    const later = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    frames(1000);

    expect(later.writes).toEqual([]);
  });

  it('survives a stopped restore (development remount, page unmounted)', () => {
    popBackToProfile(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    startProfileScrollRestore()();

    startProfileScrollRestore();
    fresh.setHeight(7000);
    frames(16);

    expect(fresh.writes).toEqual([2262]);
  });

  it('prefers what the history state carries now', () => {
    popBackToProfile(900, { overwrite: false });
    window.history.replaceState({ __NA: true, [KEY]: { version: 1, top: 1500 } }, '', PROFILE);
    const fresh = mountMain({ scrollHeight: 7000 });

    startProfileScrollRestore();

    expect(fresh.writes).toEqual([1500]);
  });

  it.each([
    ['iná verzia', { version: 2, top: 500 }],
    ['pozícia ako text', { version: 1, top: '500' }],
    ['nulová pozícia', { version: 1, top: 0 }],
    ['nekonečná pozícia', { version: 1, top: Infinity }],
    ['text', 'yes'],
    ['null', null],
  ] as Array<[string, unknown]>)('ignores a damaged record in the event (%s)', (_title, value) => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: { [KEY]: value } }));
    const fresh = mountMain({ scrollHeight: 7000 });

    startProfileScrollRestore();
    frames(1000);

    expect(fresh.writes).toEqual([]);
  });

  it('clearing the remembered position forgets the carried one too', () => {
    popBackToProfile(2262);

    clearRememberedProfileScroll();

    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    frames(1000);
    expect(fresh.writes).toEqual([]);
  });
});

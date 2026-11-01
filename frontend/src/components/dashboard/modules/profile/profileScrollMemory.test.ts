/**
 * Pamäť scrollu profilu pre návrat z recenzií.
 *
 * Každá stránka appky má vlastný `Dashboard`, takže po kroku späť sa profil postaví nanovo a jeho
 * `<main>` je od vrchu. Pozícia sa preto uloží do `history.state` záznamu profilu, keď sa z neho
 * odchádza do recenzií, a po návrate sa obnoví, hneď ako je obsah dosť vysoký (zoznam ponúk
 * dorastá až po načítaní profilu a ponúk). Nič nerobí pri novom vstupe do profilu.
 */

import {
  PROFILE_SCROLL_RESTORE_TIMEOUT_MS,
  clearRememberedProfileScroll,
  readRememberedProfileScroll,
  rememberProfileScroll,
  startProfileScrollRestore,
} from './profileScrollMemory';

/** Kľúč v `history.state`: formát záznamu je súčasť správania (starý záznam sa musí dať prečítať). */
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

const stateOf = () => window.history.state as Record<string, unknown> | null;
const frames = (ms: number) => jest.advanceTimersByTime(ms);

/** Uloží pozíciu tak, ako to robí odchod do recenzií, a zahodí `<main>` zo strany odchodu. */
function rememberPosition(top: number) {
  const leaving = mountMain({ scrollTop: top, scrollHeight: 7000 });
  rememberProfileScroll();
  leaving.main.remove();
}

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

describe('rememberProfileScroll', () => {
  it('writes the scroll of the dashboard main into the current history record', () => {
    mountMain({ scrollTop: 2262, scrollHeight: 7000 });

    rememberProfileScroll();

    expect(readRememberedProfileScroll()).toBe(2262);
    expect(stateOf()).toMatchObject({ [KEY]: { version: 1, top: 2262 } });
  });

  it('rounds a fractional position', () => {
    mountMain({ scrollTop: 2262.4, scrollHeight: 7000 });

    rememberProfileScroll();

    expect(readRememberedProfileScroll()).toBe(2262);
  });

  it('keeps what the router and other parts of the app wrote into the same record', () => {
    window.history.replaceState({ __NA: true, tree: [1, 2], other: { a: 1 } }, '', PROFILE);
    mountMain({ scrollTop: 900, scrollHeight: 7000 });

    rememberProfileScroll();

    expect(stateOf()).toMatchObject({ __NA: true, tree: [1, 2], other: { a: 1 }, [KEY]: { top: 900 } });
  });

  it('does not change the address or add a history entry', () => {
    mountMain({ scrollTop: 900, scrollHeight: 7000 });
    const lengthBefore = window.history.length;

    rememberProfileScroll();

    expect(window.location.pathname + window.location.search).toBe(PROFILE);
    expect(window.history.length).toBe(lengthBefore);
  });

  it('writes nothing when the page is at the top', () => {
    mountMain({ scrollTop: 0, scrollHeight: 7000 });
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    try {
      rememberProfileScroll();

      expect(replaceSpy).not.toHaveBeenCalled();
      expect(readRememberedProfileScroll()).toBeNull();
    } finally {
      replaceSpy.mockRestore();
    }
  });

  it('removes an older position when the page is at the top now', () => {
    const first = mountMain({ scrollTop: 500, scrollHeight: 7000 });
    rememberProfileScroll();
    expect(readRememberedProfileScroll()).toBe(500);

    first.main.scrollTop = 0;
    rememberProfileScroll();

    expect(readRememberedProfileScroll()).toBeNull();
  });

  it('does nothing without a dashboard main', () => {
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    try {
      rememberProfileScroll();

      expect(replaceSpy).not.toHaveBeenCalled();
    } finally {
      replaceSpy.mockRestore();
    }
  });

  it('does not throw when the browser refuses to write the state', () => {
    mountMain({ scrollTop: 900, scrollHeight: 7000 });
    const replaceSpy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    try {
      expect(() => rememberProfileScroll()).not.toThrow();
    } finally {
      replaceSpy.mockRestore();
    }
  });
});

describe('readRememberedProfileScroll', () => {
  it('has nothing without a record', () => {
    expect(readRememberedProfileScroll()).toBeNull();
  });

  it.each([
    ['iná verzia', { version: 2, top: 500 }],
    ['pozícia ako text', { version: 1, top: '500' }],
    ['záporná pozícia', { version: 1, top: -1 }],
    ['nulová pozícia', { version: 1, top: 0 }],
    ['nekonečná pozícia', { version: 1, top: Infinity }],
    ['chýbajúca pozícia', { version: 1 }],
    ['text', 'yes'],
    ['číslo', 5],
    ['null', null],
  ] as Array<[string, unknown]>)('ignores a damaged record (%s)', (_title, value) => {
    window.history.replaceState({ [KEY]: value }, '', PROFILE);

    expect(readRememberedProfileScroll()).toBeNull();
  });

  it('reads a valid record', () => {
    window.history.replaceState({ [KEY]: { version: 1, top: 1234 } }, '', PROFILE);

    expect(readRememberedProfileScroll()).toBe(1234);
  });
});

describe('clearRememberedProfileScroll', () => {
  it('removes only its own key', () => {
    window.history.replaceState({ __NA: true, [KEY]: { version: 1, top: 700 } }, '', PROFILE);

    clearRememberedProfileScroll();

    expect(readRememberedProfileScroll()).toBeNull();
    expect(stateOf()).toEqual({ __NA: true });
  });

  it('does not change the address or add a history entry', () => {
    window.history.replaceState({ [KEY]: { version: 1, top: 700 } }, '', PROFILE);
    const lengthBefore = window.history.length;

    clearRememberedProfileScroll();

    expect(window.location.pathname + window.location.search).toBe(PROFILE);
    expect(window.history.length).toBe(lengthBefore);
  });

  it('does not throw when the browser refuses to write the state', () => {
    window.history.replaceState({ [KEY]: { version: 1, top: 700 } }, '', PROFILE);
    const replaceSpy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    try {
      expect(() => clearRememberedProfileScroll()).not.toThrow();
    } finally {
      replaceSpy.mockRestore();
    }
  });

  it('does not write the history when there is nothing to remove', () => {
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    try {
      clearRememberedProfileScroll();

      expect(replaceSpy).not.toHaveBeenCalled();
    } finally {
      replaceSpy.mockRestore();
    }
  });
});

describe('startProfileScrollRestore', () => {
  it('does nothing without a remembered position', () => {
    const fresh = mountMain({ scrollHeight: 7000 });

    const stop = startProfileScrollRestore();
    frames(1000);

    expect(fresh.writes).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
    stop();
  });

  it('restores at once when the content is already tall enough', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 7000 });

    startProfileScrollRestore();

    expect(fresh.writes).toEqual([2262]);
    // Záznam histórie sa maže hneď (F5 na profile nemá skočiť na starú pozíciu).
    expect(readRememberedProfileScroll()).toBeNull();

    // Pozícia sa ešte stráži; po časovom limite nesmie ostať bežať ani snímka, ani časovač.
    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS);
    expect(fresh.writes).toEqual([2262]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('waits for the content to grow and then writes the position exactly once', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 664 });

    startProfileScrollRestore();
    frames(100);
    expect(fresh.writes).toEqual([]);

    fresh.setHeight(2242);
    frames(100);
    expect(fresh.writes).toEqual([]);

    fresh.setHeight(6998);
    frames(16);
    expect(fresh.writes).toEqual([2262]);

    // Pokojný `<main>` sa ďalej neprepisuje.
    frames(1000);
    expect(fresh.writes).toEqual([2262]);
    expect(readRememberedProfileScroll()).toBeNull();
    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('needs the content to reach the position: scrollHeight - clientHeight >= position', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 2262 + 700 - 1, clientHeight: 700 });

    startProfileScrollRestore();
    frames(100);
    expect(fresh.writes).toEqual([]);

    fresh.setHeight(2262 + 700);
    frames(16);
    expect(fresh.writes).toEqual([2262]);
  });

  it.each(['touchstart', 'wheel', 'keydown', 'mousedown', 'pointerdown'])(
    'is cancelled by the user input (%s) and forgets the position',
    (eventName) => {
      rememberPosition(2262);
      const fresh = mountMain({ scrollHeight: 664 });
      startProfileScrollRestore();
      frames(50);

      window.dispatchEvent(new Event(eventName));
      expect(jest.getTimerCount()).toBe(0);
      fresh.setHeight(7000);
      frames(1000);

      expect(fresh.writes).toEqual([]);
      expect(readRememberedProfileScroll()).toBeNull();
    },
  );

  it('gives up after the timeout, forgets the position and stops polling', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    startProfileScrollRestore();

    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS + 100);
    expect(jest.getTimerCount()).toBe(0);
    fresh.setHeight(7000);
    frames(1000);

    expect(fresh.writes).toEqual([]);
    expect(readRememberedProfileScroll()).toBeNull();
  });

  it('still restores just before the timeout', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    startProfileScrollRestore();

    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS - 100);
    fresh.setHeight(7000);
    frames(16);

    expect(fresh.writes).toEqual([2262]);
  });

  it('the returned function stops the waiting and keeps the position for a later visit', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    const stop = startProfileScrollRestore();

    stop();
    expect(jest.getTimerCount()).toBe(0);
    fresh.setHeight(7000);
    frames(1000);

    expect(fresh.writes).toEqual([]);
    expect(readRememberedProfileScroll()).toBe(2262);
  });

  it('after it was stopped, the visitor touching the page does not erase the position', () => {
    rememberPosition(2262);
    mountMain({ scrollHeight: 664 });
    const stop = startProfileScrollRestore();

    stop();
    window.dispatchEvent(new Event('touchstart'));

    // Pozícia patrí ďalšej návšteve profilu – zastavená obnova už nepočúva.
    expect(readRememberedProfileScroll()).toBe(2262);
  });

  it('waits while the page has no scrollable area yet', () => {
    rememberPosition(2262);
    startProfileScrollRestore();
    frames(300);

    const fresh = mountMain({ scrollHeight: 7000 });
    frames(16);

    expect(fresh.writes).toEqual([2262]);
  });

  it('follows a replaced main element (the page swaps the element while loading)', () => {
    rememberPosition(2262);
    const first = mountMain({ scrollHeight: 664 });
    startProfileScrollRestore();
    frames(50);

    first.main.remove();
    const second = mountMain({ scrollHeight: 7000 });
    frames(16);

    expect(first.writes).toEqual([]);
    expect(second.writes).toEqual([2262]);
  });

  it('stops listening for the user input after it is done', () => {
    rememberPosition(2262);
    mountMain({ scrollHeight: 7000 });
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    try {
      startProfileScrollRestore();
      frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS);

      const removed = removeSpy.mock.calls.map(([name]) => name);
      expect(removed).toEqual(
        expect.arrayContaining(['touchstart', 'wheel', 'keydown', 'mousedown', 'pointerdown']),
      );
    } finally {
      removeSpy.mockRestore();
    }
  });

  it('survives a development remount: stopped and started again, it restores once', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 664 });

    const firstRun = startProfileScrollRestore();
    firstRun();
    startProfileScrollRestore();
    fresh.setHeight(7000);
    frames(16);

    expect(fresh.writes).toEqual([2262]);
  });
});

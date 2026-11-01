/**
 * Pamäť scrollu profilu: stráženie pozície po zápise.
 *
 * Po F5 na recenziách a kroku späť Next 16 vymení stránku profilu ešte dvakrát (po zápise, o to
 * neskôr, čím pomalší je procesor): nový `<main>` je od vrchu a pozícia zapísaná do starého by sa
 * stratila. Obnova preto po zápise nekončí – nový `<main>` (alebo scroll vrátený nahor) dostane
 * pozíciu znova, a to až do vypršania času alebo do vstupu používateľa. Zvyšok správania modulu je
 * v `profileScrollMemory.test.ts` a `profileScrollMemory.popstate.test.ts`.
 */

import {
  PROFILE_SCROLL_RESTORE_TIMEOUT_MS,
  clearRememberedProfileScroll,
  rememberProfileScroll,
  startProfileScrollRestore,
} from './profileScrollMemory';

const PROFILE = '/dashboard/users/peter?tab=offers';

type FakeMain = {
  main: HTMLElement;
  setHeight: (value: number) => void;
  /** Každý zápis do `scrollTop` v poradí (aj zápisy samotného testu). */
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

/** Uloží pozíciu tak, ako to robí odchod do recenzií, a zahodí `<main>` zo strany odchodu. */
function rememberPosition(top: number) {
  const leaving = mountMain({ scrollTop: top, scrollHeight: 7000 });
  rememberProfileScroll();
  leaving.main.remove();
}

/** Router vymení stránku: starý `<main>` zanikne a nový je od vrchu. */
function replacePage(old: FakeMain, scrollHeight: number): FakeMain {
  old.main.remove();
  return mountMain({ scrollHeight });
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

describe('startProfileScrollRestore – stráženie pozície po zápise', () => {
  it('gives the position to a main element that replaces the restored one', () => {
    rememberPosition(2262);
    const first = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    expect(first.writes).toEqual([2262]);

    // Nový `<main>` je od vrchu a ešte bez obsahu: čaká sa na dorastenie.
    const second = replacePage(first, 0);
    frames(100);
    expect(second.writes).toEqual([]);

    second.setHeight(7000);
    frames(16);

    expect(second.writes).toEqual([2262]);
  });

  it('gives the position to every replacement in a row (the router swaps the page twice)', () => {
    rememberPosition(2262);
    const first = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    const second = replacePage(first, 0);
    frames(25);
    const third = replacePage(second, 0);
    frames(100);
    third.setHeight(7000);
    frames(16);

    expect(second.writes).toEqual([]);
    expect(third.writes).toEqual([2262]);
  });

  it('still gives it when the page is replaced seconds after the write (a slow device)', () => {
    rememberPosition(2262);
    const first = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    frames(5000);
    const second = replacePage(first, 7000);
    frames(16);

    expect(second.writes).toEqual([2262]);
  });

  it('writes the position again when the scroll returned to the top on the same element', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    fresh.main.scrollTop = 0;
    frames(16);

    expect(fresh.writes).toEqual([2262, 0, 2262]);
  });

  it('writes the position again when the content shrank below it and grew back', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    // Zoznam sa na chvíľu nahradí skeletonom: prehliadač scroll orezá na nový rozsah.
    fresh.setHeight(900);
    fresh.main.scrollTop = 200;
    frames(300);
    expect(fresh.writes).toEqual([2262, 200]);

    fresh.setHeight(7000);
    frames(16);

    expect(fresh.writes).toEqual([2262, 200, 2262]);
  });

  it('gives even a position within the tolerance of the top to a replaced main element', () => {
    rememberPosition(1);
    const first = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    expect(first.writes).toEqual([1]);

    // Tolerancia sa týka stráženia toho istého `<main>`, nie nového: ten pozíciu dostať musí.
    const second = replacePage(first, 7000);
    frames(16);

    expect(second.writes).toEqual([1]);
  });

  it('does not touch a main element that keeps the position', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS - 100);

    expect(fresh.writes).toEqual([2262]);
  });

  it('does not pull back a scroll that is further down than the position', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    // Napr. posun kotvy scrollu: obsah nad oknom narástol a prehliadač držal obsah na mieste.
    fresh.main.scrollTop = 2400;
    frames(500);

    expect(fresh.writes).toEqual([2262, 2400]);
  });

  it('accepts a difference of a physical pixel instead of writing on every frame', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    fresh.main.scrollTop = 2261.5;
    frames(500);

    expect(fresh.writes).toEqual([2262, 2261.5]);
  });

  it('guards the position until the time limit and then lets go of everything', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS - 100);
    fresh.main.scrollTop = 0;
    frames(16);
    expect(fresh.writes).toEqual([2262, 0, 2262]);

    frames(200);
    expect(jest.getTimerCount()).toBe(0);
    fresh.main.scrollTop = 0;
    frames(1000);
    const late = replacePage(fresh, 7000);
    frames(1000);

    expect(fresh.writes).toEqual([2262, 0, 2262, 0]);
    expect(late.writes).toEqual([]);
  });

  it.each(['touchstart', 'wheel', 'keydown', 'mousedown', 'pointerdown'])(
    'is ended by the user input (%s) while the position is guarded, and forgets it',
    (eventName) => {
      rememberPosition(2262);
      const first = mountMain({ scrollHeight: 7000 });
      startProfileScrollRestore();
      expect(first.writes).toEqual([2262]);

      window.dispatchEvent(new Event(eventName));
      expect(jest.getTimerCount()).toBe(0);
      const second = replacePage(first, 7000);
      frames(1000);
      startProfileScrollRestore();

      expect(second.writes).toEqual([]);
    },
  );

  it('the returned function stops the guarding and keeps the position for the page that replaces this one', () => {
    rememberPosition(2262);
    const first = mountMain({ scrollHeight: 7000 });
    const stop = startProfileScrollRestore();

    stop();
    expect(jest.getTimerCount()).toBe(0);
    // Nová stránka (nový hook) prevezme pozíciu a zapíše ju do svojho `<main>`.
    const second = replacePage(first, 7000);
    startProfileScrollRestore();

    expect(second.writes).toEqual([2262]);
  });

  it('after it was stopped, the visitor touching the page does not erase the guarded position', () => {
    rememberPosition(2262);
    const first = mountMain({ scrollHeight: 7000 });
    const stop = startProfileScrollRestore();

    stop();
    window.dispatchEvent(new Event('touchstart'));
    const second = replacePage(first, 7000);
    startProfileScrollRestore();

    expect(second.writes).toEqual([2262]);
  });

  it('a restore started by the replacing page guards for its own full time limit', () => {
    rememberPosition(2262);
    const first = mountMain({ scrollHeight: 7000 });
    const stopFirst = startProfileScrollRestore();
    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS - 1000);

    stopFirst();
    const second = replacePage(first, 7000);
    startProfileScrollRestore();
    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS - 1000);
    second.main.scrollTop = 0;
    frames(16);

    expect(second.writes).toEqual([2262, 0, 2262]);
  });

  it('does not stop for a content that is too short and gives up at the time limit', () => {
    rememberPosition(2262);
    const fresh = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();

    // Obsah sa zmenšil a už nenarastie (napr. ponuka medzitým zmazaná).
    fresh.setHeight(900);
    fresh.main.scrollTop = 200;
    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS + 100);
    expect(jest.getTimerCount()).toBe(0);
    fresh.setHeight(7000);
    frames(1000);

    expect(fresh.writes).toEqual([2262, 200]);
  });

  it('a page that keeps being replaced gets the position until the time limit and no longer', () => {
    rememberPosition(2262);
    let current = mountMain({ scrollHeight: 7000 });
    startProfileScrollRestore();
    for (let second = 1; second <= 5; second += 1) {
      frames(1000);
      current = replacePage(current, 7000);
      frames(16);
      expect(current.writes).toEqual([2262]);
    }

    frames(PROFILE_SCROLL_RESTORE_TIMEOUT_MS - 5000);
    const late = replacePage(current, 7000);
    frames(1000);

    expect(late.writes).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });
});

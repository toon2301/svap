/**
 * Návrat z recenzií na profil: obnova scrollu pri NEnovom vstupe.
 *
 * Profil po kroku späť stojí nanovo a od vrchu. Ak si odchod do recenzií zapamätal
 * pozíciu (viď `profileScrollMemory`), hook ju po dorastení obsahu vráti. Pri novom
 * vstupe do profilu (preklik, notifikácia) sa profil naopak otvára od vrchu – pozícia
 * z minulosti sa nesmie uplatniť.
 */

import { StrictMode, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('./preloadAvatar', () => ({
  preloadProfileAvatar: jest.fn(),
}));

import { markProfileFreshEntry, resetProfileFreshEntry } from './profileFreshEntry';
import {
  clearRememberedProfileScroll,
  readRememberedProfileScroll,
  rememberProfileScroll,
} from './profileScrollMemory';
import { useProfileFreshEntry } from './useProfileFreshEntry';

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

/** Odchod do recenzií: pozícia sa uloží a `<main>` starej stránky zanikne. */
function leaveToReviewsAt(top: number) {
  const leaving = mountMain({ scrollTop: top, scrollHeight: 7000 });
  rememberProfileScroll();
  leaving.main.remove();
}

const strictMode = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
const frames = (ms: number) => act(() => void jest.advanceTimersByTime(ms));

beforeEach(() => {
  jest.useFakeTimers();
  resetProfileFreshEntry();
  clearRememberedProfileScroll();
  document.body.innerHTML = '';
  window.history.replaceState(null, '', PROFILE);
});

afterEach(() => {
  jest.useRealTimers();
  resetProfileFreshEntry();
  document.body.innerHTML = '';
});

describe('useProfileFreshEntry – obnova pozície po návrate z recenzií', () => {
  it('restores the remembered position when the page is already tall', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollHeight: 7000 });

    const { result } = renderHook(() => useProfileFreshEntry(21, 'peter'));

    expect(fresh.writes).toEqual([2262]);
    expect(result.current).toBe(false);
    expect(readRememberedProfileScroll()).toBeNull();
  });

  it('waits for the offers to load and then restores the position exactly once', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    renderHook(() => useProfileFreshEntry(21, 'peter'));
    frames(300);
    expect(fresh.writes).toEqual([]);

    // Hlavička profilu je vysoká, ale zoznam ponúk ešte nie.
    fresh.setHeight(2242);
    frames(300);
    expect(fresh.writes).toEqual([]);

    fresh.setHeight(6998);
    frames(16);

    expect(fresh.writes).toEqual([2262]);
    frames(2000);
    expect(fresh.writes).toEqual([2262]);
  });

  it('does nothing without a remembered position (F5, history navigation, first visit)', () => {
    const fresh = mountMain({ scrollHeight: 7000 });

    renderHook(() => useProfileFreshEntry(21, 'peter'));
    frames(2000);

    expect(fresh.writes).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('a fresh entry opens at the top and neither restores nor keeps the old position', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollTop: 900, scrollHeight: 7000 });
    markProfileFreshEntry({ id: 21 });

    const { result } = renderHook(() => useProfileFreshEntry(21, 'peter'));
    frames(2000);

    expect(result.current).toBe(true);
    expect(fresh.writes).toEqual([0]);
    expect(readRememberedProfileScroll()).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('a fresh entry never restores, even when the browser refuses to rewrite the history state', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollTop: 900, scrollHeight: 7000 });
    markProfileFreshEntry({ id: 21 });
    // Napr. obmedzenie Safari na počet `replaceState` za čas: pozícia v zázname by ostala.
    const replaceSpy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    try {
      renderHook(() => useProfileFreshEntry(21, 'peter'));
      frames(2000);

      expect(fresh.writes).toEqual([0]);
    } finally {
      replaceSpy.mockRestore();
    }
  });

  it('restores exactly once in development double-mounting (StrictMode)', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    renderHook(() => useProfileFreshEntry(21, 'peter'), { wrapper: strictMode });
    frames(300);
    expect(fresh.writes).toEqual([]);

    fresh.setHeight(6998);
    frames(16);

    expect(fresh.writes).toEqual([2262]);
    expect(readRememberedProfileScroll()).toBeNull();
  });

  it('a fresh entry is not restored in development double-mounting either', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollTop: 900, scrollHeight: 7000 });
    markProfileFreshEntry({ id: 21 });

    renderHook(() => useProfileFreshEntry(21, 'peter'), { wrapper: strictMode });
    frames(2000);

    expect(fresh.writes).toEqual([0]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('restores from the popstate event when the router has overwritten the history state (after F5)', () => {
    const state = { __NA: true, __svaplyProfileScroll: { version: 1, top: 2262 } };
    window.history.replaceState(state, '', PROFILE);
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
    window.history.replaceState({ __NA: true }, '', PROFILE);
    const fresh = mountMain({ scrollHeight: 664 });
    renderHook(() => useProfileFreshEntry(21, 'peter'));
    frames(300);

    fresh.setHeight(6998);
    frames(16);

    expect(fresh.writes).toEqual([2262]);
  });

  it('a fresh entry forgets a position carried by the popstate event as well', () => {
    const state = { __NA: true, __svaplyProfileScroll: { version: 1, top: 2262 } };
    window.history.replaceState(state, '', PROFILE);
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
    window.history.replaceState({ __NA: true }, '', PROFILE);
    const fresh = mountMain({ scrollTop: 900, scrollHeight: 7000 });
    markProfileFreshEntry({ id: 21 });
    renderHook(() => useProfileFreshEntry(21, 'peter')).unmount();
    fresh.main.remove();

    const later = mountMain({ scrollHeight: 7000 });
    renderHook(() => useProfileFreshEntry(21, 'peter'));
    frames(2000);

    expect(later.writes).toEqual([]);
  });

  it('stops waiting when the profile unmounts and keeps the position for a later visit', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    const { unmount } = renderHook(() => useProfileFreshEntry(21, 'peter'));

    unmount();
    fresh.setHeight(7000);
    frames(2000);

    expect(fresh.writes).toEqual([]);
    expect(readRememberedProfileScroll()).toBe(2262);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('leaves the scroll to the visitor once they touch the page', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    renderHook(() => useProfileFreshEntry(21, 'peter'));
    frames(100);

    window.dispatchEvent(new Event('touchstart'));
    fresh.setHeight(7000);
    frames(2000);

    expect(fresh.writes).toEqual([]);
    expect(readRememberedProfileScroll()).toBeNull();
  });

  it('does not start another restore when the visitor moves to another profile', () => {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollHeight: 7000 });
    const { rerender } = renderHook(({ id }: { id: number }) => useProfileFreshEntry(id), {
      initialProps: { id: 21 },
    });
    expect(fresh.writes).toEqual([2262]);

    // Modul ostane zobrazený a zmení sa len profil (napr. krok späť/dopredu): obnova je
    // viazaná na zobrazenie modulu, nie na profil, takže sa nespúšťa znova.
    fresh.main.remove();
    leaveToReviewsAt(1800);
    const next = mountMain({ scrollHeight: 7000 });
    rerender({ id: 42 });
    frames(2000);

    expect(next.writes).toEqual([]);
    expect(readRememberedProfileScroll()).toBe(1800);
  });
});

/**
 * Rozbehnutá obnova patrí profilu, pre ktorý sa začala. Modul ostáva zobrazený aj pri preklikoch
 * (`goToUserProfile` s ID z cache, krok histórie medzi dvoma profilmi), zmení sa len profil – pozícia
 * starého profilu sa nesmie zapísať do nového.
 */
describe('useProfileFreshEntry – obnova a zmena profilu', () => {
  function waitForTheListAt(id: number) {
    leaveToReviewsAt(2262);
    const fresh = mountMain({ scrollHeight: 664 });
    const hook = renderHook(({ profile }: { profile: number }) => useProfileFreshEntry(profile), {
      initialProps: { profile: id },
    });
    frames(100);
    return { fresh, ...hook };
  }

  it('is stopped when the module stays mounted and another profile is shown', () => {
    const { fresh, rerender } = waitForTheListAt(21);

    rerender({ profile: 42 });
    fresh.setHeight(7000);
    frames(2000);

    expect(fresh.writes).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps the position for a later visit when the profile changes without a new entry', () => {
    const { fresh, rerender } = waitForTheListAt(21);

    rerender({ profile: 42 });
    fresh.setHeight(7000);
    frames(2000);

    expect(readRememberedProfileScroll()).toBe(2262);
  });

  it('is stopped and forgotten when the other profile is a new entry (it opens at the top)', () => {
    const { fresh, rerender } = waitForTheListAt(21);

    act(() => markProfileFreshEntry({ id: 42 }));
    rerender({ profile: 42 });
    fresh.setHeight(7000);
    frames(2000);

    expect(fresh.writes).toEqual([0]);
    expect(readRememberedProfileScroll()).toBeNull();
  });

  it('is stopped as soon as a new entry is announced, before the address and the profile change', () => {
    const { fresh } = waitForTheListAt(21);

    // `goToUserProfile` oznámi nový vstup ako PRVÉ, až potom mení profil a adresu.
    act(() => markProfileFreshEntry({ id: 42 }));
    fresh.setHeight(7000);
    frames(2000);

    expect(fresh.writes).toEqual([]);
    expect(readRememberedProfileScroll()).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('is stopped by an entry to the profile that is already shown too (the position is moot)', () => {
    const { fresh } = waitForTheListAt(21);

    act(() => markProfileFreshEntry({ id: 21 }));
    fresh.setHeight(7000);
    frames(2000);

    expect(fresh.writes).toEqual([]);
    expect(readRememberedProfileScroll()).toBeNull();
  });

  it('still restores when the same profile only re-renders', () => {
    const { fresh, rerender } = waitForTheListAt(21);

    rerender({ profile: 21 });
    fresh.setHeight(7000);
    frames(16);

    expect(fresh.writes).toEqual([2262]);
  });
});

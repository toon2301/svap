/**
 * Okno detailu príspevku nad appkou: otvorený cieľ a adresa v histórii.
 *
 * Hook drží cieľ (`feedOverlayTarget`), dáva `handleFeedOverlayTargetChange` pre
 * `FeedPostOverlayProvider` a zatvorenie okna a počas otvoreného okna počúva na `popstate`
 * (tlačidlo späť v prehliadači okno zavrie). Zápis do histórie rieši modul
 * `feedOverlayHistory` – tu je nahradený záznamníkom, aby bolo vidieť, čo hook volá a v akom
 * poradí. Skutočná história je pokrytá v `DashboardContent.feedOverlay.test.tsx`.
 */

import { act, renderHook } from '@testing-library/react';
import type {
  FeedPostOverlayCloseOptions,
  FeedPostOverlayTarget,
} from '../../contexts/FeedPostOverlayContext';
import { useFeedOverlayTarget } from '../useFeedOverlayTarget';

const mockPushFeedOverlayHistory = jest.fn();
const mockPopFeedOverlayHistory = jest.fn();
const mockForgetFeedOverlayHistory = jest.fn();
jest.mock('../../modules/feed/feedOverlayHistory', () => ({
  pushFeedOverlayHistory: (...args: unknown[]) => mockPushFeedOverlayHistory(...args),
  popFeedOverlayHistory: (...args: unknown[]) => mockPopFeedOverlayHistory(...args),
  forgetFeedOverlayHistory: (...args: unknown[]) => mockForgetFeedOverlayHistory(...args),
}));

/** Všetko, čo hook zavolá alebo zaregistruje na `window`, sa ukladá sem v poradí volaní. */
let calls: string[] = [];

const show = (value: unknown): string =>
  typeof value === 'function' ? 'ƒ' : (JSON.stringify(value) ?? 'undefined');
const entry = (name: string, ...args: unknown[]) => `${name}(${args.map(show).join(', ')})`;
const record = (name: string, ...args: unknown[]) => {
  calls.push(entry(name, ...args));
};

const PUSH = (path: string) => entry('pushFeedOverlayHistory', path);
const POP = entry('popFeedOverlayHistory');
const FORGET = entry('forgetFeedOverlayHistory');
const LISTEN = entry('addEventListener', 'popstate');
const UNLISTEN = entry('removeEventListener', 'popstate');

const mountHook = () => renderHook(() => useFeedOverlayTarget());

type Mounted = ReturnType<typeof mountHook>;

const open = (mounted: Mounted, target: FeedPostOverlayTarget) =>
  act(() => {
    mounted.result.current.handleFeedOverlayTargetChange(target);
  });

const close = (mounted: Mounted, options?: FeedPostOverlayCloseOptions) =>
  act(() => {
    mounted.result.current.handleFeedOverlayTargetChange(null, options);
  });

const pressBrowserBack = () =>
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

const currentTarget = (mounted: Mounted) => mounted.result.current.feedOverlayTarget;

beforeEach(() => {
  calls = [];
  mockPushFeedOverlayHistory
    .mockReset()
    .mockImplementation((...args: unknown[]) => record('pushFeedOverlayHistory', ...args));
  mockPopFeedOverlayHistory
    .mockReset()
    .mockImplementation((...args: unknown[]) => record('popFeedOverlayHistory', ...args));
  mockForgetFeedOverlayHistory
    .mockReset()
    .mockImplementation((...args: unknown[]) => record('forgetFeedOverlayHistory', ...args));

  const realAdd = window.addEventListener.bind(window);
  const realRemove = window.removeEventListener.bind(window);
  jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type === 'popstate') record('addEventListener', type);
    realAdd(type, listener, options);
  });
  jest.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
    if (type === 'popstate') record('removeEventListener', type);
    realRemove(type, listener, options);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('východiskový stav', () => {
  it('vráti cieľ, jeho nastavovač a handler; okno je zavreté', () => {
    const mounted = mountHook();
    expect(Object.keys(mounted.result.current).sort()).toEqual([
      'feedOverlayTarget',
      'handleFeedOverlayTargetChange',
      'setFeedOverlayTarget',
    ]);
    expect(currentTarget(mounted)).toBeNull();
    expect(typeof mounted.result.current.handleFeedOverlayTargetChange).toBe('function');
    expect(typeof mounted.result.current.setFeedOverlayTarget).toBe('function');
  });

  it('pri vytvorení nič nezavolá a nepočúva na popstate', () => {
    mountHook();
    expect(calls).toEqual([]);
  });

  it('kým je okno zavreté, popstate sa ignoruje', () => {
    const mounted = mountHook();
    pressBrowserBack();
    expect(calls).toEqual([]);
    expect(currentTarget(mounted)).toBeNull();
  });
});

describe('otvorenie okna (handleFeedOverlayTargetChange s cieľom)', () => {
  const OPEN_CASES: Array<[string, FeedPostOverlayTarget, string]> = [
    ['príspevok bez komentára', { postId: 7 }, '/dashboard/feed/7'],
    ['komentár null', { postId: 7, highlightCommentId: null }, '/dashboard/feed/7'],
    ['komentár z notifikácie', { postId: 7, highlightCommentId: 12 }, '/dashboard/feed/7?comment=12'],
    ['komentár 0 sa berie ako žiadny', { postId: 7, highlightCommentId: 0 }, '/dashboard/feed/7'],
    ['iné id príspevku', { postId: 4096, highlightCommentId: 1 }, '/dashboard/feed/4096?comment=1'],
  ];

  it.each(OPEN_CASES)('%s: nastaví cieľ a zapíše adresu do histórie', (_label, target, path) => {
    const mounted = mountHook();
    open(mounted, target);
    expect(currentTarget(mounted)).toBe(target);
    expect(calls).toEqual([PUSH(path), LISTEN]);
  });

  it('otvorenie nezavolá ani zatvorenie histórie, ani zabudnutie záznamu', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    expect(mockPopFeedOverlayHistory).not.toHaveBeenCalled();
    expect(mockForgetFeedOverlayHistory).not.toHaveBeenCalled();
    expect(mockPushFeedOverlayHistory).toHaveBeenCalledTimes(1);
  });

  it('zmena príspevku v otvorenom okne zapíše novú adresu a prepne popstate listener', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    const second = { postId: 8, highlightCommentId: 3 };
    open(mounted, second);
    expect(currentTarget(mounted)).toBe(second);
    expect(calls).toEqual([
      PUSH('/dashboard/feed/7'),
      LISTEN,
      PUSH('/dashboard/feed/8?comment=3'),
      UNLISTEN,
      LISTEN,
    ]);
  });

  it('nový cieľ s tým istým príspevkom a iným komentárom zapíše novú adresu a prepne listener', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7, highlightCommentId: 1 });
    const second = { postId: 7, highlightCommentId: 2 };
    open(mounted, second);
    expect(currentTarget(mounted)).toBe(second);
    expect(calls).toEqual([
      PUSH('/dashboard/feed/7?comment=1'),
      LISTEN,
      PUSH('/dashboard/feed/7?comment=2'),
      UNLISTEN,
      LISTEN,
    ]);
  });

  it('opakované otvorenie tým istým objektom neprepne listener', () => {
    const mounted = mountHook();
    const target = { postId: 7 };
    open(mounted, target);
    open(mounted, target);
    expect(calls).toEqual([PUSH('/dashboard/feed/7'), LISTEN, PUSH('/dashboard/feed/7')]);
  });
});

describe('zatvorenie okna (handleFeedOverlayTargetChange(null))', () => {
  it('bez options: cieľ sa vynuluje a záznam sa odoberie krokom späť', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    calls = [];
    close(mounted);
    expect(currentTarget(mounted)).toBeNull();
    expect(calls).toEqual([POP, UNLISTEN]);
  });

  it.each<[string, FeedPostOverlayCloseOptions | undefined]>([
    ['options chýbajú', undefined],
    ['prázdne options', {}],
    ['keepHistory: false', { keepHistory: false }],
    ['keepHistory: undefined', { keepHistory: undefined }],
  ])('%s: bežné zatvorenie odoberie záznam a nič nezabúda', (_label, options) => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    calls = [];
    close(mounted, options);
    expect(calls).toEqual([POP, UNLISTEN]);
    expect(mockForgetFeedOverlayHistory).not.toHaveBeenCalled();
  });

  it('keepHistory: true (appka naviguje inam): záznam sa len zabudne, krok späť sa nerobí', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    calls = [];
    close(mounted, { keepHistory: true });
    expect(currentTarget(mounted)).toBeNull();
    expect(calls).toEqual([FORGET, UNLISTEN]);
    expect(mockPopFeedOverlayHistory).not.toHaveBeenCalled();
  });

  it('zatvorenie nikdy nezapisuje novú adresu', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    close(mounted);
    open(mounted, { postId: 8 });
    close(mounted, { keepHistory: true });
    expect(mockPushFeedOverlayHistory).toHaveBeenCalledTimes(2);
  });

  it('zatvorenie zavretého okna sa dotkne len histórie (tá sama rozhodne, že niet čo odoberať)', () => {
    const mounted = mountHook();
    close(mounted);
    expect(currentTarget(mounted)).toBeNull();
    expect(calls).toEqual([POP]);
  });

  it('zatvorenie zavretého okna s keepHistory: true zabudne záznam', () => {
    const mounted = mountHook();
    close(mounted, { keepHistory: true });
    expect(calls).toEqual([FORGET]);
  });

  it('po zatvorení sa dá okno otvoriť znova', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    close(mounted);
    const again = { postId: 9, highlightCommentId: 2 };
    calls = [];
    open(mounted, again);
    expect(currentTarget(mounted)).toBe(again);
    expect(calls).toEqual([PUSH('/dashboard/feed/9?comment=2'), LISTEN]);
  });
});

describe('tlačidlo späť v prehliadači (popstate)', () => {
  it('pri otvorenom okne ho zavrie a záznam histórie len zabudne', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    calls = [];
    pressBrowserBack();
    expect(currentTarget(mounted)).toBeNull();
    expect(calls).toEqual([FORGET, UNLISTEN]);
    expect(mockPopFeedOverlayHistory).not.toHaveBeenCalled();
  });

  it('po zatvorení oknom popstate už nič nespraví (listener je odobraný)', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    close(mounted);
    calls = [];
    pressBrowserBack();
    expect(calls).toEqual([]);
  });

  it('po zatvorení tlačidlom späť ďalší popstate nič nespraví', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    pressBrowserBack();
    calls = [];
    pressBrowserBack();
    expect(calls).toEqual([]);
    expect(currentTarget(mounted)).toBeNull();
  });

  it('po zmene príspevku beží presne jeden listener', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    open(mounted, { postId: 8 });
    calls = [];
    pressBrowserBack();
    expect(calls).toEqual([FORGET, UNLISTEN]);
    expect(currentTarget(mounted)).toBeNull();
  });

  it('opätovné vykreslenie s tým istým cieľom listener neprepína', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    calls = [];
    mounted.rerender();
    mounted.rerender();
    expect(calls).toEqual([]);
  });

  it('po odmountovaní sa listener odoberie a popstate nič nespraví', () => {
    const mounted = mountHook();
    open(mounted, { postId: 7 });
    calls = [];
    mounted.unmount();
    expect(calls).toEqual([UNLISTEN]);
    pressBrowserBack();
    expect(calls).toEqual([UNLISTEN]);
  });

  it('po odmountovaní zatvoreného okna sa nič neodoberá', () => {
    const mounted = mountHook();
    mounted.unmount();
    expect(calls).toEqual([]);
  });
});

describe('priame nastavenie cieľa (setFeedOverlayTarget)', () => {
  it('otvorí okno bez zápisu do histórie a zapne popstate (priamy vstup na adresu príspevku)', () => {
    const mounted = mountHook();
    const target = { postId: 9, highlightCommentId: 4 };
    act(() => {
      mounted.result.current.setFeedOverlayTarget(target);
    });
    expect(currentTarget(mounted)).toBe(target);
    expect(calls).toEqual([LISTEN]);
  });

  it('nastavenie null okno zavrie bez dotyku histórie', () => {
    const mounted = mountHook();
    act(() => {
      mounted.result.current.setFeedOverlayTarget({ postId: 9 });
    });
    calls = [];
    act(() => {
      mounted.result.current.setFeedOverlayTarget(null);
    });
    expect(currentTarget(mounted)).toBeNull();
    expect(calls).toEqual([UNLISTEN]);
  });

  it('popstate zavrie aj okno otvorené priamym nastavením', () => {
    const mounted = mountHook();
    act(() => {
      mounted.result.current.setFeedOverlayTarget({ postId: 9 });
    });
    calls = [];
    pressBrowserBack();
    expect(currentTarget(mounted)).toBeNull();
    expect(calls).toEqual([FORGET, UNLISTEN]);
  });
});

describe('stabilita funkcií', () => {
  it('handler aj nastavovač majú stálu identitu pri vykreslení aj pri zmene cieľa', () => {
    const mounted = mountHook();
    const { handleFeedOverlayTargetChange, setFeedOverlayTarget } = mounted.result.current;
    mounted.rerender();
    open(mounted, { postId: 7 });
    close(mounted);
    expect(mounted.result.current.handleFeedOverlayTargetChange).toBe(handleFeedOverlayTargetChange);
    expect(mounted.result.current.setFeedOverlayTarget).toBe(setFeedOverlayTarget);
  });

  it('handler zavolaný zo starej referencie funguje rovnako (nemá zastarané hodnoty)', () => {
    const mounted = mountHook();
    const staleHandler = mounted.result.current.handleFeedOverlayTargetChange;
    open(mounted, { postId: 7 });
    open(mounted, { postId: 8 });
    calls = [];
    act(() => {
      staleHandler({ postId: 11, highlightCommentId: 5 });
    });
    expect(currentTarget(mounted)).toEqual({ postId: 11, highlightCommentId: 5 });
    expect(calls).toEqual([PUSH('/dashboard/feed/11?comment=5'), UNLISTEN, LISTEN]);
  });
});

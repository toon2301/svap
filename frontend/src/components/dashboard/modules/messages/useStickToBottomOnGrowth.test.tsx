'use client';

import React, { useRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useStickToBottomOnGrowth } from './useStickToBottomOnGrowth';

type ObservedBox = { callback: () => void; observed: Element | null; disconnected: boolean };
type Geometry = { scrollHeight: number; clientHeight: number; scrollTop: number };

/** Nahradí `ResizeObserver` náhradou, ktorú test spúšťa ručne (`grow`), a zaznamená, čo sleduje a či ju hook odpojil. */
function installResizeObserverStub() {
  const original = global.ResizeObserver;
  const boxes: ObservedBox[] = [];

  class StubResizeObserver {
    private readonly box: ObservedBox;

    constructor(callback: () => void) {
      this.box = { callback, observed: null, disconnected: false };
      boxes.push(this.box);
    }

    observe = (element: Element) => {
      this.box.observed = element;
    };

    unobserve = () => {};

    disconnect = () => {
      this.box.disconnected = true;
    };
  }

  Object.defineProperty(global, 'ResizeObserver', { configurable: true, value: StubResizeObserver });

  return {
    boxes,
    grow() {
      boxes.filter((box) => !box.disconnected).forEach((box) => box.callback());
    },
    restore() {
      Object.defineProperty(global, 'ResizeObserver', { configurable: true, value: original });
    },
  };
}

/** Okno s obsahom, na ktoré sa hook pripojí; `data-testid` slúži na dohľadanie prvkov v teste. */
function Harness({ enabled = true }: { enabled?: boolean }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  useStickToBottomOnGrowth({ enabled, scrollContainerRef: scrollRef, contentRef });
  return (
    <div ref={scrollRef} data-testid="scroll">
      <div ref={contentRef} data-testid="content" />
    </div>
  );
}

/** Nastaví prvku rozmery z objektu `geometry`; test ich potom mení priamo v ňom, ako keby sa zmenilo rozloženie. */
function mockGeometry(element: HTMLElement, geometry: Geometry) {
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => geometry.scrollTop,
    set: (value: number) => {
      geometry.scrollTop = value;
    },
  });
  Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => geometry.scrollHeight });
  Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => geometry.clientHeight });
  return geometry;
}

/** Vykreslí hook vypnutý, nastaví rozmery a až potom ho zapne, aby si hook prečítal počiatočnú polohu okna. */
function startAt(geometry: Geometry) {
  const view = render(<Harness enabled={false} />);
  const scroller = screen.getByTestId('scroll');
  const state = mockGeometry(scroller, geometry);
  view.rerender(<Harness enabled />);
  return { state, view, scroller };
}

/** Prehliadač pošle udalosť posunu po každej zmene `scrollTop` (aj z kódu); jsdom nie, preto ju test pošle sám. */
function scrollEvent(scroller: HTMLElement) {
  fireEvent.scroll(scroller);
}

describe('useStickToBottomOnGrowth', () => {
  let resizeObserver: ReturnType<typeof installResizeObserverStub>;

  beforeEach(() => {
    resizeObserver = installResizeObserverStub();
  });

  afterEach(() => {
    resizeObserver.restore();
  });

  it('moves to the bottom when the content grows while the view was at the bottom', () => {
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    state.scrollHeight = 1352;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(1352);
  });

  it('keeps following when the content grows several times in a row', () => {
    const { state, scroller } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    state.scrollHeight = 1060;
    act(() => resizeObserver.grow());
    scrollEvent(scroller);
    state.scrollHeight = 1412;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(1412);
  });

  it('stays in place when the user was scrolled up before the growth', () => {
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 300 });

    state.scrollHeight = 1352;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(300);
  });

  it('stops following once the user scrolls up between two growth steps', () => {
    const { state, scroller } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    state.scrollHeight = 1060;
    act(() => resizeObserver.grow());
    scrollEvent(scroller);
    expect(state.scrollTop).toBe(1060);

    state.scrollTop = 500;
    scrollEvent(scroller);
    state.scrollHeight = 1412;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(500);
  });

  it('does not move when the content shrinks', () => {
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 560 });

    state.scrollHeight = 940;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(560);
  });

  it('does not move when the observer fires without a change of the content height', () => {
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 560 });

    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(560);
  });

  it('follows the content again after a shrink, comparing with the height from before the latest change', () => {
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    state.scrollHeight = 900;
    act(() => resizeObserver.grow());
    state.scrollHeight = 950;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(950);
  });

  it('follows again once the user scrolls back down to the bottom', () => {
    const { state, scroller } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 100 });

    state.scrollTop = 600;
    scrollEvent(scroller);
    state.scrollHeight = 1352;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(1352);
  });

  it('treats a view at most 80px above the bottom as being at the bottom', () => {
    const nearBottom = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 520 });
    nearBottom.state.scrollHeight = 1352;
    act(() => resizeObserver.grow());
    expect(nearBottom.state.scrollTop).toBe(1352);
    nearBottom.view.unmount();

    const tooFarUp = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 519 });
    tooFarUp.state.scrollHeight = 1352;
    act(() => resizeObserver.grow());
    expect(tooFarUp.state.scrollTop).toBe(519);
  });

  it('keeps the reading position when older messages are prepended and the position is restored before the observer fires', () => {
    const { state, scroller } = startAt({ scrollHeight: 2000, clientHeight: 400, scrollTop: 48 });
    scrollEvent(scroller);

    // Aplikácia vráti čitateľa na jeho miesto (pridá výšku vložených správ), až potom príde oznam o zmene rozloženia.
    state.scrollHeight = 4000;
    state.scrollTop = 2048;
    scrollEvent(scroller);
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(2048);
  });

  it('keeps the reading position when the observer fires before the position is restored', () => {
    const { state, scroller } = startAt({ scrollHeight: 2000, clientHeight: 400, scrollTop: 48 });
    scrollEvent(scroller);

    state.scrollHeight = 4000;
    act(() => resizeObserver.grow());
    expect(state.scrollTop).toBe(48);

    state.scrollTop = 2048;
    scrollEvent(scroller);
    state.scrollHeight = 4100;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(2048);
  });

  it('keeps the reading position when the browser compensates the position for growth above the view', () => {
    const { state, scroller } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 300 });
    scrollEvent(scroller);

    // Obrázok nad čitateľom narástol o 352 px a prehliadač posunul okno o toľko nižšie, aby čitateľ ostal na mieste.
    state.scrollHeight = 1352;
    state.scrollTop = 652;
    scrollEvent(scroller);
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(652);
  });

  it('does not observe or listen while disabled', () => {
    const original = HTMLDivElement.prototype.addEventListener;
    const scrollListenerTargets: HTMLDivElement[] = [];
    const addListener = jest
      .spyOn(HTMLDivElement.prototype, 'addEventListener')
      .mockImplementation(function recordScrollListener(this: HTMLDivElement, ...args: unknown[]) {
        if (args[0] === 'scroll') scrollListenerTargets.push(this);
        return original.apply(this, args as Parameters<typeof original>);
      });

    render(<Harness enabled={false} />);

    expect(resizeObserver.boxes).toHaveLength(0);
    expect(scrollListenerTargets.filter((target) => target.dataset.testid === 'scroll')).toHaveLength(0);
    addListener.mockRestore();
  });

  it('observes the content element and releases the observer and the scroll listener on unmount', () => {
    const { view, scroller } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });
    const removeListener = jest.spyOn(scroller, 'removeEventListener');

    expect(resizeObserver.boxes).toHaveLength(1);
    expect(resizeObserver.boxes[0].observed).toBe(screen.getByTestId('content'));

    view.unmount();

    expect(resizeObserver.boxes[0].disconnected).toBe(true);
    expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('does nothing when ResizeObserver is not available', () => {
    Object.defineProperty(global, 'ResizeObserver', { configurable: true, value: undefined });

    expect(() => render(<Harness />)).not.toThrow();
  });
});

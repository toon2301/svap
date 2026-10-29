'use client';

import React, { useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { useStickToBottomOnGrowth } from './useStickToBottomOnGrowth';

type ObservedBox = { callback: () => void; observed: Element | null; disconnected: boolean };

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

function mockGeometry(element: HTMLElement, geometry: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
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

/** Vykreslí hook vypnutý, nastaví rozmery a až potom ho zapne, aby si hook prečítal počiatočnú výšku obsahu. */
function startAt(geometry: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
  const view = render(<Harness enabled={false} />);
  const state = mockGeometry(screen.getByTestId('scroll'), geometry);
  view.rerender(<Harness enabled />);
  return { state, view };
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
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    state.scrollHeight = 1060;
    act(() => resizeObserver.grow());
    state.scrollHeight = 1412;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(1412);
  });

  it('stays in place when the user has scrolled up', () => {
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 300 });

    state.scrollHeight = 1352;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(300);
  });

  it('stops following once the user scrolls up between two growth steps', () => {
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    state.scrollHeight = 1060;
    act(() => resizeObserver.grow());
    expect(state.scrollTop).toBe(1060);

    state.scrollTop = 500;
    state.scrollHeight = 1412;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(500);
  });

  it('compares the scroll position with the content height from before the latest growth', () => {
    const { state } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    state.scrollHeight = 1352;
    act(() => resizeObserver.grow());
    expect(state.scrollTop).toBe(1352);

    state.scrollTop = 800;
    state.scrollHeight = 1404;
    act(() => resizeObserver.grow());

    expect(state.scrollTop).toBe(800);
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

  it('does not observe anything while disabled', () => {
    render(<Harness enabled={false} />);

    expect(resizeObserver.boxes).toHaveLength(0);
  });

  it('observes the content element and stops observing on unmount', () => {
    const { view } = startAt({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    expect(resizeObserver.boxes).toHaveLength(1);
    expect(resizeObserver.boxes[0].observed).toBe(screen.getByTestId('content'));

    view.unmount();

    expect(resizeObserver.boxes[0].disconnected).toBe(true);
  });

  it('does nothing when ResizeObserver is not available', () => {
    Object.defineProperty(global, 'ResizeObserver', { configurable: true, value: undefined });

    expect(() => render(<Harness />)).not.toThrow();
  });
});

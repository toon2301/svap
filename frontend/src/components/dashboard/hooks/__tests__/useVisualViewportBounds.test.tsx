import { act, renderHook } from '@testing-library/react';
import {
  readVisualViewportBounds,
  useVisualViewportBounds,
} from '../useVisualViewportBounds';

type ViewportEvent = 'resize' | 'scroll';

function installVisualViewport(initial: {
  width: number;
  height: number;
  offsetTop?: number;
  offsetLeft?: number;
}) {
  let metrics = {
    offsetTop: 0,
    offsetLeft: 0,
    ...initial,
  };
  const listeners = new Map<ViewportEvent, Set<EventListener>>([
    ['resize', new Set()],
    ['scroll', new Set()],
  ]);
  const viewport = {
    get width() {
      return metrics.width;
    },
    get height() {
      return metrics.height;
    },
    get offsetTop() {
      return metrics.offsetTop;
    },
    get offsetLeft() {
      return metrics.offsetLeft;
    },
    addEventListener: jest.fn((type: ViewportEvent, listener: EventListener) => {
      listeners.get(type)?.add(listener);
    }),
    removeEventListener: jest.fn((type: ViewportEvent, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    }),
  };

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport,
  });

  return {
    viewport,
    setMetrics(next: Partial<typeof metrics>) {
      metrics = { ...metrics, ...next };
    },
    dispatch(type: ViewportEvent) {
      listeners.get(type)?.forEach((listener) => listener(new Event(type)));
    },
  };
}

describe('useVisualViewportBounds', () => {
  const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');

  afterEach(() => {
    if (originalVisualViewport) {
      Object.defineProperty(window, 'visualViewport', originalVisualViewport);
    } else {
      Reflect.deleteProperty(window, 'visualViewport');
    }
  });

  it('keeps viewport position separate from its visible height', () => {
    const visualViewport = installVisualViewport({
      width: 390,
      height: 420,
      offsetTop: 72,
      offsetLeft: 4,
    });
    const { result, unmount } = renderHook(() => useVisualViewportBounds(true));

    expect(result.current).toEqual({
      top: 72,
      left: 4,
      width: 390,
      height: 420,
      right: 394,
      bottom: 492,
    });

    act(() => {
      visualViewport.setMetrics({ height: 360, offsetTop: 104 });
      visualViewport.dispatch('resize');
    });
    expect(result.current).toEqual(expect.objectContaining({
      top: 104,
      height: 360,
      bottom: 464,
    }));

    act(() => {
      visualViewport.setMetrics({ offsetTop: 120 });
      visualViewport.dispatch('scroll');
    });
    expect(result.current).toEqual(expect.objectContaining({
      top: 120,
      height: 360,
      bottom: 480,
    }));

    unmount();
    expect(visualViewport.viewport.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(visualViewport.viewport.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    );
  });

  it('falls back to the layout viewport and stays idle while disabled', () => {
    Reflect.deleteProperty(window, 'visualViewport');
    expect(readVisualViewportBounds()).toEqual({
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      right: window.innerWidth,
      bottom: window.innerHeight,
    });

    const { result } = renderHook(() => useVisualViewportBounds(false));
    expect(result.current).toBeNull();
  });
});

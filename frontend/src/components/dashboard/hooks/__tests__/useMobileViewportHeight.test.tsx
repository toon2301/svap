import { act, renderHook } from '@testing-library/react';
import { useMobileViewportHeight } from '../useMobileViewportHeight';

type ViewportEvent = 'resize' | 'scroll';

function installVisualViewport(initialHeight: number, initialOffsetTop = 0) {
  let height = initialHeight;
  let offsetTop = initialOffsetTop;
  const listeners = new Map<ViewportEvent, Set<EventListener>>([
    ['resize', new Set()],
    ['scroll', new Set()],
  ]);
  const viewport = {
    get height() {
      return height;
    },
    get offsetTop() {
      return offsetTop;
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
    setMetrics(next: { height?: number; offsetTop?: number }) {
      if (next.height !== undefined) height = next.height;
      if (next.offsetTop !== undefined) offsetTop = next.offsetTop;
    },
    dispatch(type: ViewportEvent) {
      listeners.get(type)?.forEach((listener) => listener(new Event(type)));
    },
  };
}

describe('useMobileViewportHeight', () => {
  const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');

  afterEach(() => {
    if (originalVisualViewport) {
      Object.defineProperty(window, 'visualViewport', originalVisualViewport);
    } else {
      Reflect.deleteProperty(window, 'visualViewport');
    }
  });

  it('tracks the visible bottom while the keyboard resizes or pans the viewport', () => {
    const visualViewport = installVisualViewport(640, 0);
    const { result, unmount } = renderHook(() => useMobileViewportHeight(true));

    expect(result.current).toBe(640);

    act(() => {
      visualViewport.setMetrics({ height: 430, offsetTop: 56 });
      visualViewport.dispatch('resize');
    });
    expect(result.current).toBe(486);

    act(() => {
      visualViewport.setMetrics({ height: 420, offsetTop: 72 });
      visualViewport.dispatch('scroll');
    });
    expect(result.current).toBe(492);

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
});

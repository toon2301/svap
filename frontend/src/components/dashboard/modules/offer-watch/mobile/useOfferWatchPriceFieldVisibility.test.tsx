import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import type { VisualViewportBounds } from '../../../hooks/useVisualViewportBounds';
import { useOfferWatchPriceFieldVisibility } from './useOfferWatchPriceFieldVisibility';

const DEFAULT_BOUNDS: VisualViewportBounds = {
  top: 0,
  left: 0,
  width: 390,
  height: 500,
  right: 390,
  bottom: 500,
};

type HarnessProps = {
  bounds?: VisualViewportBounds | null;
};

function Harness({ bounds = DEFAULT_BOUNDS }: HarnessProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const visibilityHandlers = useOfferWatchPriceFieldVisibility({
    scrollContainerRef,
    viewportBounds: bounds,
  });

  return (
    <div
      ref={scrollContainerRef}
      data-testid='scroller'
      onFocusCapture={visibilityHandlers.onFocusCapture}
      onBlurCapture={visibilityHandlers.onBlurCapture}
    >
      <div data-testid='first-wrapper' data-offer-watch-price-field>
        <input aria-label='Cena od' />
      </div>
      <div data-testid='second-wrapper' data-offer-watch-price-field>
        <input aria-label='Cena do' />
      </div>
      <input aria-label='Iné pole' />
    </div>
  );
}

function rect(top: number, bottom: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    bottom,
    left: 0,
    right: 300,
    width: 300,
    height: bottom - top,
    toJSON: () => ({}),
  } as DOMRect;
}

function configureScroller(scroller: HTMLElement, scrollTop = 100): void {
  scroller.scrollTop = scrollTop;
  Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 500 });
  Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1_000 });
  jest.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(rect(100, 600));
}

describe('useOfferWatchPriceFieldVisibility', () => {
  let animationFrames: Map<number, FrameRequestCallback>;
  let nextAnimationFrameId: number;
  let requestAnimationFrameSpy: jest.SpyInstance<number, [FrameRequestCallback]>;
  let cancelAnimationFrameSpy: jest.SpyInstance<void, [number]>;

  const flushAnimationFrames = () => {
    act(() => {
      const pendingFrames = [...animationFrames.entries()];
      animationFrames.clear();
      pendingFrames.forEach(([, callback]) => callback(0));
    });
  };

  beforeEach(() => {
    animationFrames = new Map();
    nextAnimationFrameId = 1;
    requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        const frameId = nextAnimationFrameId;
        nextAnimationFrameId += 1;
        animationFrames.set(frameId, callback);
        return frameId;
      });
    cancelAnimationFrameSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((frameId) => {
        animationFrames.delete(frameId);
      });
  });

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });

  it('scrolls only the inner container when a price field is below the visible area', () => {
    render(<Harness />);
    const scroller = screen.getByTestId('scroller');
    const wrapper = screen.getByTestId('first-wrapper');
    configureScroller(scroller);
    jest.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(rect(450, 520));
    const windowScrollToSpy = jest.spyOn(window, 'scrollTo');
    const windowScrollBySpy = jest.spyOn(window, 'scrollBy');

    fireEvent.focus(screen.getByRole('textbox', { name: 'Cena od' }));
    flushAnimationFrames();

    expect(scroller.scrollTop).toBe(136);
    expect(windowScrollToSpy).not.toHaveBeenCalled();
    expect(windowScrollBySpy).not.toHaveBeenCalled();
    windowScrollToSpy.mockRestore();
    windowScrollBySpy.mockRestore();
  });

  it('scrolls upward when the focused price field is above the visible area', () => {
    render(<Harness />);
    const scroller = screen.getByTestId('scroller');
    const wrapper = screen.getByTestId('first-wrapper');
    configureScroller(scroller);
    jest.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(rect(80, 140));

    fireEvent.focus(screen.getByRole('textbox', { name: 'Cena od' }));
    flushAnimationFrames();

    expect(scroller.scrollTop).toBe(64);
  });

  it('does not move a field that is already visible with the required padding', () => {
    render(<Harness />);
    const scroller = screen.getByTestId('scroller');
    const wrapper = screen.getByTestId('first-wrapper');
    configureScroller(scroller);
    jest.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(rect(150, 300));

    fireEvent.focus(screen.getByRole('textbox', { name: 'Cena od' }));
    flushAnimationFrames();

    expect(scroller.scrollTop).toBe(100);
  });

  it('tracks a newly focused price field without waiting for a viewport change', () => {
    render(<Harness />);
    const scroller = screen.getByTestId('scroller');
    const firstWrapper = screen.getByTestId('first-wrapper');
    const secondWrapper = screen.getByTestId('second-wrapper');
    configureScroller(scroller);
    jest.spyOn(firstWrapper, 'getBoundingClientRect').mockReturnValue(rect(150, 250));
    jest.spyOn(secondWrapper, 'getBoundingClientRect').mockReturnValue(rect(470, 550));

    fireEvent.focus(screen.getByRole('textbox', { name: 'Cena od' }));
    flushAnimationFrames();
    expect(scroller.scrollTop).toBe(100);

    fireEvent.blur(screen.getByRole('textbox', { name: 'Cena od' }), {
      relatedTarget: screen.getByRole('textbox', { name: 'Cena do' }),
    });
    fireEvent.focus(screen.getByRole('textbox', { name: 'Cena do' }));
    flushAnimationFrames();

    expect(scroller.scrollTop).toBe(166);
  });

  it('reacts to viewport changes without restoring or cumulatively increasing scroll', () => {
    const { rerender } = render(<Harness />);
    const scroller = screen.getByTestId('scroller');
    const wrapper = screen.getByTestId('first-wrapper');
    configureScroller(scroller);
    jest.spyOn(wrapper, 'getBoundingClientRect').mockImplementation(() => {
      const appliedScroll = scroller.scrollTop - 100;
      return rect(450 - appliedScroll, 520 - appliedScroll);
    });

    fireEvent.focus(screen.getByRole('textbox', { name: 'Cena od' }));
    flushAnimationFrames();
    expect(scroller.scrollTop).toBe(136);

    const smallerBounds = { ...DEFAULT_BOUNDS, height: 480, bottom: 480 };
    rerender(<Harness bounds={smallerBounds} />);
    flushAnimationFrames();
    expect(scroller.scrollTop).toBe(156);

    rerender(<Harness bounds={{ ...smallerBounds }} />);
    flushAnimationFrames();
    expect(scroller.scrollTop).toBe(156);

    rerender(<Harness bounds={{ ...DEFAULT_BOUNDS, height: 600, bottom: 600 }} />);
    flushAnimationFrames();
    expect(scroller.scrollTop).toBe(156);
  });

  it('cancels pending work when focus leaves the price fields and on unmount', () => {
    const { unmount } = render(<Harness />);
    const scroller = screen.getByTestId('scroller');
    const wrapper = screen.getByTestId('first-wrapper');
    configureScroller(scroller);
    jest.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(rect(450, 520));

    const priceInput = screen.getByRole('textbox', { name: 'Cena od' });
    fireEvent.focus(priceInput);
    fireEvent.blur(priceInput, {
      relatedTarget: screen.getByRole('textbox', { name: 'Iné pole' }),
    });
    expect(animationFrames.size).toBe(0);
    expect(cancelAnimationFrameSpy).toHaveBeenCalled();

    fireEvent.focus(priceInput);
    expect(animationFrames.size).toBe(1);
    unmount();

    expect(animationFrames.size).toBe(0);
    expect(scroller.scrollTop).toBe(100);
  });
});

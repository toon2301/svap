/**
 * Dlhé podržanie prstom (`useFeedLongPress`, zapnutie skrytej diagnostiky, nálezy 375 až 377, kolo 3c).
 *
 * Po `delayMs` bez zdvihnutia prsta a bez výraznejšieho pohybu sa zavolá obsluha. Ťuknutie, ťahanie, zrušenie gesta, druhý prst
 * ani odmontovanie nič nespustia.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FEED_LONG_PRESS_MS, MOVE_TOLERANCE_PX, useFeedLongPress } from '../useFeedLongPress';

function Cielovy({ onLongPress, delayMs }: { onLongPress: () => void; delayMs?: number }) {
  const obsluhy = useFeedLongPress(onLongPress, delayMs);
  return <div data-testid="cielovy" {...obsluhy} />;
}

const prst = (x: number, y: number) => ({ clientX: x, clientY: y });

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('dlhé podržanie', () => {
  it('po uplynutí času zavolá obsluhu práve raz', () => {
    const obsluha = jest.fn();
    render(<Cielovy onLongPress={obsluha} />);

    fireEvent.touchStart(screen.getByTestId('cielovy'), { touches: [prst(10, 10)] });
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS - 1));
    expect(obsluha).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(obsluha).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS * 3));
    expect(obsluha).toHaveBeenCalledTimes(1);
  });

  it('používa zadaný čas namiesto predvoleného', () => {
    const obsluha = jest.fn();
    render(<Cielovy onLongPress={obsluha} delayMs={300} />);

    fireEvent.touchStart(screen.getByTestId('cielovy'), { touches: [prst(10, 10)] });
    act(() => jest.advanceTimersByTime(300));

    expect(obsluha).toHaveBeenCalledTimes(1);
  });

  it('zdvihnutie prsta pred uplynutím času podržanie zruší', () => {
    const obsluha = jest.fn();
    render(<Cielovy onLongPress={obsluha} />);
    const cielovy = screen.getByTestId('cielovy');

    fireEvent.touchStart(cielovy, { touches: [prst(10, 10)] });
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS - 100));
    fireEvent.touchEnd(cielovy);
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    expect(obsluha).not.toHaveBeenCalled();
  });

  it('zrušenie gesta systémom podržanie zruší', () => {
    const obsluha = jest.fn();
    render(<Cielovy onLongPress={obsluha} />);
    const cielovy = screen.getByTestId('cielovy');

    fireEvent.touchStart(cielovy, { touches: [prst(10, 10)] });
    fireEvent.touchCancel(cielovy);
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    expect(obsluha).not.toHaveBeenCalled();
  });

  it('malé chvenie prsta (do tolerancie) podržanie nezruší', () => {
    const obsluha = jest.fn();
    render(<Cielovy onLongPress={obsluha} />);
    const cielovy = screen.getByTestId('cielovy');

    fireEvent.touchStart(cielovy, { touches: [prst(10, 10)] });
    fireEvent.touchMove(cielovy, { touches: [prst(10 + MOVE_TOLERANCE_PX - 1, 10)] });
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    expect(obsluha).toHaveBeenCalledTimes(1);
  });

  it('výraznejší pohyb (ťahanie) podržanie zruší', () => {
    const obsluha = jest.fn();
    render(<Cielovy onLongPress={obsluha} />);
    const cielovy = screen.getByTestId('cielovy');

    fireEvent.touchStart(cielovy, { touches: [prst(10, 10)] });
    fireEvent.touchMove(cielovy, { touches: [prst(10, 10 + MOVE_TOLERANCE_PX + 5)] });
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    expect(obsluha).not.toHaveBeenCalled();
  });

  it('dva prsty podržanie nespustia', () => {
    const obsluha = jest.fn();
    render(<Cielovy onLongPress={obsluha} />);

    fireEvent.touchStart(screen.getByTestId('cielovy'), { touches: [prst(10, 10), prst(50, 50)] });
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    expect(obsluha).not.toHaveBeenCalled();
  });

  it('nový dotyk začne meranie odznova', () => {
    const obsluha = jest.fn();
    render(<Cielovy onLongPress={obsluha} />);
    const cielovy = screen.getByTestId('cielovy');

    fireEvent.touchStart(cielovy, { touches: [prst(10, 10)] });
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS - 100));
    fireEvent.touchStart(cielovy, { touches: [prst(10, 10)] });
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS - 100));
    expect(obsluha).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(100));
    expect(obsluha).toHaveBeenCalledTimes(1);
  });

  it('zavolá vždy najnovšiu obsluhu', () => {
    const stara = jest.fn();
    const nova = jest.fn();
    const { rerender } = render(<Cielovy onLongPress={stara} />);

    fireEvent.touchStart(screen.getByTestId('cielovy'), { touches: [prst(10, 10)] });
    rerender(<Cielovy onLongPress={nova} />);
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    expect(stara).not.toHaveBeenCalled();
    expect(nova).toHaveBeenCalledTimes(1);
  });

  it('po odmontovaní sa časovač zruší a obsluha sa nezavolá', () => {
    const obsluha = jest.fn();
    const { unmount } = render(<Cielovy onLongPress={obsluha} />);

    fireEvent.touchStart(screen.getByTestId('cielovy'), { touches: [prst(10, 10)] });
    unmount();
    act(() => jest.advanceTimersByTime(FEED_LONG_PRESS_MS));

    expect(obsluha).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

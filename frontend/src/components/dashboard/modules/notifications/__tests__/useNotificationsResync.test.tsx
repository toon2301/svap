import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';

import { MESSAGING_REALTIME_RECONNECTED_EVENT } from '@/components/dashboard/modules/messages/messagesEvents';

import {
  NOTIFICATIONS_RESYNC_DEBOUNCE_MS,
  NOTIFICATIONS_RESYNC_POLL_MS,
  useNotificationsResync,
} from '../useNotificationsResync';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}

function comeBack() {
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function settle(ms = NOTIFICATIONS_RESYNC_DEBOUNCE_MS) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useNotificationsResync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setVisibility('visible');
  });

  afterEach(() => {
    jest.useRealTimers();
    setVisibility('visible');
  });

  it('resyncs once after the app returns to the foreground', () => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync));

    comeBack();
    expect(onResync).not.toHaveBeenCalled();
    settle();

    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['focus', () => window.dispatchEvent(new Event('focus'))],
    ['online', () => window.dispatchEvent(new Event('online'))],
    [
      'the realtime reconnect',
      () => window.dispatchEvent(new Event(MESSAGING_REALTIME_RECONNECTED_EVENT)),
    ],
  ])('resyncs after %s', (_name, fire) => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync));

    act(() => {
      fire();
    });
    settle();

    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('merges the signals that iOS fires together into one resync', () => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event(MESSAGING_REALTIME_RECONNECTED_EVENT));
    });
    settle();
    settle(NOTIFICATIONS_RESYNC_DEBOUNCE_MS * 3);

    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('resyncs again for a later, separate return', () => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync));

    comeBack();
    settle();
    comeBack();
    settle();

    expect(onResync).toHaveBeenCalledTimes(2);
  });

  it('does nothing while the page is hidden', () => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync));
    setVisibility('hidden');

    comeBack();
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    settle(NOTIFICATIONS_RESYNC_POLL_MS * 2);

    expect(onResync).not.toHaveBeenCalled();
  });

  it('skips the resync when the page was hidden again before the pause ran out', () => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync));

    comeBack();
    setVisibility('hidden');
    settle();

    expect(onResync).not.toHaveBeenCalled();
  });

  it('polls every 30 seconds while visible, as a safety net for a silent socket', () => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync));

    settle(29_999);
    expect(onResync).not.toHaveBeenCalled();

    settle(1 + NOTIFICATIONS_RESYNC_DEBOUNCE_MS);
    expect(onResync).toHaveBeenCalledTimes(1);

    settle(30_000);
    expect(onResync).toHaveBeenCalledTimes(2);
  });

  it('stops polling after unmount', () => {
    const onResync = jest.fn();
    const view = renderHook(() => useNotificationsResync(onResync));

    view.unmount();
    settle(NOTIFICATIONS_RESYNC_POLL_MS * 3);

    expect(onResync).not.toHaveBeenCalled();
  });

  it('does not poll while hidden and polls again once visible', () => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync));

    setVisibility('hidden');
    settle(NOTIFICATIONS_RESYNC_POLL_MS * 3);
    expect(onResync).not.toHaveBeenCalled();

    setVisibility('visible');
    settle(NOTIFICATIONS_RESYNC_POLL_MS);
    settle(NOTIFICATIONS_RESYNC_DEBOUNCE_MS);
    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('stops listening and cancels a pending resync on unmount', () => {
    const onResync = jest.fn();
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    try {
      const view = renderHook(() => useNotificationsResync(onResync));

      comeBack();
      view.unmount();
      settle(NOTIFICATIONS_RESYNC_POLL_MS * 2);
      comeBack();
      act(() => {
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('online'));
        window.dispatchEvent(new Event(MESSAGING_REALTIME_RECONNECTED_EVENT));
      });
      settle(NOTIFICATIONS_RESYNC_POLL_MS);

      expect(onResync).not.toHaveBeenCalled();
      for (const name of ['focus', 'online', MESSAGING_REALTIME_RECONNECTED_EVENT]) {
        expect(removeSpy).toHaveBeenCalledWith(name, expect.any(Function));
      }
    } finally {
      removeSpy.mockRestore();
    }
  });

  it('keeps a single listener set under React StrictMode (double effects)', () => {
    const onResync = jest.fn();
    renderHook(() => useNotificationsResync(onResync), { wrapper: StrictMode });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    settle();

    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('calls the latest callback, never the old one', () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = renderHook(({ callback }) => useNotificationsResync(callback), {
      initialProps: { callback: first },
    });

    view.rerender({ callback: second });
    comeBack();
    settle();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps a pending signal when only the callback changes', () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = renderHook(({ callback }) => useNotificationsResync(callback), {
      initialProps: { callback: first },
    });

    comeBack();
    view.rerender({ callback: second });
    settle();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps the poll running when the callback changes more often than the poll interval', () => {
    const onResync = jest.fn();
    // Nová funkcia pri každom prekreslení, ako pri inline callbacku.
    const view = renderHook(({ round }) => useNotificationsResync(() => onResync(round)), {
      initialProps: { round: 0 },
    });

    for (let round = 1; round <= 6; round += 1) {
      view.rerender({ round });
      settle(10_000);
    }
    settle(NOTIFICATIONS_RESYNC_DEBOUNCE_MS);

    // Tikanie po 30 s a po 60 s, aj keď sa callback menil každých 10 s.
    expect(onResync).toHaveBeenCalledTimes(2);
  });

  describe('with the poll switched off (a very long list)', () => {
    it('skips the 30 s poll but still resyncs on foreground, focus and online', () => {
      const onResync = jest.fn();
      renderHook(() => useNotificationsResync(onResync, false));

      act(() => {
        jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_POLL_MS * 3);
      });
      expect(onResync).not.toHaveBeenCalled();

      comeBack();
      settle();
      expect(onResync).toHaveBeenCalledTimes(1);
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      settle();
      expect(onResync).toHaveBeenCalledTimes(2);
    });

    it('starts polling again when the switch turns back on, without restarting the interval', () => {
      const onResync = jest.fn();
      const { rerender } = renderHook(({ on }) => useNotificationsResync(onResync, on), {
        initialProps: { on: false },
      });
      act(() => {
        jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_POLL_MS);
      });
      expect(onResync).not.toHaveBeenCalled();

      rerender({ on: true });
      act(() => {
        jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_POLL_MS);
      });
      settle();
      expect(onResync).toHaveBeenCalledTimes(1);
    });
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { OfferWatchMobileView } from './offerWatchMobileNavigation';
import {
  hasOfferWatchSettingsReturnHistory,
  requestOfferWatchMobile,
  withOfferWatchSettingsReturnHistory,
} from './offerWatchMobileNavigation';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';

let mockPushView: (view: OfferWatchMobileView) => void;
jest.mock('./OfferWatchSettingsMobile', () => ({
  __esModule: true,
  /** Capture the child's late callback without invoking API or form effects. */
  default: ({ onBack, onPushView }: { onBack: () => void; onPushView: typeof mockPushView }) => {
    mockPushView = onPushView;
    return <button onClick={onBack}>back</button>;
  },
}));

let isMobile = true;
let onMediaChange: () => void;

beforeEach(() => {
  isMobile = true;
  window.history.replaceState(null, '', '/dashboard/settings');
  window.matchMedia = jest.fn().mockImplementation(() => ({
    get matches() { return isMobile; },
    addEventListener: (_type: string, callback: () => void) => { onMediaChange = callback; },
    removeEventListener: jest.fn(),
  }));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('mobile host lifecycle guards', () => {
  it('supports mobile sizing when matchMedia is unavailable', () => {
    const originalMedia = window.matchMedia;
    const originalWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')!;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    try {
      render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);
      act(() => requestOfferWatchMobile());
      expect(screen.getByRole('button', { name: 'back' })).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMedia;
      Object.defineProperty(window, 'innerWidth', originalWidth);
    }
  });

  it('deduplicates a pending Settings restoration across viewport events', () => {
    jest.useFakeTimers();
    const restore = jest.fn();
    window.history.replaceState(withOfferWatchSettingsReturnHistory({}), '');
    render(<OfferWatchSettingsMobileHost onReturnToSettings={restore} />);
    act(() => { onMediaChange(); onMediaChange(); });
    act(() => jest.advanceTimersByTime(0));
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('does not open mobile Settings after the viewport has become desktop', () => {
    jest.useFakeTimers();
    const restore = jest.fn();
    window.history.replaceState(withOfferWatchSettingsReturnHistory({}), '');
    render(<OfferWatchSettingsMobileHost onReturnToSettings={restore} />);
    isMobile = false;
    act(() => jest.advanceTimersByTime(0));
    expect(restore).not.toHaveBeenCalled();
  });

  it('cancels pending Settings restoration when the host unmounts', () => {
    jest.useFakeTimers();
    const restore = jest.fn();
    window.history.replaceState(withOfferWatchSettingsReturnHistory({}), '');
    const view = render(<OfferWatchSettingsMobileHost onReturnToSettings={restore} />);
    view.unmount();
    act(() => jest.runOnlyPendingTimers());
    expect(restore).not.toHaveBeenCalled();
  });

  it('repairs a missing Settings-return marker when leaving a legacy Settings entry', () => {
    jest.useFakeTimers();
    const restore = jest.fn();
    render(<OfferWatchSettingsMobileHost onReturnToSettings={restore} />);
    act(() => requestOfferWatchMobile());
    window.history.replaceState({ nextInternal: 'kept' }, '', '/dashboard/settings');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(hasOfferWatchSettingsReturnHistory(window.history.state)).toBe(true);
    expect(window.history.state.nextInternal).toBe('kept');
    act(() => jest.advanceTimersByTime(0));
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('ignores an asynchronous child view change after the manager has closed', () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);
    act(() => requestOfferWatchMobile());
    window.history.replaceState(null, '', '/dashboard/settings');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    const push = jest.spyOn(window.history, 'pushState');
    act(() => mockPushView({ kind: 'create' }));
    expect(push).not.toHaveBeenCalled();
  });
});

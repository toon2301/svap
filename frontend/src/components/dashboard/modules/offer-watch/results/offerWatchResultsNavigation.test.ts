import { act, renderHook } from '@testing-library/react';
import {
  readDesktopSettingsOriginTarget,
  readDesktopSettingsReturnTarget,
  withDesktopSettingsHistory,
  type DesktopSettingsReturnTarget,
} from '../../../hooks/desktopSettingsNavigation';
import { useOfferWatchResultsNavigation } from './offerWatchResultsNavigation';

const mockRequestOfferWatchMobile = jest.fn();

jest.mock('../mobile/offerWatchMobileNavigation', () => ({
  requestOfferWatchMobile: (...args: unknown[]) => mockRequestOfferWatchMobile(...args),
}));

/** Set only viewport matching so navigation can be checked without rendering the whole dashboard. */
function setMobileViewport(matches: boolean): void {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe('useOfferWatchResultsNavigation', () => {
  beforeEach(() => {
    mockRequestOfferWatchMobile.mockClear();
    setMobileViewport(false);
    window.history.replaceState(
      { nextInternal: 'kept' },
      '',
      '/dashboard/watches?watch=7&from=notification#results',
    );
  });

  it('marks both history entries and opens the saved-watch settings section', () => {
    const replaceState = jest.spyOn(window.history, 'replaceState');
    const setActiveRightItem = jest.fn();
    const openDesktopSettings = jest.fn((returnTarget: DesktopSettingsReturnTarget | null) => {
      if (!returnTarget) return;
      window.history.pushState(
        withDesktopSettingsHistory(window.history.state, returnTarget),
        '',
        '/dashboard/settings',
      );
    });
    const { result } = renderHook(() => useOfferWatchResultsNavigation({
      activeModule: 'watches',
      openDesktopSettings,
      setActiveRightItem,
    }));

    act(() => result.current());

    const originState = replaceState.mock.calls[0]?.[0];
    const expectedTarget = {
      moduleId: 'watches',
      url: '/dashboard/watches?watch=7&from=notification#results',
    };
    expect(readDesktopSettingsOriginTarget(originState)).toEqual(expectedTarget);
    expect(readDesktopSettingsReturnTarget(window.history.state)).toEqual(expectedTarget);
    expect(window.history.state.nextInternal).toBe('kept');
    expect(window.location.pathname).toBe('/dashboard/settings/watches');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    expect(openDesktopSettings).toHaveBeenCalledWith(expectedTarget);
    expect(setActiveRightItem).toHaveBeenCalledWith('offer-watches');

    replaceState.mockRestore();
  });

  it('opens the existing mobile watch manager without desktop history changes', () => {
    setMobileViewport(true);
    const openDesktopSettings = jest.fn();
    const setActiveRightItem = jest.fn();
    const initialUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const { result } = renderHook(() => useOfferWatchResultsNavigation({
      activeModule: 'watches',
      openDesktopSettings,
      setActiveRightItem,
    }));

    act(() => result.current());

    expect(mockRequestOfferWatchMobile).toHaveBeenCalledTimes(1);
    expect(mockRequestOfferWatchMobile).toHaveBeenCalledWith('results');
    expect(openDesktopSettings).not.toHaveBeenCalled();
    expect(setActiveRightItem).not.toHaveBeenCalled();
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(initialUrl);
  });

  it('does not alter history when no supported desktop return target exists', () => {
    const initialUrl = window.location.href;
    const openDesktopSettings = jest.fn();
    const setActiveRightItem = jest.fn();
    const { result } = renderHook(() => useOfferWatchResultsNavigation({
      activeModule: 'unknown-module', openDesktopSettings, setActiveRightItem,
    }));
    act(() => result.current());
    expect(openDesktopSettings).not.toHaveBeenCalled();
    expect(setActiveRightItem).not.toHaveBeenCalled();
    expect(window.location.href).toBe(initialUrl);
  });

  it('uses innerWidth for mobile navigation when matchMedia is unavailable', () => {
    const originalMedia = window.matchMedia;
    const originalWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')!;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    try {
      const { result } = renderHook(() => useOfferWatchResultsNavigation({
        activeModule: 'watches', openDesktopSettings: jest.fn(), setActiveRightItem: jest.fn(),
      }));
      act(() => result.current());
      expect(mockRequestOfferWatchMobile).toHaveBeenCalledWith('results');
    } finally {
      window.matchMedia = originalMedia;
      Object.defineProperty(window, 'innerWidth', originalWidth);
    }
  });
});

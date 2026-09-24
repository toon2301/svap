import { act, renderHook } from '@testing-library/react';
import {
  readDesktopSettingsOriginTarget,
  readDesktopSettingsReturnTarget,
  withDesktopSettingsHistory,
  type DesktopSettingsReturnTarget,
} from '../../../hooks/desktopSettingsNavigation';
import { useOfferWatchResultsNavigation } from './offerWatchResultsNavigation';

describe('useOfferWatchResultsNavigation', () => {
  beforeEach(() => {
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
});

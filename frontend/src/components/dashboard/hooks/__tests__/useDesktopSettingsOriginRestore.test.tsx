import { act, renderHook, waitFor } from '@testing-library/react';
import {
  withDesktopSettingsOriginHistory,
  type DesktopSettingsReturnTarget,
} from '../desktopSettingsNavigation';
import { useDesktopSettingsOriginRestore } from '../useDesktopSettingsOriginRestore';

function renderRestoreHook() {
  const actions = {
    setActiveModule: jest.fn(),
    setIsRightSidebarOpen: jest.fn(),
    setActiveRightItem: jest.fn(),
    setIsMobileMenuOpen: jest.fn(),
    setIsSearchOpen: jest.fn(),
  };
  const view = renderHook(() => useDesktopSettingsOriginRestore(actions));
  return { ...view, actions };
}

function dispatchOriginPop(target: DesktopSettingsReturnTarget) {
  window.history.replaceState(
    withDesktopSettingsOriginHistory(window.history.state, target),
    '',
    target.url,
  );
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}

describe('useDesktopSettingsOriginRestore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    window.localStorage.clear();
    window.history.replaceState(null, '', '/dashboard');
  });

  it('restores a portfolio detail after competing popstate state changes', async () => {
    const { actions } = renderRestoreHook();
    const target = {
      moduleId: 'portfolio-detail',
      url: '/dashboard/users/anton/portfolio/42',
    };

    act(() => {
      dispatchOriginPop(target);
      actions.setActiveModule('profile');
    });

    await waitFor(() => {
      expect(actions.setActiveModule).toHaveBeenLastCalledWith('portfolio-detail');
    });
    expect(actions.setIsRightSidebarOpen).toHaveBeenLastCalledWith(false);
    expect(actions.setActiveRightItem).toHaveBeenLastCalledWith('');
    expect(actions.setIsMobileMenuOpen).toHaveBeenLastCalledWith(false);
    expect(actions.setIsSearchOpen).toHaveBeenLastCalledWith(false);
    expect(window.localStorage.getItem('activeModule')).toBe('portfolio-detail');
  });

  it('restores the nested module on mount after a Next.js route remount', async () => {
    const target = {
      moduleId: 'skills',
      url: '/dashboard/skills',
    };
    window.history.replaceState(
      withDesktopSettingsOriginHistory(null, target),
      '',
      target.url,
    );

    const { actions } = renderRestoreHook();

    await waitFor(() => {
      expect(actions.setActiveModule).toHaveBeenCalledWith('skills');
    });
    expect(window.localStorage.getItem('activeModule')).toBe('skills');
  });

  it('ignores stale markers whose saved URL is not the current history URL', () => {
    const { actions } = renderRestoreHook();
    const target = {
      moduleId: 'skills',
      url: '/dashboard/skills',
    };
    const markedState = withDesktopSettingsOriginHistory(null, target);

    act(() => {
      window.history.replaceState(markedState, '', '/dashboard/messages');
      window.dispatchEvent(new PopStateEvent('popstate', { state: markedState }));
    });

    expect(actions.setActiveModule).not.toHaveBeenCalled();
  });

  it('does not run the desktop restorer on a mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const { actions } = renderRestoreHook();

    act(() => {
      dispatchOriginPop({ moduleId: 'skills', url: '/dashboard/skills' });
    });

    expect(actions.setActiveModule).not.toHaveBeenCalled();
  });
});

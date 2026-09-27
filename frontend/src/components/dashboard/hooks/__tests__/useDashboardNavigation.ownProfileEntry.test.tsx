/**
 * Vstup do vlastného profilu ikonou nesmie niesť stav cudzieho profilu.
 *
 * `viewedUserId` / `viewedUserSlug` zo staršieho vstupu na cudzí (alebo
 * vlastný-ako-cudzí) profil kedysi prežili klik na ikonu profilu – vlastný
 * profil potom bežal s ID, ktoré k nemu nepatrilo (Nález 1, mapovanie A+B).
 */

import { renderHook } from '@testing-library/react';
import { act } from 'react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../../modules/profile/profileUserCache', () => ({
  primeUserSlugId: jest.fn(),
}));

import { useDashboardNavigation } from '../useDashboardNavigation';

function renderNavigation(user: unknown = { id: 1, slug: 'me' }) {
  const setViewedUserId = jest.fn();
  const setViewedUserSlug = jest.fn();
  const dashboardState = {
    activeModule: 'home',
    setActiveModule: jest.fn(),
    setIsRightSidebarOpen: jest.fn(),
    setActiveRightItem: jest.fn(),
    setIsMobileMenuOpen: jest.fn(),
    setIsNotificationsPanelOpen: jest.fn(),
    openDesktopSettings: jest.fn(),
    closeDesktopSettings: jest.fn(),
    handleModuleChange: jest.fn(),
  } as never;

  const hook = renderHook(() =>
    useDashboardNavigation({
      user: user as never,
      dashboardState,
      setIsSearchOpen: jest.fn(),
      setViewedUserId,
      setViewedUserSlug,
      setViewedUserSummary: jest.fn(),
      setHighlightedSkillId: jest.fn(),
      highlightTimeoutRef: { current: null },
    }),
  );
  return { ...hook, setViewedUserId, setViewedUserSlug };
}

beforeEach(() => {
  window.history.replaceState(null, '', '/dashboard');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
});

describe('ikona profilu', () => {
  it('mobile profile icon clears the viewed (foreign) profile', () => {
    const { result, setViewedUserId, setViewedUserSlug } = renderNavigation();

    act(() => result.current.handleMobileProfileClick());

    expect(setViewedUserId).toHaveBeenCalledWith(null);
    expect(setViewedUserSlug).toHaveBeenCalledWith(null);
  });

  it('desktop "Profil" in the sidebar clears it as well', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    const { result, setViewedUserId, setViewedUserSlug } = renderNavigation();

    act(() => result.current.handleMainModuleChange('profile'));

    expect(setViewedUserId).toHaveBeenCalledWith(null);
    expect(setViewedUserSlug).toHaveBeenCalledWith(null);
  });

  it('keeps it when the switch cannot happen (no identifier)', () => {
    const { result, setViewedUserId, setViewedUserSlug } = renderNavigation({ id: null, slug: null });

    act(() => result.current.handleMobileProfileClick());
    act(() => result.current.handleMainModuleChange('profile'));

    expect(setViewedUserId).not.toHaveBeenCalled();
    expect(setViewedUserSlug).not.toHaveBeenCalled();
  });

  it('other sections leave it alone', () => {
    const { result, setViewedUserId, setViewedUserSlug } = renderNavigation();

    act(() => result.current.handleMainModuleChange('home'));

    expect(setViewedUserId).not.toHaveBeenCalled();
    expect(setViewedUserSlug).not.toHaveBeenCalled();
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/types';
import { useDashboardState } from '../useDashboardState';
import {
  useDashboardNavigation,
  profileIdentifier,
} from '../useDashboardNavigation';
import {
  readDesktopSettingsReturnTarget,
  withDesktopSettingsHistory,
} from '../desktopSettingsNavigation';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRefreshUser = jest.fn();
const mockLogout = jest.fn();
const mockUpdateUser = jest.fn();
const mockInvalidateSearchCacheForUser = jest.fn();
const mockSetUserProfileToCache = jest.fn();
let mockAuthUser: User | null = null;
let mockAuthLoading = false;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: mockAuthLoading,
    refreshUser: mockRefreshUser,
    logout: mockLogout,
    updateUser: mockUpdateUser,
  }),
}));

jest.mock('../../modules/SearchModule', () => ({
  invalidateSearchCacheForUser: (...args: unknown[]) => mockInvalidateSearchCacheForUser(...args),
}));

jest.mock('../../modules/profile/profileUserCache', () => ({
  setUserProfileToCache: (...args: unknown[]) => mockSetUserProfileToCache(...args),
}));

const baseUser: User = {
  id: 7,
  username: 'tester',
  email: 'tester@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'test-user',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
};

describe('profile edit navigation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    localStorage.clear();
    sessionStorage.clear();
    mockAuthUser = null;
    mockAuthLoading = false;
    window.history.replaceState(null, '', '/dashboard/users/test-user');
  });

  it('uses the existing auth user without triggering a duplicate auth refresh on mount', async () => {
    mockAuthUser = baseUser;

    const { result } = renderHook(() => useDashboardState(undefined, 'home'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.id).toBe(baseUser.id);
    expect(mockRefreshUser).not.toHaveBeenCalled();

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.id).toBe(baseUser.id);
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('waits for auth bootstrap to resolve before redirecting without an authenticated user', async () => {
    mockAuthLoading = true;

    const { result, rerender } = renderHook(() => useDashboardState(undefined, 'home'));

    expect(result.current.isLoading).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefreshUser).not.toHaveBeenCalled();

    mockAuthLoading = false;
    rerender();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('opens and cleanly closes own profile edit with synchronized URL', () => {
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useDashboardState(baseUser, 'profile'));

    act(() => {
      result.current.openOwnProfileEdit();
    });

    expect(result.current.activeModule).toBe('profile');
    expect(result.current.isRightSidebarOpen).toBe(true);
    expect(result.current.activeRightItem).toBe('edit-profile');
    expect(pushStateSpy).toHaveBeenLastCalledWith(null, '', '/dashboard/users/test-user/edit');

    act(() => {
      result.current.closeOwnProfileEdit({ ...baseUser, slug: 'updated-user' });
    });

    expect(result.current.activeModule).toBe('profile');
    expect(result.current.isRightSidebarOpen).toBe(false);
    expect(result.current.activeRightItem).toBe('');
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, '', '/dashboard/users/updated-user');

    pushStateSpy.mockRestore();
    replaceStateSpy.mockRestore();
  });

  it('preserves edit sidebar state during handleUserUpdate while editing', () => {
    const { result } = renderHook(() => useDashboardState(baseUser, 'profile'));

    act(() => {
      result.current.openOwnProfileEdit();
    });

    act(() => {
      result.current.handleUserUpdate({ ...baseUser, first_name: 'Updated' });
    });

    expect(result.current.activeModule).toBe('profile');
    expect(result.current.isRightSidebarOpen).toBe(true);
    expect(result.current.activeRightItem).toBe('edit-profile');
  });

  it('keeps sidebar closed after handleUserUpdate when edit mode was cleanly closed', () => {
    const { result } = renderHook(() => useDashboardState(baseUser, 'profile'));

    act(() => {
      result.current.closeOwnProfileEdit();
    });

    act(() => {
      result.current.handleUserUpdate({ ...baseUser, last_name: 'Updated' });
    });

    expect(result.current.activeModule).toBe('profile');
    expect(result.current.isRightSidebarOpen).toBe(false);
    expect(result.current.activeRightItem).toBe('');
  });

  it('opens desktop settings on edit profile and keeps the origin across sections', () => {
    window.history.replaceState(null, '', '/dashboard/messages/42?focus=latest');
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const { result } = renderHook(() => useDashboardState(baseUser, 'messages'));

    act(() => {
      result.current.openDesktopSettings({
        moduleId: 'messages',
        url: '/dashboard/messages/42?focus=latest',
      });
    });

    expect(result.current.activeModule).toBe('settings');
    expect(result.current.isRightSidebarOpen).toBe(true);
    expect(result.current.activeRightItem).toBe('edit-profile');
    expect(window.location.pathname).toBe('/dashboard/settings');
    expect(readDesktopSettingsReturnTarget(window.history.state)).toEqual({
      moduleId: 'messages',
      url: '/dashboard/messages/42?focus=latest',
    });

    act(() => {
      result.current.handleRightItemClick('language');
    });

    expect(result.current.activeModule).toBe('settings');
    expect(result.current.activeRightItem).toBe('language');
    expect(window.location.pathname).toBe('/dashboard/language');

    act(() => {
      result.current.closeOwnProfileEdit();
    });

    expect(result.current.activeModule).toBe('messages');
    expect(result.current.isRightSidebarOpen).toBe(false);
    expect(result.current.activeRightItem).toBe('');
    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });

  it('falls back to the own profile when settings were opened directly', async () => {
    window.history.replaceState(null, '', '/dashboard/settings');
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useDashboardState(baseUser, 'settings'));

    await waitFor(() => {
      expect(result.current.isRightSidebarOpen).toBe(true);
      expect(result.current.activeRightItem).toBe('edit-profile');
    });

    act(() => {
      result.current.closeOwnProfileEdit({ ...baseUser, slug: 'saved-user' });
    });

    expect(result.current.activeModule).toBe('profile');
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      expect.any(Object),
      '',
      '/dashboard/users/saved-user',
    );
    replaceStateSpy.mockRestore();
  });

  it('restores the desktop settings context and selected section after refresh', async () => {
    const historyState = withDesktopSettingsHistory(null, {
      moduleId: 'requests',
      url: '/dashboard/requests',
    });
    window.history.replaceState(historyState, '', '/dashboard/settings/account');

    const { result } = renderHook(() =>
      useDashboardState(baseUser, 'account-settings'),
    );

    await waitFor(() => {
      expect(result.current.activeModule).toBe('settings');
      expect(result.current.isRightSidebarOpen).toBe(true);
      expect(result.current.activeRightItem).toBe('account-settings');
    });
  });

  it('routes desktop sidebar close for edit mode through the explicit close action', () => {
    const openOwnProfileEdit = jest.fn();
    const closeOwnProfileEdit = jest.fn();
    const setActiveModule = jest.fn();
    const setIsRightSidebarOpen = jest.fn();
    const setActiveRightItem = jest.fn();
    const handleModuleChange = jest.fn();
    const setIsMobileMenuOpen = jest.fn();
    const setIsSearchOpen = jest.fn();
    const setViewedUserId = jest.fn();
    const setViewedUserSlug = jest.fn();
    const setViewedUserSummary = jest.fn();
    const setHighlightedSkillId = jest.fn();
    const highlightTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    const dashboardState = {
      activeModule: 'profile',
      activeRightItem: 'edit-profile',
      setActiveModule,
      setIsRightSidebarOpen,
      setActiveRightItem,
      openOwnProfileEdit,
      closeOwnProfileEdit,
      handleModuleChange,
      setIsMobileMenuOpen,
    } as unknown as ReturnType<typeof useDashboardState>;

    const { result } = renderHook(() =>
      useDashboardNavigation({
        user: baseUser,
        dashboardState,
        setIsSearchOpen,
        setViewedUserId,
        setViewedUserSlug,
        setViewedUserSummary,
        setHighlightedSkillId,
        highlightTimeoutRef,
      })
    );

    act(() => {
      result.current.handleEditProfileClick();
    });

    expect(openOwnProfileEdit).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleRightSidebarClose();
    });

    expect(closeOwnProfileEdit).toHaveBeenCalledTimes(1);
    expect(setIsRightSidebarOpen).not.toHaveBeenCalled();
    expect(setActiveRightItem).not.toHaveBeenCalled();
  });

  it('captures the current full module before opening desktop settings', () => {
    const openDesktopSettings = jest.fn();
    const handleModuleChange = jest.fn();
    const setIsSearchOpen = jest.fn();
    const dashboardState = {
      activeModule: 'messages',
      activeRightItem: '',
      setActiveModule: jest.fn(),
      setIsRightSidebarOpen: jest.fn(),
      setActiveRightItem: jest.fn(),
      openOwnProfileEdit: jest.fn(),
      openDesktopSettings,
      closeOwnProfileEdit: jest.fn(),
      handleModuleChange,
      setIsMobileMenuOpen: jest.fn(),
    } as unknown as ReturnType<typeof useDashboardState>;
    window.history.replaceState(null, '', '/dashboard/messages/55?focus=latest');

    const { result } = renderHook(() =>
      useDashboardNavigation({
        user: baseUser,
        dashboardState,
        setIsSearchOpen,
        setViewedUserId: jest.fn(),
        setViewedUserSlug: jest.fn(),
        setViewedUserSummary: jest.fn(),
        setHighlightedSkillId: jest.fn(),
        highlightTimeoutRef: { current: null },
      }),
    );

    act(() => {
      result.current.handleMainModuleChange('settings');
    });

    expect(openDesktopSettings).toHaveBeenCalledWith({
      moduleId: 'messages',
      url: '/dashboard/messages/55?focus=latest',
    });
    expect(setIsSearchOpen).toHaveBeenCalledWith(false);
    expect(handleModuleChange).not.toHaveBeenCalled();
  });

  it('opens Statistics as a dedicated desktop window and route', () => {
    const setActiveModule = jest.fn();
    const setIsRightSidebarOpen = jest.fn();
    const setActiveRightItem = jest.fn();
    const setIsMobileMenuOpen = jest.fn();
    const handleModuleChange = jest.fn();
    const dashboardState = {
      activeModule: 'home',
      activeRightItem: '',
      setActiveModule,
      setIsRightSidebarOpen,
      setActiveRightItem,
      openOwnProfileEdit: jest.fn(),
      openDesktopSettings: jest.fn(),
      closeOwnProfileEdit: jest.fn(),
      handleModuleChange,
      setIsMobileMenuOpen,
    } as unknown as ReturnType<typeof useDashboardState>;

    const { result } = renderHook(() =>
      useDashboardNavigation({
        user: baseUser,
        dashboardState,
        setIsSearchOpen: jest.fn(),
        setViewedUserId: jest.fn(),
        setViewedUserSlug: jest.fn(),
        setViewedUserSummary: jest.fn(),
        setHighlightedSkillId: jest.fn(),
        highlightTimeoutRef: { current: null },
      }),
    );

    act(() => {
      result.current.handleMainModuleChange('statistics');
    });

    expect(setActiveModule).toHaveBeenCalledWith('statistics');
    expect(setIsRightSidebarOpen).toHaveBeenCalledWith(false);
    expect(setActiveRightItem).toHaveBeenCalledWith('');
    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);
    expect(localStorage.getItem('activeModule')).toBe('statistics');
    expect(mockPush).toHaveBeenCalledWith('/dashboard/statistics');
    expect(handleModuleChange).not.toHaveBeenCalled();
  });

  it('opens and closes the mobile Statistics screen without a full module fallback', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const setActiveModule = jest.fn();
    const setIsRightSidebarOpen = jest.fn();
    const setActiveRightItem = jest.fn();
    const setIsMobileMenuOpen = jest.fn();
    const handleModuleChange = jest.fn();
    const dashboardState = {
      activeModule: 'profile',
      activeRightItem: '',
      setActiveModule,
      setIsRightSidebarOpen,
      setActiveRightItem,
      openOwnProfileEdit: jest.fn(),
      openDesktopSettings: jest.fn(),
      closeOwnProfileEdit: jest.fn(),
      handleModuleChange,
      setIsMobileMenuOpen,
    } as unknown as ReturnType<typeof useDashboardState>;

    const { result, rerender } = renderHook(
      ({ state }) =>
        useDashboardNavigation({
          user: baseUser,
          dashboardState: state,
          setIsSearchOpen: jest.fn(),
          setViewedUserId: jest.fn(),
          setViewedUserSlug: jest.fn(),
          setViewedUserSummary: jest.fn(),
          setHighlightedSkillId: jest.fn(),
          highlightTimeoutRef: { current: null },
        }),
      { initialProps: { state: dashboardState } },
    );

    act(() => {
      result.current.handleMainModuleChange('statistics');
    });

    expect(setActiveModule).toHaveBeenCalledWith('statistics');
    expect(window.location.pathname).toBe('/dashboard/statistics');
    expect(mockPush).not.toHaveBeenCalled();
    expect(handleModuleChange).not.toHaveBeenCalled();

    rerender({
      state: {
        ...dashboardState,
        activeModule: 'statistics',
      } as unknown as ReturnType<typeof useDashboardState>,
    });

    act(() => {
      result.current.handleMainModuleChange('profile');
    });

    expect(setActiveModule).toHaveBeenCalledWith('profile');
    expect(window.location.pathname).toBe('/dashboard/users/test-user');
    expect(handleModuleChange).not.toHaveBeenCalled();
  });

  it('keeps the existing settings navigation on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const openDesktopSettings = jest.fn();
    const handleModuleChange = jest.fn();
    const dashboardState = {
      activeModule: 'messages',
      activeRightItem: '',
      setActiveModule: jest.fn(),
      setIsRightSidebarOpen: jest.fn(),
      setActiveRightItem: jest.fn(),
      openOwnProfileEdit: jest.fn(),
      openDesktopSettings,
      closeOwnProfileEdit: jest.fn(),
      handleModuleChange,
      setIsMobileMenuOpen: jest.fn(),
    } as unknown as ReturnType<typeof useDashboardState>;

    const { result } = renderHook(() =>
      useDashboardNavigation({
        user: baseUser,
        dashboardState,
        setIsSearchOpen: jest.fn(),
        setViewedUserId: jest.fn(),
        setViewedUserSlug: jest.fn(),
        setViewedUserSummary: jest.fn(),
        setHighlightedSkillId: jest.fn(),
        highlightTimeoutRef: { current: null },
      }),
    );

    act(() => {
      result.current.handleMainModuleChange('settings');
    });

    expect(openDesktopSettings).not.toHaveBeenCalled();
    expect(handleModuleChange).toHaveBeenCalledWith('settings');
    expect(window.location.pathname).toBe('/dashboard/settings');
  });

  // --- Null-safe profil identifikátor (žiadny sentinel "profile"): navigáciu
  //     odlož, kým nie je platný slug/id. ---

  function navState(
    overrides: Partial<ReturnType<typeof useDashboardState>> = {},
  ) {
    return {
      activeModule: 'home',
      activeRightItem: '',
      setActiveModule: jest.fn(),
      setIsRightSidebarOpen: jest.fn(),
      setActiveRightItem: jest.fn(),
      openOwnProfileEdit: jest.fn(),
      openDesktopSettings: jest.fn(),
      closeOwnProfileEdit: jest.fn(),
      handleModuleChange: jest.fn(),
      setIsMobileMenuOpen: jest.fn(),
      ...overrides,
    } as unknown as ReturnType<typeof useDashboardState>;
  }

  function renderNav(
    user: User | null,
    dashboardState: ReturnType<typeof useDashboardState>,
  ) {
    return renderHook(() =>
      useDashboardNavigation({
        user,
        dashboardState,
        setIsSearchOpen: jest.fn(),
        setViewedUserId: jest.fn(),
        setViewedUserSlug: jest.fn(),
        setViewedUserSummary: jest.fn(),
        setHighlightedSkillId: jest.fn(),
        highlightTimeoutRef: { current: null },
      }),
    );
  }

  it('profileIdentifier returns null without a usable slug/id', () => {
    expect(profileIdentifier(undefined)).toBeNull();
    expect(profileIdentifier(null)).toBeNull();
    expect(profileIdentifier({} as User)).toBeNull();
    expect(
      profileIdentifier({ slug: '', id: undefined } as unknown as User),
    ).toBeNull();
  });

  it('profileIdentifier prefers slug, then numeric id (happy path)', () => {
    expect(profileIdentifier(baseUser)).toBe('test-user');
    expect(profileIdentifier({ ...baseUser, slug: null } as User)).toBe('7');
  });

  it('general profile branch defers navigation when identifier is null', () => {
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    const handleModuleChange = jest.fn();
    const { result } = renderNav(null, navState({ handleModuleChange }));

    act(() => {
      result.current.handleMainModuleChange('profile');
    });

    // Bez platného slug/id → žiadna navigácia (ani URL, ani prepnutie modulu).
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(handleModuleChange).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    pushStateSpy.mockRestore();
  });

  it('statistics→profile branch defers navigation when identifier is null (mobile)', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    const setActiveModule = jest.fn();
    const { result } = renderNav(
      null,
      navState({ activeModule: 'statistics', setActiveModule }),
    );

    act(() => {
      result.current.handleMainModuleChange('profile');
    });

    expect(setActiveModule).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalledWith(
      null,
      '',
      expect.stringContaining('/dashboard/users/'),
    );
    replaceStateSpy.mockRestore();
  });

  it('handleMobileProfileClick defers navigation for a user without slug/id', () => {
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    const setActiveModule = jest.fn();
    const userNoIdentity = { username: 'x' } as unknown as User; // bez slug aj id
    const { result } = renderNav(userNoIdentity, navState({ setActiveModule }));

    act(() => {
      result.current.handleMobileProfileClick();
    });

    expect(setActiveModule).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalledWith(
      null,
      '',
      expect.stringContaining('/dashboard/users/'),
    );
    pushStateSpy.mockRestore();
  });

  it('general profile branch still navigates for a valid user (happy path unchanged)', () => {
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    const handleModuleChange = jest.fn();
    const { result } = renderNav(baseUser, navState({ handleModuleChange }));

    act(() => {
      result.current.handleMainModuleChange('profile');
    });

    expect(pushStateSpy).toHaveBeenLastCalledWith(
      null,
      '',
      '/dashboard/users/test-user',
    );
    expect(handleModuleChange).toHaveBeenCalledWith('profile');
    pushStateSpy.mockRestore();
  });
});

describe('offer watches from outside settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    localStorage.clear();
    sessionStorage.clear();
    mockAuthUser = baseUser;
    mockAuthLoading = false;
    window.history.replaceState(null, '', '/dashboard/users/test-user');
  });

  it('moves the module and the URL to the watches section, not just the panel', () => {
    const { result } = renderHook(() => useDashboardState(baseUser, 'profile'));

    act(() => {
      result.current.handleRightItemClick('offer-watches');
    });

    // Obsah sa vykresľuje podľa `activeRightItem`…
    expect(result.current.activeRightItem).toBe('offer-watches');
    expect(result.current.isRightSidebarOpen).toBe(true);
    // …a adresa aj modul mu teraz zodpovedajú, takže refresh vráti sledované
    // ponuky, nie úpravu profilu.
    expect(result.current.activeModule).toBe('settings');
    expect(window.location.pathname).toBe('/dashboard/settings/watches');
    expect(localStorage.getItem('activeModule')).toBe('settings');
  });

  it('still uses the settings path when clicked from inside settings', () => {
    const { result } = renderHook(() => useDashboardState(baseUser, 'settings'));

    act(() => {
      result.current.handleRightItemClick('offer-watches');
    });

    expect(result.current.activeModule).toBe('settings');
    expect(window.location.pathname).toBe('/dashboard/settings/watches');
  });
});

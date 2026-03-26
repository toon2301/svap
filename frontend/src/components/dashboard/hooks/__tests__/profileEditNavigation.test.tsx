import { act, renderHook } from '@testing-library/react';
import type { User } from '@/types';
import { useDashboardState } from '../useDashboardState';
import { useDashboardNavigation } from '../useDashboardNavigation';

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
    localStorage.clear();
    sessionStorage.clear();
    mockAuthUser = null;
    mockAuthLoading = false;
    window.history.replaceState(null, '', '/dashboard/users/test-user');
  });

  it('uses the existing auth user without triggering a duplicate auth refresh on mount', async () => {
    mockAuthUser = baseUser;

    const { result } = renderHook(() => useDashboardState(undefined, 'home'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.id).toBe(baseUser.id);
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
        isSearchOpen: false,
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
});

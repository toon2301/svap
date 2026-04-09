import { renderHook } from '@testing-library/react';
import type { User } from '@/types';
import { useDashboardUserProfile } from '../useDashboardUserProfile';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: {
    dashboard: {
      userProfileBySlug: (slug: string) => `/dashboard/users/by-slug/${slug}`,
      userProfile: (id: number) => `/dashboard/users/${id}`,
    },
  },
}));

jest.mock('../../modules/profile/profileUserCache', () => ({
  getUserIdBySlug: jest.fn(() => null),
  getUserProfileFromCache: jest.fn(() => null),
  setUserProfileToCache: jest.fn(),
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

describe('useDashboardUserProfile', () => {
  it('re-applies own profile sidebar route state when initialRightItem changes without remount', () => {
    const setActiveModule = jest.fn();
    const setIsRightSidebarOpen = jest.fn();
    const setActiveRightItem = jest.fn();
    const setHighlightedSkillId = jest.fn();

    const dashboardState = {
      setActiveModule,
      setIsRightSidebarOpen,
      setActiveRightItem,
      isRightSidebarOpen: false,
      activeRightItem: '',
    } as any;

    const { rerender } = renderHook(
      ({ initialRightItem }) =>
        useDashboardUserProfile({
          user: baseUser,
          activeModule: 'profile',
          dashboardState,
          initialProfileSlug: 'test-user',
          initialRightItem,
          setHighlightedSkillId,
        }),
      { initialProps: { initialRightItem: null as string | null } },
    );

    jest.clearAllMocks();

    expect(setActiveModule).not.toHaveBeenCalled();
    expect(setIsRightSidebarOpen).not.toHaveBeenCalled();
    expect(setActiveRightItem).not.toHaveBeenCalled();

    rerender({ initialRightItem: 'edit-profile' });

    expect(setActiveModule).toHaveBeenCalledWith('profile');
    expect(setIsRightSidebarOpen).toHaveBeenCalledWith(true);
    expect(setActiveRightItem).toHaveBeenCalledWith('edit-profile');
  });
});

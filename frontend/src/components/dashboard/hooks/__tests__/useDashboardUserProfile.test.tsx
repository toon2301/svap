import { renderHook, waitFor } from '@testing-library/react';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: {
    dashboard: {
      userProfileBySlug: (slug: string) => `/profile/slug/${slug}`,
      userProfile: (id: number) => `/profile/${id}`,
    },
  },
}));
jest.mock('../../modules/profile/profileUserCache', () => ({
  getUserIdBySlug: () => null,
  getUserProfileFromCache: () => null,
  setUserProfileToCache: jest.fn(),
}));

import { api } from '@/lib/api';
import { useDashboardUserProfile } from '../useDashboardUserProfile';

// Stabilné referencie – inak by sa hook params menili pri každom renderi
// a efekty by sa zbytočne re-spúšťali (resetovali by 404 stav).
const dashboardState = {
  setActiveModule: jest.fn(),
  setIsRightSidebarOpen: jest.fn(),
  setActiveRightItem: jest.fn(),
  isRightSidebarOpen: false,
  activeRightItem: '',
} as any;
const stableUser = { id: 1 } as any;
const setHighlightedSkillId = jest.fn();

describe('useDashboardUserProfile – 404 handling (BOD 12a)', () => {
  beforeEach(() => (api.get as jest.Mock).mockReset());

  it('nastaví viewedUserNotFound=true keď slug profil neexistuje (404)', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });

    const { result } = renderHook(() =>
      useDashboardUserProfile({
        user: stableUser,
        activeModule: 'user-profile',
        dashboardState,
        initialProfileSlug: 'ghost-user',
        setHighlightedSkillId,
      }),
    );

    await waitFor(() => expect(result.current.viewedUserNotFound).toBe(true));
    expect(result.current.viewedUserId).toBeNull();
  });

  it('pri úspešnom načítaní ostane viewedUserNotFound=false a nastaví ID', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { id: 42, slug: 'real-user' } });

    const { result } = renderHook(() =>
      useDashboardUserProfile({
        user: stableUser,
        activeModule: 'user-profile',
        dashboardState,
        initialProfileSlug: 'real-user',
        setHighlightedSkillId,
      }),
    );

    await waitFor(() => expect(result.current.viewedUserId).toBe(42));
    expect(result.current.viewedUserNotFound).toBe(false);
  });
});

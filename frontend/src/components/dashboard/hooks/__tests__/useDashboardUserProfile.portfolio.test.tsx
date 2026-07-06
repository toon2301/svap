import { renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/types';
import type { UseDashboardStateResult } from '../useDashboardState';

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

type DashboardStateMock = UseDashboardStateResult & {
  setActiveModule: jest.Mock;
};

function dashboardState(): DashboardStateMock {
  return {
    setActiveModule: jest.fn(),
    setIsRightSidebarOpen: jest.fn(),
    setActiveRightItem: jest.fn(),
    isRightSidebarOpen: false,
    activeRightItem: '',
  } as unknown as DashboardStateMock;
}

const ownUser = { id: 1, slug: 'moj-profil' } as unknown as User;
const setHighlightedSkillId = jest.fn();

describe('useDashboardUserProfile portfolio routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: { id: 1, slug: 'moj-profil' } });
  });

  it('neprepne vlastny portfolio detail na profile pri reloade', async () => {
    const state = dashboardState();

    const { result } = renderHook(() =>
      useDashboardUserProfile({
        user: ownUser,
        activeModule: 'portfolio-detail',
        dashboardState: state,
        initialProfileSlug: 'moj-profil',
        setHighlightedSkillId,
      }),
    );

    await waitFor(() => expect(result.current.viewedUserId).toBe(1));
    expect(api.get).toHaveBeenCalledWith('/profile/slug/moj-profil');
    expect(state.setActiveModule).not.toHaveBeenCalledWith('profile');
  });

  it('stale prepne vlastny bezny user profil na profile modul', async () => {
    const state = dashboardState();

    const { result } = renderHook(() =>
      useDashboardUserProfile({
        user: ownUser,
        activeModule: 'user-profile',
        dashboardState: state,
        initialProfileSlug: 'moj-profil',
        setHighlightedSkillId,
      }),
    );

    await waitFor(() => expect(result.current.viewedUserId).toBe(1));
    expect(state.setActiveModule).toHaveBeenCalledWith('profile');
  });
});
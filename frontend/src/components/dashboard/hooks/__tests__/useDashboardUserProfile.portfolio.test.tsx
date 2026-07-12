import { act, renderHook, waitFor } from '@testing-library/react';
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

  // Regresia: Profil -> Portfolio -> Profil (popstate na /dashboard/users/[slug]) nechal
  // viewedUserSlug set + viewedUserId null bez remountu => trvalé "Načítavam profil...".
  it('rozlisi state-driven viewedUserSlug -> id (bez initialProfileSlug) pre cudzi profil', async () => {
    const state = dashboardState();
    (api.get as jest.Mock).mockResolvedValue({ data: { id: 7, slug: 'niekto' } });

    const { result } = renderHook(() =>
      useDashboardUserProfile({
        user: { id: 99, slug: 'ja' } as unknown as User,
        activeModule: 'user-profile',
        dashboardState: state,
        setHighlightedSkillId,
      }),
    );

    act(() => {
      result.current.setViewedUserSlug('niekto');
    });

    await waitFor(() => expect(result.current.viewedUserId).toBe(7));
    expect(api.get).toHaveBeenCalledWith('/profile/slug/niekto');
    expect(state.setActiveModule).not.toHaveBeenCalledWith('profile');
  });

  it('state-driven vlastny viewedUserSlug prepne na profile modul (nie stuck loading)', async () => {
    const state = dashboardState();

    const { result } = renderHook(() =>
      useDashboardUserProfile({
        user: ownUser,
        activeModule: 'user-profile',
        dashboardState: state,
        setHighlightedSkillId,
      }),
    );

    act(() => {
      result.current.setViewedUserSlug('moj-profil');
    });

    await waitFor(() => expect(state.setActiveModule).toHaveBeenCalledWith('profile'));
    expect(api.get).not.toHaveBeenCalled();
  });

  // Regresia: 404 pre jeden profil nesmie zablokovať načítanie ĎALŠIEHO profilu pri
  // popstate – stale `viewedUserNotFound` sa musí pri novom slugu vyresetovať.
  it('resetuje stale not-found pri state-driven zmene slugu po 404', async () => {
    const state = dashboardState();
    (api.get as jest.Mock)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { id: 5, slug: 'existuje' } });

    const { result } = renderHook(() =>
      useDashboardUserProfile({
        user: { id: 99, slug: 'ja' } as unknown as User,
        activeModule: 'user-profile',
        dashboardState: state,
        setHighlightedSkillId,
      }),
    );

    act(() => {
      result.current.setViewedUserSlug('neexistuje');
    });
    await waitFor(() => expect(result.current.viewedUserNotFound).toBe(true));
    expect(result.current.viewedUserId).toBeNull();

    act(() => {
      result.current.setViewedUserSlug('existuje');
    });
    await waitFor(() => expect(result.current.viewedUserId).toBe(5));
    expect(result.current.viewedUserNotFound).toBe(false);
    expect(api.get).toHaveBeenNthCalledWith(1, '/profile/slug/neexistuje');
    expect(api.get).toHaveBeenNthCalledWith(2, '/profile/slug/existuje');
  });
});
import { act, renderHook, waitFor } from '@testing-library/react';

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

describe('useDashboardUserProfile – vlastný slug vs. interaktívna navigácia (BUG #1)', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockReset();
    dashboardState.setActiveModule.mockClear();
  });

  it('prepne na vlastný profil pri vstupe na /dashboard/users/{vlastný-slug}', async () => {
    // Slug sa vyrieši na vlastné id → prezeráme vlastný profil.
    (api.get as jest.Mock).mockResolvedValue({ data: { id: 1, slug: 'me' } });
    const ownUser = { id: 1, slug: 'me' } as any;

    renderHook(() =>
      useDashboardUserProfile({
        user: ownUser,
        activeModule: 'user-profile',
        dashboardState,
        initialProfileSlug: 'me',
        setHighlightedSkillId,
      }),
    );

    await waitFor(() =>
      expect(dashboardState.setActiveModule).toHaveBeenCalledWith('profile'),
    );
  });

  it('NEprepne na vlastný profil keď je initialProfileSlug zamrznutý vlastný slug, ale interaktívne prezeráme iného používateľa', () => {
    // Mount na vlastnom profile (initialProfileSlug='me'), slug resolver "visí",
    // nech neprepíše viewedUserId.
    (api.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    const ownUser = { id: 1, slug: 'me' } as any;

    const { result, rerender } = renderHook(
      ({ activeModule }: { activeModule: string }) =>
        useDashboardUserProfile({
          user: ownUser,
          activeModule,
          dashboardState,
          initialProfileSlug: 'me',
          setHighlightedSkillId,
        }),
      { initialProps: { activeModule: 'profile' } },
    );

    // Klik vo vyhľadávaní na INÉHO používateľa: viewedUserId=42 + prechod na 'user-profile'.
    // (initialProfileSlug ostáva zamrznutý 'me', lebo pushState/router.push ho hneď nemení.)
    act(() => result.current.setViewedUserId(42));
    dashboardState.setActiveModule.mockClear();
    rerender({ activeModule: 'user-profile' });

    // Efekt NESMIE prepnúť späť na vlastný profil – prezeráme iného používateľa (42).
    expect(dashboardState.setActiveModule).not.toHaveBeenCalledWith('profile');
  });
});

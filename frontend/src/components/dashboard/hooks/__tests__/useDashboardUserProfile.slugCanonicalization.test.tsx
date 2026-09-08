/**
 * Kanonizácia `/dashboard/users/<id>` na `/dashboard/users/<slug>`.
 *
 * Adresa sa prepisuje pod bežiacou stránkou, takže smie vymeniť IBA
 * identifikátor v ceste. Query aj fragment patria tomu, na čo sa používateľ
 * práve pozerá – `?tab=` (aktívna záložka), `?offer=` a `?highlight=`
 * (preklik na konkrétnu ponuku) – a musia prejsť so sebou.
 *
 * Vlastný súbor, lebo potrebuje inú cache mock než ostatné testy hooku:
 * kanonizácia sa spustí až vtedy, keď je slug odkiaľ vziať.
 */

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
  // Slug z cache – práve on kanonizáciu spustí.
  getUserProfileFromCache: (id: number) =>
    id === 42 ? { id: 42, slug: 'peter' } : null,
  setUserProfileToCache: jest.fn(),
}));

import { useDashboardUserProfile } from '../useDashboardUserProfile';

const dashboardState = {
  setActiveModule: jest.fn(),
  setIsRightSidebarOpen: jest.fn(),
  setActiveRightItem: jest.fn(),
  isRightSidebarOpen: false,
  activeRightItem: '',
} as never;
const viewer = { id: 1, slug: 'me' } as never;
const setHighlightedSkillId = jest.fn();

function renderOnNumericProfileUrl(url: string) {
  window.history.replaceState(null, '', url);
  return renderHook(() =>
    useDashboardUserProfile({
      user: viewer,
      activeModule: 'user-profile',
      dashboardState,
      initialViewedUserId: 42,
      setHighlightedSkillId,
    }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('kanonizácia ID na slug', () => {
  it('carries the query and the fragment over', async () => {
    renderOnNumericProfileUrl('/dashboard/users/42?tab=posts#sekcia');

    await waitFor(() =>
      expect(window.location.pathname).toBe('/dashboard/users/peter'),
    );
    // Bez prenosu by tu po presmerovaní ostala holá cesta a aktívna záložka
    // (aj prípadný highlight) by ticho zmizli.
    expect(window.location.search).toBe('?tab=posts');
    expect(window.location.hash).toBe('#sekcia');
  });

  it('carries the offer highlight over', async () => {
    renderOnNumericProfileUrl('/dashboard/users/42?offer=55');

    await waitFor(() =>
      expect(window.location.pathname).toBe('/dashboard/users/peter'),
    );
    expect(window.location.search).toBe('?offer=55');
  });

  it('leaves a bare URL bare', async () => {
    renderOnNumericProfileUrl('/dashboard/users/42');

    await waitFor(() =>
      expect(window.location.pathname).toBe('/dashboard/users/peter'),
    );
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
  });
});

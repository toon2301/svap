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
import {
  readProfileOriginDepth,
  withProfileOriginEntry,
} from '../../modules/profile/profileOriginHistory';

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

  it('pôvod profilu v stave záznamu prežije', async () => {
    // Prepis mení LEN tvar adresy; štítky toho istého záznamu k nemu patria
    // ďalej. `null` ich mazal a keďže identita sa kanonizáciou nemení, marker
    // sa už nikdy nenastavil a appková šípka profil neopustila.
    window.history.replaceState(withProfileOriginEntry(null), '', '/dashboard/users/42');
    renderHook(() =>
      useDashboardUserProfile({
        user: viewer,
        activeModule: 'user-profile',
        dashboardState,
        initialViewedUserId: 42,
        setHighlightedSkillId,
      }),
    );

    await waitFor(() =>
      expect(window.location.pathname).toBe('/dashboard/users/peter'),
    );
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
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

describe('kanonizácia VLASTNÉHO profilu', () => {
  const owner = { id: 1, slug: 'me' } as never;

  function renderOwnProfile(url: string, editMode = false) {
    window.history.replaceState(null, '', url);
    const state = {
      setActiveModule: jest.fn(),
      setIsRightSidebarOpen: jest.fn(),
      setActiveRightItem: jest.fn(),
      isRightSidebarOpen: editMode,
      activeRightItem: editMode ? 'edit-profile' : '',
    } as never;
    return renderHook(() =>
      useDashboardUserProfile({
        // Vlastny profil sa vykresluje modulom `profile`, nie `user-profile` –
        // efekt kanonizacie sa spusta prave podla toho.
        user: owner,
        activeModule: 'profile',
        dashboardState: state,
        setHighlightedSkillId,
      }),
    );
  }

  it('carries the query and the fragment when swapping id for slug', async () => {
    renderOwnProfile('/dashboard/users/1?tab=posts#sekcia');

    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/me'));
    expect(window.location.search).toBe('?tab=posts');
    expect(window.location.hash).toBe('#sekcia');
  });

  it('carries them on the edit branch too', async () => {
    renderOwnProfile('/dashboard/users/1?tab=posts#sekcia', true);

    await waitFor(() =>
      expect(window.location.pathname).toBe('/dashboard/users/me/edit'),
    );
    expect(window.location.search).toBe('?tab=posts');
    expect(window.location.hash).toBe('#sekcia');
  });

  it('carries them when a stale slug is corrected', async () => {
    renderOwnProfile('/dashboard/users/old-slug?offer=55');

    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/me'));
    expect(window.location.search).toBe('?offer=55');
  });

  it('does NOT carry them when arriving from another page', async () => {
    // Query patri stranke, z ktorej sa odchadza – preniest ho na profil by
    // bola chyba, nie oprava.
    renderOwnProfile('/dashboard/settings/watches?tab=posts#nastavenia');

    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/me'));
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
  });
});

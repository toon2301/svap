/**
 * Číselná adresa VLASTNÉHO profilu s podstránkou (`/dashboard/users/<id>/language`).
 *
 * Staré odkazy nesú číselné ID namiesto slugu. Také ID patrí tomu istému účtu ako jeho slug, takže hook ho musí
 * rozpoznať ako vlastný profil: otvoriť podstránku (jazyk, účet, súkromie, úprava) a pri kanonizácii ID → slug
 * zachovať jej cestu. Predtým sa podstránka otvárala len pri zhode so slugom a kanonizácia ju zahodila, takže
 * `/dashboard/users/<id>/language` skončilo na základnom profile bez jazykovej hlavičky.
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
  getUserProfileFromCache: () => null,
  setUserProfileToCache: jest.fn(),
}));

import { useDashboardUserProfile } from '../useDashboardUserProfile';

// Slug s bodkou je skutočný tvar, ktorý backend generuje (medzery sa menia na bodky).
const owner = { id: 7, slug: 'moj.slug' } as never;
const setHighlightedSkillId = jest.fn();

type RightItem = 'language' | 'account-type' | 'privacy' | 'edit-profile';

/** Vykreslí hook na vlastnom profile s danou adresou a vráti mocky, ktoré hook volá pri otvorení podstránky. */
function renderOwnProfile(url: string, options: { identifier: string; rightItem: RightItem; width?: number }) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: options.width ?? 1280 });
  window.history.replaceState(null, '', url);
  const dashboardState = {
    setActiveModule: jest.fn(),
    setIsRightSidebarOpen: jest.fn(),
    setActiveRightItem: jest.fn(),
    isRightSidebarOpen: false,
    activeRightItem: '',
  };
  const isNumeric = /^\d+$/.test(options.identifier);
  renderHook(() =>
    useDashboardUserProfile({
      user: owner,
      activeModule: 'profile',
      dashboardState: dashboardState as never,
      // To isté, čo odovzdávajú stránky `app/dashboard/users/[userId]/*/page.tsx`.
      initialViewedUserId: isNumeric ? Number(options.identifier) : null,
      initialProfileSlug: options.identifier,
      initialRightItem: options.rightItem,
      setHighlightedSkillId,
    }),
  );
  return dashboardState;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('číselné ID vlastného účtu v adrese s podstránkou', () => {
  it('otvorí jazykovú podstránku a pri kanonizácii zachová /language aj query a fragment', async () => {
    const state = renderOwnProfile('/dashboard/users/7/language?tab=posts#sekcia', {
      identifier: '7',
      rightItem: 'language',
    });

    await waitFor(() => expect(state.setActiveRightItem).toHaveBeenCalledWith('language'));
    expect(state.setIsRightSidebarOpen).toHaveBeenCalledWith(true);
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/moj.slug/language'));
    expect(window.location.search).toBe('?tab=posts');
    expect(window.location.hash).toBe('#sekcia');
  });

  it('otvorí podstránku účtu a zachová /account', async () => {
    const state = renderOwnProfile('/dashboard/users/7/account', { identifier: '7', rightItem: 'account-type' });

    await waitFor(() => expect(state.setActiveRightItem).toHaveBeenCalledWith('account-type'));
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/moj.slug/account'));
  });

  it('otvorí podstránku súkromia na počítači a zachová /privacy', async () => {
    const state = renderOwnProfile('/dashboard/users/7/privacy', { identifier: '7', rightItem: 'privacy' });

    await waitFor(() => expect(state.setActiveRightItem).toHaveBeenCalledWith('privacy'));
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/moj.slug/privacy'));
  });

  it('na mobile prepne súkromie na samostatný modul a zachová /privacy', async () => {
    const state = renderOwnProfile('/dashboard/users/7/privacy', {
      identifier: '7',
      rightItem: 'privacy',
      width: 390,
    });

    await waitFor(() => expect(state.setActiveModule).toHaveBeenCalledWith('privacy'));
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/moj.slug/privacy'));
  });

  it('otvorí úpravu profilu a zachová /edit', async () => {
    const state = renderOwnProfile('/dashboard/users/7/edit', { identifier: '7', rightItem: 'edit-profile' });

    await waitFor(() => expect(state.setActiveRightItem).toHaveBeenCalledWith('edit-profile'));
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/moj.slug/edit'));
  });

  it('základný profil bez podstránky kanonizuje na holý slug', async () => {
    renderOwnProfile('/dashboard/users/7', { identifier: '7', rightItem: 'language' });

    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/moj.slug'));
  });
});

describe('adresy, ktoré sa nemajú zmeniť', () => {
  it('adresa so slugom si podstránku ponechá (bez prepisu)', async () => {
    const state = renderOwnProfile('/dashboard/users/moj.slug/language', {
      identifier: 'moj.slug',
      rightItem: 'language',
    });

    await waitFor(() => expect(state.setActiveRightItem).toHaveBeenCalledWith('language'));
    expect(window.location.pathname).toBe('/dashboard/users/moj.slug/language');
  });

  it('cudzie číselné ID nezíska jazykovú podstránku vlastného profilu', async () => {
    const state = renderOwnProfile('/dashboard/users/99/language', { identifier: '99', rightItem: 'language' });

    // Adresa sa pri tomto (umelom) vstupe môže prepísať na vlastný profil, ale nikdy nie na jeho podstránku.
    await waitFor(() => expect(window.location.pathname).not.toBe('/dashboard/users/99/language'));
    expect(window.location.pathname).toBe('/dashboard/users/moj.slug');
    expect(state.setActiveRightItem).not.toHaveBeenCalled();
    expect(state.setIsRightSidebarOpen).not.toHaveBeenCalled();
  });
});

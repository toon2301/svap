/**
 * Rozsah návratovej snímky Nástenky.
 *
 * Snímka patrí VÝHRADNE návratu z profilu, ponuky/dopytu alebo portfólia
 * otvoreného z Nástenky. Odchod do inej sekcie ju musí zahodiť – inak by sa
 * obnovila pri ďalšom otvorení Nástenky, hoci sa používateľ medzitým túlal
 * úplne inde.
 */

import { renderHook } from '@testing-library/react';
import { act } from 'react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../../modules/profile/profileUserCache', () => ({
  primeUserSlugId: jest.fn(),
}));

jest.mock('../../modules/profile/preloadAvatar', () => ({
  preloadProfileAvatar: jest.fn(),
}));

import { useDashboardNavigation } from '../useDashboardNavigation';
import { preloadProfileAvatar } from '../../modules/profile/preloadAvatar';
import {
  resetFeedReturnState,
  saveFeedReturn,
  takeFeedReturn,
} from '../../modules/feed/feedReturnState';

const post = {
  id: 1,
  post_type: 'free_post',
  caption: 'Príspevok',
} as never;

function renderNavigation(
  activeModule = 'home',
  user: unknown = { id: 1, slug: 'me' },
) {
  const dashboardState = {
    activeModule,
    setActiveModule: jest.fn(),
    setIsRightSidebarOpen: jest.fn(),
    setActiveRightItem: jest.fn(),
    setIsMobileMenuOpen: jest.fn(),
    setIsNotificationsPanelOpen: jest.fn(),
    openDesktopSettings: jest.fn(),
    closeDesktopSettings: jest.fn(),
    handleModuleChange: jest.fn(),
  } as never;

  return renderHook(() =>
    useDashboardNavigation({
      user: user as never,
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

beforeEach(() => {
  resetFeedReturnState();
  window.history.replaceState(null, '', '/dashboard');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
});

afterEach(() => resetFeedReturnState());

/** Stav Nástenky, aký po sebe zanechá preklik na profil. */
function captureSnapshot() {
  saveFeedReturn({ posts: [post], nextUrl: null, scrollTop: 500 });
}

describe('odchod do inej sekcie', () => {
  it.each([
    ['statistics'],
    ['requests'],
    ['messages'],
    ['notifications'],
    ['settings'],
    ['search'],
    ['favorites'],
    ['profile'],
  ])('drops the snapshot when moving to %s', (moduleId) => {
    captureSnapshot();
    const { result } = renderNavigation();

    act(() => result.current.handleMainModuleChange(moduleId));

    // Snímka je preč – ďalšie otvorenie Nástenky sa načíta normálne.
    expect(takeFeedReturn()).toBeNull();
  });

  it('drops it on the mobile profile tap too', () => {
    captureSnapshot();
    const { result } = renderNavigation();

    act(() => result.current.handleMobileProfileClick());

    expect(takeFeedReturn()).toBeNull();
  });
});

describe('neúspešný pokus o prepnutie', () => {
  it('keeps the snapshot when the profile switch is a no-op', () => {
    captureSnapshot();
    // Profilové dáta ešte nie sú načítané – `profileIdentifier` vráti `null`
    // a vetva pre `profile` sa vráti bez toho, aby čokoľvek prepla. Snímku
    // teda niet dôvodu zahadzovať.
    const { result } = renderNavigation('home', null);

    act(() => result.current.handleMainModuleChange('profile'));

    expect(takeFeedReturn()?.scrollTop).toBe(500);
  });

  it('still drops it when the profile switch really happens', () => {
    captureSnapshot();
    const { result } = renderNavigation();

    act(() => result.current.handleMainModuleChange('profile'));

    expect(takeFeedReturn()).toBeNull();
  });
});

describe('návrat na Nástenku', () => {
  it('keeps the snapshot when the target IS the feed', () => {
    captureSnapshot();
    const { result } = renderNavigation('user-profile');

    // Klik na „Nástenka" po prezretí profilu – práve toto je návrat, ktorý
    // snímku má použiť.
    act(() => result.current.handleMainModuleChange('home'));

    expect(takeFeedReturn()?.scrollTop).toBe(500);
  });
});

describe('otvorenie cudzieho profilu', () => {
  it('starts loading the known avatar before navigating to the profile', () => {
    const { result } = renderNavigation();

    act(() => {
      result.current.handleViewUserProfileFromSearch(2, 'jana', {
        id: 2,
        display_name: 'Jana',
        avatar_url: 'https://media.example.com/avatars/jana.webp',
      } as never);
    });

    expect(preloadProfileAvatar).toHaveBeenCalledWith(
      'https://media.example.com/avatars/jana.webp',
    );
  });
});

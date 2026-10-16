/**
 * Rozsah návratovej snímky Nástenky pri voľbe sekcie v navigácii.
 *
 * Snímku vytvára odchod z Nástenky na profil (alebo ponuku/portfólio). Späť
 * v prehliadači ju obnovuje sám (história, nie voľba sekcie). Tu sa overuje, čo
 * s ňou robí navigácia:
 *
 *  - Domov ju zachová, ak ju smie použiť (desktop: vlastný aj cudzí profil,
 *    mobil: len vlastný), inak ju zahodí a Nástenka ide od vrchu,
 *  - opätovný Domov na Nástenke ju zahodí a nepridá záznam do histórie,
 *  - profil z menu a z vyhľadávania sú nový reťazec – snímku zahodia,
 *  - ostatné sekcie (správy, štatistiky…) snímku nechajú prežiť.
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
import { setCurrentAccountId } from '@/lib/currentAccount';
import {
  peekFeedReturn,
  resetFeedReturnState,
  saveFeedReturn,
  type FeedReturnEntry,
} from '../../modules/feed/feedReturnState';

const post = {
  id: 1,
  post_type: 'free_post',
  caption: 'Príspevok',
} as never;

/** Prepnutie modulu, ktoré navigácia práve vyžiadala (posledné vykreslenie). */
let handleModuleChange: jest.Mock;

function renderNavigation(
  activeModule = 'home',
  user: unknown = { id: 1, slug: 'me' },
) {
  handleModuleChange = jest.fn();
  const dashboardState = {
    activeModule,
    setActiveModule: jest.fn(),
    setIsRightSidebarOpen: jest.fn(),
    setActiveRightItem: jest.fn(),
    setIsMobileMenuOpen: jest.fn(),
    setIsNotificationsPanelOpen: jest.fn(),
    openDesktopSettings: jest.fn(),
    closeDesktopSettings: jest.fn(),
    handleModuleChange,
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

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

beforeEach(() => {
  resetFeedReturnState();
  // Snímka sa ukladá len prihlásenému účtu.
  setCurrentAccountId(42);
  window.history.replaceState(null, '', '/dashboard');
  setViewportWidth(1280);
});

afterEach(() => {
  jest.restoreAllMocks();
  resetFeedReturnState();
  setCurrentAccountId(null);
});

/** Stav Nástenky, aký po sebe zanechá preklik na profil. */
function captureSnapshot(entry?: FeedReturnEntry, scrollTop = 500) {
  saveFeedReturn({ posts: [post], nextUrl: null, scrollTop, entry });
}

describe('sekcie, ktoré snímku nechajú prežiť', () => {
  it.each([
    ['statistics'],
    ['requests'],
    ['messages'],
    ['notifications'],
    ['settings'],
    ['search'],
    ['favorites'],
  ])('keeps the snapshot when moving to %s', (moduleId) => {
    captureSnapshot('other-profile');
    const { result } = renderNavigation();

    act(() => result.current.handleMainModuleChange(moduleId));

    // Snímka platí, kým sa na Nástenku nevrátim cez Domov alebo Späť.
    expect(peekFeedReturn()?.scrollTop).toBe(500);
  });
});

describe('vlastný profil z menu a z ikony na mobile', () => {
  it('drops the snapshot when the Profil item really switches the module', () => {
    captureSnapshot('other-profile');
    const { result } = renderNavigation();

    act(() => result.current.handleMainModuleChange('profile'));

    expect(peekFeedReturn()).toBeNull();
  });

  it('keeps the snapshot when the profile switch is a no-op', () => {
    captureSnapshot('other-profile');
    // Profilové dáta ešte nie sú načítané – `profileIdentifier` vráti `null`
    // a vetva pre `profile` sa vráti bez toho, aby čokoľvek prepla. Snímku
    // teda niet dôvodu zahadzovať.
    const { result } = renderNavigation('home', null);

    act(() => result.current.handleMainModuleChange('profile'));

    expect(peekFeedReturn()?.scrollTop).toBe(500);
  });

  it('drops it on the mobile profile tap too', () => {
    captureSnapshot('own-profile');
    const { result } = renderNavigation();

    act(() => result.current.handleMobileProfileClick());

    expect(peekFeedReturn()).toBeNull();
  });
});

describe('Domov z inej obrazovky', () => {
  it.each([
    ['own-profile', 1280],
    ['other-profile', 1280],
    ['own-profile', 390],
  ] as const)('keeps a %s snapshot for restoring at width %i', (entry, width) => {
    setViewportWidth(width);
    captureSnapshot(entry);
    const { result } = renderNavigation('profile');

    act(() => result.current.handleMainModuleChange('home'));

    // Nástenka (`FeedList`) ju pri mounte obnoví – tu ostáva nedotknutá.
    expect(peekFeedReturn()?.scrollTop).toBe(500);
  });

  it('drops a foreign-profile snapshot on mobile (the app back arrow handles it there)', () => {
    setViewportWidth(390);
    captureSnapshot('other-profile');
    const { result } = renderNavigation('messages');

    act(() => result.current.handleMainModuleChange('home'));

    expect(peekFeedReturn()).toBeNull();
  });

  it.each([
    ['other', 1280],
    ['other', 390],
  ] as const)('drops a %s snapshot at width %i', (entry, width) => {
    setViewportWidth(width);
    captureSnapshot(entry);
    const { result } = renderNavigation('portfolio-detail');

    act(() => result.current.handleMainModuleChange('home'));

    expect(peekFeedReturn()).toBeNull();
  });

  it('drops a snapshot without a known entry', () => {
    captureSnapshot(undefined);
    const { result } = renderNavigation('user-profile');

    act(() => result.current.handleMainModuleChange('home'));

    expect(peekFeedReturn()).toBeNull();
  });

  it('drops a snapshot taken at the very top (nothing to return to)', () => {
    captureSnapshot('other-profile', 0);
    const { result } = renderNavigation('user-profile');

    act(() => result.current.handleMainModuleChange('home'));

    expect(peekFeedReturn()).toBeNull();
  });

  it('survives a detour through another section on the way back to Domov', () => {
    captureSnapshot('other-profile');
    const { result, rerender } = renderNavigation('user-profile');

    act(() => result.current.handleMainModuleChange('messages'));
    rerender();
    act(() => result.current.handleMainModuleChange('home'));

    expect(peekFeedReturn()?.scrollTop).toBe(500);
  });

  it('pushes the Domov address into the history as before', () => {
    captureSnapshot('other-profile');
    window.history.replaceState(null, '', '/dashboard/users/jana');
    const pushState = jest.spyOn(window.history, 'pushState');
    const { result } = renderNavigation('user-profile');

    act(() => result.current.handleMainModuleChange('home'));

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState.mock.calls[0][2]).toBe('/dashboard');
  });
});

describe('opätovný Domov na Nástenke', () => {
  it('drops a leftover snapshot', () => {
    captureSnapshot('other-profile');
    const { result } = renderNavigation('home');

    act(() => result.current.handleMainModuleChange('home'));

    expect(peekFeedReturn()).toBeNull();
  });

  it('does not add another history entry for the same address', () => {
    const pushState = jest.spyOn(window.history, 'pushState');
    const { result } = renderNavigation('home');

    act(() => result.current.handleMainModuleChange('home'));

    expect(pushState).not.toHaveBeenCalled();
  });

  it('still goes through the regular module switch', () => {
    const { result } = renderNavigation('home');

    act(() => result.current.handleMainModuleChange('home'));

    expect(handleModuleChange).toHaveBeenCalledWith('home');
  });

  it('pushes the address when the feed is active but the URL is not the feed address', () => {
    // Napr. okno príspevku nad Nástenkou: modul je `home`, adresa príspevku.
    window.history.replaceState(null, '', '/dashboard/feed/7');
    const pushState = jest.spyOn(window.history, 'pushState');
    const { result } = renderNavigation('home');

    act(() => result.current.handleMainModuleChange('home'));

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState.mock.calls[0][2]).toBe('/dashboard');
  });
});

describe('neúspešný pokus o prepnutie', () => {
  it('keeps the snapshot when the profile switch is a no-op', () => {
    captureSnapshot('own-profile');
    const { result } = renderNavigation('home', null);

    act(() => result.current.handleMainModuleChange('profile'));

    expect(peekFeedReturn()?.scrollTop).toBe(500);
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

  it('drops the snapshot: a profile from search is a new chain, not a feed entry', () => {
    captureSnapshot('other-profile');
    const { result } = renderNavigation();

    act(() => {
      result.current.handleViewUserProfileFromSearch(2, 'jana');
    });

    expect(peekFeedReturn()).toBeNull();
  });

  it('drops the snapshot when a profile is opened from a search result offer', () => {
    captureSnapshot('other-profile');
    const { result } = renderNavigation();

    act(() => {
      result.current.handleViewUserSkillFromSearch(2, 9, 'jana');
    });

    expect(peekFeedReturn()).toBeNull();
  });
});

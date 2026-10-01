// Desktopové Nastavenia: appková šípka vedie jedným krokom na pôvod, prehliadačové Späť ostáva po krokoch.

import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/types';
import { useDashboardState } from '../useDashboardState';
import { useDashboardNavigation } from '../useDashboardNavigation';
import { useOfferWatchResultsNavigation } from '../../modules/offer-watch/results/offerWatchResultsNavigation';
import { withDesktopSettingsHistory } from '../desktopSettingsNavigation';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockAuthUser: User | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
    refreshUser: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  }),
}));

jest.mock('../../modules/SearchModule', () => ({
  invalidateSearchCacheForUser: jest.fn(),
}));

jest.mock('../../modules/profile/profileUserCache', () => ({
  setUserProfileToCache: jest.fn(),
  getUserIdBySlug: jest.fn(),
  getUserProfileFromCache: jest.fn(),
  primeUserSlugId: jest.fn(),
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

const PROFILE_URL = '/dashboard/users/test-user?tab=offers';

function renderDashboard(initialModule: string) {
  return renderHook(() => {
    const state = useDashboardState(baseUser, initialModule);
    const navigation = useDashboardNavigation({
      user: state.user,
      dashboardState: state,
      setIsSearchOpen: jest.fn(),
      setViewedUserId: jest.fn(),
      setViewedUserSlug: jest.fn(),
      setViewedUserSummary: jest.fn(),
      setHighlightedSkillId: jest.fn(),
      highlightTimeoutRef: { current: null },
    });
    const manageWatches = useOfferWatchResultsNavigation({
      activeModule: state.activeModule,
      openDesktopSettings: state.openDesktopSettings,
      setActiveRightItem: state.setActiveRightItem,
    });
    return { state, navigation, manageWatches };
  });
}

type Rendered = ReturnType<typeof renderDashboard>['result'];

const url = () => `${window.location.pathname}${window.location.search}`;

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

async function settle(ms = 30) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

async function browserBack() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      const fallback = setTimeout(resolve, 1000);
      window.addEventListener(
        'popstate',
        () => {
          clearTimeout(fallback);
          resolve();
        },
        { once: true },
      );
      window.history.back();
    });
  });
  await settle(10);
}

function clickSections(result: Rendered, sections: string[]) {
  sections.forEach((section) => {
    act(() => result.current.state.handleRightItemClick(section));
  });
}

function countPopstates() {
  const seen: string[] = [];
  const onPopState = () => seen.push(url());
  window.addEventListener('popstate', onPopState);
  return { seen, stop: () => window.removeEventListener('popstate', onPopState) };
}

beforeEach(() => {
  jest.clearAllMocks();
  setViewportWidth(1280);
  localStorage.clear();
  sessionStorage.clear();
  mockAuthUser = baseUser;
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('variant 1: vstup cez profil a „Upraviť profil"', () => {
  const SECTIONS = ['notifications', 'offer-watches', 'language', 'privacy', 'account-settings'];

  it.each([1, 2, 3, 4, 5])(
    'šípka po %i sekciách vedie jedným krokom rovno na profil',
    async (count) => {
      window.history.pushState(null, '', PROFILE_URL);
      const { result } = renderDashboard('profile');
      act(() => result.current.state.openOwnProfileEdit());
      clickSections(result, SECTIONS.slice(0, count));
      const popstates = countPopstates();

      act(() => result.current.state.closeOwnProfileEdit());

      await waitFor(() => expect(url()).toBe(PROFILE_URL));
      await settle();
      popstates.stop();
      expect(popstates.seen).toEqual([PROFILE_URL]);
      expect(result.current.state.activeModule).toBe('profile');
      expect(result.current.state.isRightSidebarOpen).toBe(false);
      expect(result.current.state.activeRightItem).toBe('');
    },
  );

  it.each([
    'notifications',
    'offer-watches',
    'language',
    'account-type',
    'privacy',
    'account-settings',
    'blocked-users',
  ])('%s hneď po „Upraviť profil": šípka je jeden skok o dva záznamy na profil', async (section) => {
    window.history.pushState(null, '', PROFILE_URL);
    const { result } = renderDashboard('profile');
    act(() => result.current.state.openOwnProfileEdit());
    clickSections(result, [section]);
    const goSpy = jest.spyOn(window.history, 'go');
    const backSpy = jest.spyOn(window.history, 'back');
    const popstates = countPopstates();

    act(() => result.current.state.closeOwnProfileEdit());

    await waitFor(() => expect(url()).toBe(PROFILE_URL));
    await settle();
    popstates.stop();
    expect(goSpy).toHaveBeenCalledTimes(1);
    expect(goSpy).toHaveBeenCalledWith(-2);
    expect(backSpy).not.toHaveBeenCalled();
    expect(popstates.seen).toEqual([PROFILE_URL]);
    expect(result.current.state.activeModule).toBe('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
    expect(result.current.state.activeRightItem).toBe('');
  });

  it('šípka priamo na „Upraviť profil" ostáva ako doteraz (nahradí záznam profilom)', () => {
    window.history.pushState(null, '', PROFILE_URL);
    const { result } = renderDashboard('profile');
    act(() => result.current.state.openOwnProfileEdit());
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    const goSpy = jest.spyOn(window.history, 'go');

    act(() => result.current.state.closeOwnProfileEdit());

    expect(goSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, '', '/dashboard/users/test-user');
    expect(result.current.state.activeModule).toBe('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });

  it('položka „Upraviť profil" v pravom paneli pokračuje v tej istej relácii', async () => {
    window.history.pushState(null, '', PROFILE_URL);
    const { result } = renderDashboard('profile');
    act(() => result.current.state.openOwnProfileEdit());
    clickSections(result, ['notifications', 'edit-profile']);
    expect(url()).toBe('/dashboard/users/test-user/edit');

    act(() => result.current.state.closeOwnProfileEdit());

    await waitFor(() => expect(url()).toBe(PROFILE_URL));
    expect(result.current.state.activeModule).toBe('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });
});

describe('variant 2: vstup cez ľavé menu „Nastavenia"', () => {
  const SECTIONS = ['privacy', 'account-settings', 'language', 'blocked-users'];

  it.each([1, 2, 3, 4])(
    'šípka po %i sekciách vedie jedným krokom rovno na Nástenku',
    async (count) => {
      const { result } = renderDashboard('home');
      act(() => result.current.navigation.handleMainModuleChange('settings'));
      await waitFor(() => expect(url()).toBe('/dashboard/settings'));
      clickSections(result, SECTIONS.slice(0, count));
      const popstates = countPopstates();

      act(() => result.current.state.closeOwnProfileEdit());

      await waitFor(() => expect(url()).toBe('/dashboard'));
      await settle();
      popstates.stop();
      expect(popstates.seen).toEqual(['/dashboard']);
      expect(result.current.state.activeModule).toBe('home');
      expect(result.current.state.isRightSidebarOpen).toBe(false);
    },
  );

  it('vstup cez Správy vedie šípka späť na Správy, nie na Nástenku', async () => {
    window.history.replaceState(null, '', '/dashboard/messages');
    const { result } = renderDashboard('messages');
    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
    clickSections(result, ['language', 'privacy']);

    act(() => result.current.state.closeOwnProfileEdit());

    await waitFor(() => expect(url()).toBe('/dashboard/messages'));
    expect(result.current.state.activeModule).toBe('messages');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });

  it('zoznam Nastavení bez sekcie: šípka vedie na pôvod jedným krokom ako doteraz', async () => {
    const { result } = renderDashboard('home');
    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
    const backSpy = jest.spyOn(window.history, 'back');
    const goSpy = jest.spyOn(window.history, 'go');

    act(() => result.current.state.closeOwnProfileEdit());

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(goSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(url()).toBe('/dashboard'));
  });

  it('klik na už otvorenú sekciu vzdialenosť k pôvodu nepredlžuje', async () => {
    const { result } = renderDashboard('home');
    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
    clickSections(result, ['privacy', 'privacy', 'privacy']);

    act(() => result.current.state.closeOwnProfileEdit());

    await waitFor(() => expect(url()).toBe('/dashboard'));
  });
});

describe('šípka v Dashboarde odovzdáva handleru udalosť kliku, nie používateľa', () => {
  const clickEvent = { type: 'click', nativeEvent: {}, target: document.body } as never;

  it('Nastavenia z ľavého menu: šípka vedie rovno na pôvod', async () => {
    const { result } = renderDashboard('home');
    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
    clickSections(result, ['privacy', 'account-settings']);
    const goSpy = jest.spyOn(window.history, 'go');

    act(() => result.current.state.closeOwnProfileEdit(clickEvent));

    expect(goSpy).toHaveBeenCalledWith(-3);
    await waitFor(() => expect(url()).toBe('/dashboard'));
  });

  it('sekcia po „Upraviť profil": šípka vedie rovno na profil', async () => {
    window.history.pushState(null, '', PROFILE_URL);
    const { result } = renderDashboard('profile');
    act(() => result.current.state.openOwnProfileEdit());
    clickSections(result, ['notifications']);
    const goSpy = jest.spyOn(window.history, 'go');

    act(() => result.current.state.closeOwnProfileEdit(clickEvent));

    expect(goSpy).toHaveBeenCalledWith(-2);
    await waitFor(() => expect(url()).toBe(PROFILE_URL));
  });

  it('sekcia po Sledovaní (modul Nastavenia po „Upraviť profil"): šípka vedie rovno na profil', async () => {
    window.history.pushState(null, '', PROFILE_URL);
    const { result } = renderDashboard('profile');
    act(() => result.current.state.openOwnProfileEdit());
    clickSections(result, ['offer-watches', 'language']);
    const goSpy = jest.spyOn(window.history, 'go');

    act(() => result.current.state.closeOwnProfileEdit(clickEvent));

    expect(goSpy).toHaveBeenCalledWith(-3);
    await waitFor(() => expect(url()).toBe(PROFILE_URL));
  });
});

describe('vstup cez „Spravovať" vo výsledkoch sledovania', () => {
  it('šípka po sekciách vedie rovno späť na výsledky', async () => {
    window.history.pushState(null, '', '/dashboard/watches?watch=7');
    const { result } = renderDashboard('watches');

    act(() => result.current.manageWatches());
    expect(url()).toBe('/dashboard/settings/watches');
    clickSections(result, ['language', 'privacy']);

    act(() => result.current.state.closeOwnProfileEdit());

    await waitFor(() => expect(url()).toBe('/dashboard/watches?watch=7'));
    expect(result.current.state.activeModule).toBe('watches');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });
});

describe('neznámy pôvod ostáva pri doterajšom správaní', () => {
  it('záznamy bez zapísanej hĺbky: šípka urobí jeden krok späť', async () => {
    window.history.pushState(
      withDesktopSettingsHistory(null, { moduleId: 'home', url: '/dashboard' }),
      '',
      '/dashboard/settings',
    );
    const { result } = renderDashboard('settings');
    clickSections(result, ['language', 'privacy']);
    const backSpy = jest.spyOn(window.history, 'back');
    const goSpy = jest.spyOn(window.history, 'go');

    act(() => result.current.state.closeOwnProfileEdit());

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(goSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(url()).toBe('/dashboard/language'));
  });

  it('priame otvorenie sekcie bez histórie: šípka vedie na vlastný profil', () => {
    window.history.replaceState(null, '', '/dashboard/language');
    const { result } = renderDashboard('language');
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    const goSpy = jest.spyOn(window.history, 'go');

    act(() => result.current.state.closeOwnProfileEdit());

    expect(goSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, '', '/dashboard/users/test-user');
    expect(result.current.state.activeModule).toBe('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });

  it('uloženie z formulára „Upraviť profil" nahradí záznam novým profilom ako doteraz', () => {
    window.history.pushState(null, '', PROFILE_URL);
    const { result } = renderDashboard('profile');
    act(() => result.current.state.openOwnProfileEdit());
    clickSections(result, ['notifications', 'edit-profile']);
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    const goSpy = jest.spyOn(window.history, 'go');
    const backSpy = jest.spyOn(window.history, 'back');

    act(() => result.current.state.closeOwnProfileEdit({ ...baseUser, slug: 'new-slug' }));

    expect(goSpy).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, '', '/dashboard/users/new-slug');
    expect(result.current.state.activeModule).toBe('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });

  it('uloženie z obrazovky Nastavení urobí jeden krok späť ako doteraz', async () => {
    const { result } = renderDashboard('home');
    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
    clickSections(result, ['offer-watches']);
    expect(url()).toBe('/dashboard/settings/watches');
    const goSpy = jest.spyOn(window.history, 'go');
    const backSpy = jest.spyOn(window.history, 'back');

    act(() => result.current.state.closeOwnProfileEdit({ ...baseUser, slug: 'new-slug' }));

    expect(goSpy).not.toHaveBeenCalled();
    expect(backSpy).toHaveBeenCalledTimes(1);
    await settle();
  });
});

describe('prehliadačové Späť ostáva po krokoch a obnovuje každú sekciu', () => {
  it('profil → Upraviť profil → Upozornenia → Sledovanie → Jazyk → Späť ×3', async () => {
    window.history.pushState(null, '', PROFILE_URL);
    const { result } = renderDashboard('profile');
    act(() => result.current.state.openOwnProfileEdit());
    clickSections(result, ['notifications', 'offer-watches', 'language']);
    expect(url()).toBe('/dashboard/language');

    await browserBack();
    expect(url()).toBe('/dashboard/settings/watches');
    expect(result.current.state.activeModule).toBe('settings');
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(result.current.state.activeRightItem).toBe('offer-watches');

    await browserBack();
    expect(url()).toBe('/dashboard/settings/notifications');
    expect(result.current.state.activeModule).toBe('settings');
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(result.current.state.activeRightItem).toBe('notifications');

    await browserBack();
    expect(url()).toBe('/dashboard/users/test-user/edit');
    expect(result.current.state.activeModule).toBe('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(result.current.state.activeRightItem).toBe('edit-profile');
  });

  it('po návrate o krok späť šípka stále vedie rovno na pôvod', async () => {
    window.history.pushState(null, '', PROFILE_URL);
    const { result } = renderDashboard('profile');
    act(() => result.current.state.openOwnProfileEdit());
    clickSections(result, ['notifications', 'offer-watches', 'language']);
    await browserBack();
    expect(url()).toBe('/dashboard/settings/watches');

    act(() => result.current.state.closeOwnProfileEdit());

    await waitFor(() => expect(url()).toBe(PROFILE_URL));
  });
});

describe('obnova obrazovky podľa záznamu histórie (desktop)', () => {
  it('záznam sekcie bez štítku obnoví pravý panel aj položku', async () => {
    window.history.pushState(null, '', '/dashboard/settings/notifications');
    window.history.pushState(null, '', '/dashboard');
    const { result } = renderDashboard('home');

    await browserBack();

    expect(url()).toBe('/dashboard/settings/notifications');
    expect(result.current.state.activeModule).toBe('settings');
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(result.current.state.activeRightItem).toBe('notifications');
  });

  it('záznam „Upraviť profil" obnoví úpravu vlastného profilu', async () => {
    window.history.pushState(null, '', '/dashboard/users/test-user/edit?tab=offers');
    window.history.pushState(null, '', '/dashboard/users/test-user');
    const { result } = renderDashboard('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(false);

    await browserBack();

    expect(url()).toBe('/dashboard/users/test-user/edit?tab=offers');
    expect(result.current.state.activeModule).toBe('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(result.current.state.activeRightItem).toBe('edit-profile');
  });

  it('„/edit" cudzieho profilu nič neotvára', async () => {
    window.history.pushState(null, '', '/dashboard/users/someone-else/edit');
    window.history.pushState(null, '', '/dashboard/users/test-user');
    const { result } = renderDashboard('profile');

    await browserBack();

    expect(url()).toBe('/dashboard/users/someone-else/edit');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });

  it('záznam mimo Nastavení nič neobnovuje', async () => {
    window.history.pushState(null, '', '/dashboard/messages');
    window.history.pushState(null, '', '/dashboard');
    const { result } = renderDashboard('home');

    await browserBack();

    expect(url()).toBe('/dashboard/messages');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
    expect(result.current.state.activeModule).toBe('home');
  });

  it('mobil: záznam sekcie nič neobnovuje', async () => {
    setViewportWidth(390);
    window.history.pushState(null, '', '/dashboard/settings/notifications');
    window.history.pushState(null, '', '/dashboard');
    const { result } = renderDashboard('home');

    await browserBack();

    expect(url()).toBe('/dashboard/settings/notifications');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
    expect(result.current.state.activeModule).toBe('home');
  });
});

describe('priame otvorenie sekcie Nastavení na desktope', () => {
  it.each([
    ['notification-settings', '/dashboard/settings/notifications', 'notifications'],
    ['language', '/dashboard/language', 'language'],
    ['privacy', '/dashboard/privacy', 'privacy'],
    ['account-type', '/dashboard/account-type', 'account-type'],
    ['account-settings', '/dashboard/settings/account', 'account-settings'],
    ['blocked-users', '/dashboard/settings/blocked', 'blocked-users'],
  ])('%s má otvorený pravý panel so zvýraznenou položkou', (moduleId, path, item) => {
    window.history.replaceState(null, '', path);

    const { result } = renderDashboard(moduleId);

    expect(result.current.state.activeModule).toBe(moduleId);
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(result.current.state.activeRightItem).toBe(item);
  });

  it('mobil: Upozornenia sa pravý panel neotvára', () => {
    setViewportWidth(390);
    window.history.replaceState(null, '', '/dashboard/settings/notifications');

    const { result } = renderDashboard('notification-settings');

    expect(result.current.state.activeModule).toBe('notification-settings');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });
});

describe('potvrdenie zmeny súkromia', () => {
  it('desktop: pravý panel ostáva otvorený', () => {
    window.history.replaceState(null, '', '/dashboard/privacy');
    const { result } = renderDashboard('privacy');
    expect(result.current.state.isRightSidebarOpen).toBe(true);

    act(() => result.current.state.handleUserUpdate({ ...baseUser, is_public: false }));

    expect(result.current.state.activeModule).toBe('privacy');
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(result.current.state.activeRightItem).toBe('privacy');
  });

  it('mobil: obrazovka súkromia sa zatvára pravý panel ako doteraz', () => {
    setViewportWidth(390);
    window.history.replaceState(null, '', '/dashboard/privacy');
    const { result } = renderDashboard('privacy');

    act(() => result.current.state.handleUserUpdate({ ...baseUser, is_public: false }));

    expect(result.current.state.activeModule).toBe('privacy');
    expect(result.current.state.isRightSidebarOpen).toBe(false);
  });
});

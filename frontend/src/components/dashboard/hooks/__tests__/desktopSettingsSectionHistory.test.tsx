/**
 * Desktopové Nastavenia: sekcia je vlastná obrazovka, teda vlastný záznam.
 *
 * Kým klik na sekciu robil `replaceState`, boli celé Nastavenia jediný záznam
 * histórie – krok späť zo sekcie preto neviedol na zoznam, ale rovno von
 * z Nastavení (na Nástenku). Sekcia teraz dostáva `pushState`.
 *
 * Marker „opusti Nastavenia úplne" (`__svaplyDesktopSettingsOrigin`) žije na
 * zázname PRED Nastaveniami a overuje sa rovnosťou adries – kroky ani hĺbku
 * nepočíta, takže ho nová vrstva histórie nemá ako pokaziť. Tu sa to overuje
 * meraním, nie predpokladom.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/types';
import { useDashboardState } from '../useDashboardState';
import { useDashboardNavigation } from '../useDashboardNavigation';
import { readDesktopSettingsOriginTarget } from '../desktopSettingsNavigation';

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
};

/** Dashboard s navigáciou – rovnaká dvojica, akú používa `DashboardContent`. */
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
    return { state, navigation };
  });
}

const url = () => `${window.location.pathname}${window.location.search}`;

/** Všetky sekcie, ktoré desktopový pravý panel ponúka. */
const SECTIONS: Array<[string, string]> = [
  ['Upozornenia', '/dashboard/settings/notifications'],
  ['Sledovanie ponúk', '/dashboard/settings/watches'],
  ['Jazyk', '/dashboard/language'],
  ['Typ účtu', '/dashboard/account-type'],
  ['Súkromie', '/dashboard/privacy'],
  ['Účet', '/dashboard/settings/account'],
  ['Blokovaní', '/dashboard/settings/blocked'],
];

const SECTION_IDS: Record<string, string> = {
  '/dashboard/settings/notifications': 'notifications',
  '/dashboard/settings/watches': 'offer-watches',
  '/dashboard/language': 'language',
  '/dashboard/account-type': 'account-type',
  '/dashboard/privacy': 'privacy',
  '/dashboard/settings/account': 'account-settings',
  '/dashboard/settings/blocked': 'blocked-users',
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  localStorage.clear();
  sessionStorage.clear();
  mockAuthUser = baseUser;
  window.history.replaceState(null, '', '/dashboard');
});

describe('sekcia Nastavení má vlastný záznam histórie', () => {
  it.each(SECTIONS)('%s dostane pri otvorení nový záznam', async (_name, path) => {
    const { result } = renderDashboard('home');

    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
    const lengthAfterList = window.history.length;

    act(() => result.current.state.handleRightItemClick(SECTION_IDS[path]));

    expect(url()).toBe(path);
    // Predtým `replaceState`: sekcia záznam nedostala a Back viedol von.
    expect(window.history.length).toBe(lengthAfterList + 1);
  });

  it.each(SECTIONS)('%s – Späť vedie na zoznam Nastavení', async (_name, path) => {
    const { result } = renderDashboard('home');

    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
    act(() => result.current.state.handleRightItemClick(SECTION_IDS[path]));
    expect(url()).toBe(path);

    await act(async () => {
      window.history.back();
    });

    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
  });
});

describe('marker „opusti Nastavenia úplne" novú vrstvu prežije', () => {
  it('záznam pred Nastaveniami si pôvod drží aj po otvorení sekcie', async () => {
    const { result } = renderDashboard('home');

    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));
    act(() => result.current.state.handleRightItemClick('notifications'));

    // Dva kroky späť: sekcia → zoznam → pôvod.
    await act(async () => {
      window.history.back();
    });
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));

    await act(async () => {
      window.history.back();
    });
    await waitFor(() => expect(url()).toBe('/dashboard'));

    // Marker sa číta zo stavu záznamu a overuje rovnosťou adries – preto mu
    // pridaná vrstva neprekáža.
    expect(readDesktopSettingsOriginTarget(window.history.state)).toEqual({
      moduleId: 'home',
      url: '/dashboard',
    });
  });

  it('marker neprepisuje ani neposúva samotná sekcia', async () => {
    const { result } = renderDashboard('home');

    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe('/dashboard/settings'));

    // Na zázname Nastavení ani na zázname sekcie pôvod nesmie byť – patrí
    // výhradne obrazovke, z ktorej sa do Nastavení vošlo.
    expect(readDesktopSettingsOriginTarget(window.history.state)).toBeNull();

    act(() => result.current.state.handleRightItemClick('privacy'));

    expect(readDesktopSettingsOriginTarget(window.history.state)).toBeNull();
  });
});

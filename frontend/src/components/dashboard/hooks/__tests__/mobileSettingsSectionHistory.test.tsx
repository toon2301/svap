/**
 * Mobilné Nastavenia: zoznam je obrazovka s adresou, sekcia tiež.
 *
 * Predtým bol zoznam iba stav menu (`isMobileMenuOpen`) a štyri zo siedmich
 * sekcií nemali adresu vôbec – otvorili sa ako pravá položka nad profilom.
 * Návrat preto musela riešiť každá sekcia vlastným ručným handlerom a Jazyk
 * ho nemal, takže šípku nemal ani on.
 *
 * Teraz ide sekcia bežnou navigáciou: dostane vlastný záznam a krok späť
 * (appkový aj browser) pristane na zozname sám.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/types';
import { useDashboardState } from '../useDashboardState';
import { useDashboardNavigation } from '../useDashboardNavigation';
import { isSettingsSectionModule } from '../desktopSettingsNavigation';

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

function renderDashboard() {
  return renderHook(() => {
    const state = useDashboardState(baseUser, 'home');
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

const url = () => window.location.pathname;
const SETTINGS = '/dashboard/settings';

/**
 * Sekcie tak, ako ich zoznam otvára: klik z mobilného menu.
 * Sledovanie má vlastného hostiteľa, preto ho tu zastupuje jeho adresa.
 */
type Section = {
  name: string;
  path: string;
  module: string;
  open: (api: ReturnType<typeof renderDashboard>['result']['current']) => void;
};

const SECTIONS: Section[] = [
  {
    name: 'Upozornenia',
    path: '/dashboard/settings/notifications',
    module: 'notification-settings',
    open: (api) => api.navigation.handleMainModuleChange('notification-settings'),
  },
  {
    name: 'Blokovaní',
    path: '/dashboard/settings/blocked',
    module: 'blocked-users',
    open: (api) => api.navigation.handleMainModuleChange('blocked-users'),
  },
  {
    name: 'Súkromie',
    path: '/dashboard/privacy',
    module: 'privacy',
    open: (api) => api.navigation.handleSidebarPrivacyClick(),
  },
  {
    name: 'Jazyk',
    path: '/dashboard/language',
    module: 'language',
    open: (api) => api.navigation.handleSidebarLanguageClick(),
  },
  {
    name: 'Typ účtu',
    path: '/dashboard/account-type',
    module: 'account-type',
    open: (api) => api.navigation.handleSidebarAccountTypeClick(),
  },
  {
    name: 'Účet',
    path: '/dashboard/settings/account',
    module: 'account-settings',
    open: (api) => api.navigation.handleSidebarAccountSettingsClick(),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  // Mobil: šírka pod desktopovou hranicou.
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  localStorage.clear();
  sessionStorage.clear();
  mockAuthUser = baseUser;
  window.history.replaceState(null, '', '/dashboard');
});

describe('zoznam Nastavení je obrazovka s adresou', () => {
  it('vstup naň zapíše adresu aj modul', async () => {
    const { result } = renderDashboard();

    act(() => result.current.navigation.handleMainModuleChange('settings'));

    await waitFor(() => expect(url()).toBe(SETTINGS));
    expect(result.current.state.activeModule).toBe('settings');
  });
});

describe('každá sekcia má vlastný záznam a vracia sa na zoznam', () => {
  it.each(SECTIONS.map((section) => [section.name, section]))(
    '%s dostane pri otvorení vlastný záznam',
    async (_name, section) => {
      const { result } = renderDashboard();
      act(() => result.current.navigation.handleMainModuleChange('settings'));
      await waitFor(() => expect(url()).toBe(SETTINGS));
      const lengthOnList = window.history.length;

      act(() => (section as Section).open(result.current));

      await waitFor(() => expect(url()).toBe((section as Section).path));
      // Predtým sa štyri z nich otvárali bez akéhokoľvek zápisu do histórie.
      expect(window.history.length).toBe(lengthOnList + 1);
    },
  );

  it.each(SECTIONS.map((section) => [section.name, section]))(
    '%s – krok späť vedie na zoznam Nastavení',
    async (_name, section) => {
      const { result } = renderDashboard();
      act(() => result.current.navigation.handleMainModuleChange('settings'));
      await waitFor(() => expect(url()).toBe(SETTINGS));
      act(() => (section as Section).open(result.current));
      await waitFor(() => expect(url()).toBe((section as Section).path));

      await act(async () => {
        window.history.back();
      });

      // Nie Profil, nie Nástenka – zoznam.
      await waitFor(() => expect(url()).toBe(SETTINGS));
    },
  );

  it.each(SECTIONS.map((section) => [section.name, section]))(
    '%s – appková šípka robí to isté čo browser Späť',
    async (_name, section) => {
      const backSpy = jest.spyOn(window.history, 'back');
      const { result } = renderDashboard();
      act(() => result.current.navigation.handleMainModuleChange('settings'));
      await waitFor(() => expect(url()).toBe(SETTINGS));
      act(() => (section as Section).open(result.current));
      await waitFor(() => expect(url()).toBe((section as Section).path));
      backSpy.mockClear();

      act(() => result.current.state.handleMobileBack());

      // Žiadny ručný návrat: šípka je ten istý krok späť.
      expect(backSpy).toHaveBeenCalledTimes(1);
      backSpy.mockRestore();
    },
  );
});

describe('šípka sa zobrazí pre každú sekciu', () => {
  it.each(SECTIONS.map((section) => [section.name, section.module]))(
    '%s je rozpoznaná ako sekcia Nastavení',
    (_name, moduleId) => {
      // Mobilná lišta sa pýta registra, nie ručného zoznamu – preto pribudnutá
      // sekcia (a kedysi chýbajúci Jazyk) šípku dostane sama.
      expect(isSettingsSectionModule(moduleId as string)).toBe(true);
    },
  );

  it('zoznam sám sekciou nie je', () => {
    expect(isSettingsSectionModule('settings')).toBe(false);
    expect(isSettingsSectionModule('home')).toBe(false);
    expect(isSettingsSectionModule('user-profile')).toBe(false);
  });
});

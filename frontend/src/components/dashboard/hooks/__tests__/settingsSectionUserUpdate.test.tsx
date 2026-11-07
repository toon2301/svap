/**
 * Zmena údajov na obrazovke sekcie Nastavení (nález 271).
 *
 * `handleUserUpdate` ošetroval iba `settings`, `privacy` a `profile`. Mobilné sekcie Nastavení (Typ účtu, Jazyk,
 * Účet, Blokovaní, Upozornenia) sú moduly, takže po zmene typu účtu spadli do poslednej vetvy: modul sa prepol na
 * `profile`, otvoril sa pravý panel (a `DashboardLayout` v tom stave skrýva spodný panel, lebo ide o úpravu profilu),
 * do `localStorage` sa zapísal `profile` a adresa ostala sekciou. Teraz sekcia ostáva, ako je.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/types';
import { useDashboardState } from '../useDashboardState';
import { useDashboardNavigation } from '../useDashboardNavigation';

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

/** Používateľ po zmene typu účtu na firmu, tak ako ho vráti server po potvrdení v dialógu. */
const companyUser: User = { ...baseUser, user_type: 'company' };

/** Stav dashboardu spolu s navigáciou, cez ktorú sa sekcie otvárajú rovnako ako z mobilného menu. */
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

type Dashboard = ReturnType<typeof renderDashboard>['result']['current'];

const url = () => window.location.pathname;
const SETTINGS = '/dashboard/settings';

type Section = {
  name: string;
  path: string;
  module: string;
  open: (api: Dashboard) => void;
};

/** Všetkých šesť sekcií Nastavení tak, ako ich otvára zoznam: kliknutie z mobilného menu. */
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

describe('zmena údajov na obrazovke sekcie Nastavení', () => {
  it.each(SECTIONS)(
    '$name: po zmene údajov ostane modul, adresa aj uložený modul a pravý panel je zatvorený',
    async (section) => {
      const { result } = renderDashboard();
      act(() => result.current.navigation.handleMainModuleChange('settings'));
      await waitFor(() => expect(url()).toBe(SETTINGS));
      act(() => section.open(result.current));
      await waitFor(() => expect(url()).toBe(section.path));
      // Východisko: sekcia je otvorená ako modul a pravý panel nie je otvorený.
      expect(result.current.state.activeModule).toBe(section.module);
      expect(result.current.state.isRightSidebarOpen).toBe(false);

      act(() => result.current.state.handleUserUpdate(companyUser));

      expect(result.current.state.activeModule).toBe(section.module);
      expect(url()).toBe(section.path);
      // Po obnovení stránky sa má otvoriť tá istá obrazovka, nie úprava profilu.
      expect(localStorage.getItem('activeModule')).toBe(section.module);
      expect(result.current.state.isRightSidebarOpen).toBe(false);
    },
  );
});

describe('ostatné miesta sa po zmene údajov správajú ako doteraz', () => {
  it('zo Nástenky sa otvorí úprava profilu', () => {
    const { result } = renderDashboard();

    act(() => result.current.state.handleUserUpdate(companyUser));

    expect(result.current.state.activeModule).toBe('profile');
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(localStorage.getItem('activeModule')).toBe('profile');
  });

  it('zoznam Nastavení ostáva zoznamom', async () => {
    const { result } = renderDashboard();
    act(() => result.current.navigation.handleMainModuleChange('settings'));
    await waitFor(() => expect(url()).toBe(SETTINGS));

    act(() => result.current.state.handleUserUpdate(companyUser));

    expect(result.current.state.activeModule).toBe('settings');
    expect(url()).toBe(SETTINGS);
  });
});

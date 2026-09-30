/**
 * Vykreslenie `DashboardContent`: načítavacia obrazovka a stav bez prihláseného
 * používateľa, presná sada props, ktorú dostávajú `ModuleRouter`,
 * `DashboardLayout`, modály a oba providery sprievodcu, názov účtu v mobilnej
 * hlavičke, panely hľadania a upozornení, pravý stĺpec Správ, lišta detailu
 * ponuky na mobile, profil, ktorý sa nepodarilo načítať, a odznaky nových
 * položiek.
 *
 * Testy idú cez vonkajšie rozhranie komponentu (props, ktoré dostanú
 * podriadené komponenty, a obsah DOM), takže nezávisia od toho, v ktorom
 * súbore sa vykresľovanie zloží, a musia prejsť nezmenené aj po rozdelení
 * `DashboardContent.tsx`. Zoznamy názvov props sú zámerne úplné: keď sa pri
 * presune kódu niektorý prop stratí, spadne tento súbor.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import SearchModule from '../modules/SearchModule';
import NotificationsFeed from '../modules/notifications/NotificationsFeed';
import { MessagesDesktopRail } from '../modules/messages/MessagesDesktopRail';
import {
  dispatchProfileOfferDetailClose,
  dispatchProfileOfferDetailOpen,
} from '../modules/profile/profileOfferDetailEvents';
import { invalidateUserProfileCache } from '../modules/profile/profileUserCache';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { clearAuthState } from '@/utils/auth';
import type { User } from '@/types';

type ModuleRouterProps = ComponentProps<typeof ModuleRouter>;
type DashboardLayoutProps = ComponentProps<typeof DashboardLayout>;

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

let mockRouterProps: Record<string, unknown> | null = null;
jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockRouterProps = props;
    return <div data-testid="module-state" data-module={String(props.activeModule)} />;
  },
}));

let mockLayoutProps: Record<string, unknown> | null = null;
jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    mockLayoutProps = props;
    return <div data-testid="layout">{props.children}</div>;
  },
}));

let mockModalsProps: Record<string, unknown> | null = null;
jest.mock('../DashboardModals', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockModalsProps = props;
    return null;
  },
}));

let mockDesktopOnboardingProps: Record<string, unknown> | null = null;
jest.mock('../onboarding/DesktopOnboardingContext', () => ({
  ...jest.requireActual('../onboarding/DesktopOnboardingContext'),
  DesktopOnboardingProvider: (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    mockDesktopOnboardingProps = props;
    return <>{props.children}</>;
  },
}));

let mockMobileOnboardingProps: Record<string, unknown> | null = null;
jest.mock('../onboarding/MobileOnboardingContext', () => ({
  ...jest.requireActual('../onboarding/MobileOnboardingContext'),
  MobileOnboardingProvider: (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    mockMobileOnboardingProps = props;
    return <>{props.children}</>;
  },
}));

jest.mock('../onboarding/DesktopOnboardingOverlay', () => ({ __esModule: true, default: () => null }));
jest.mock('../onboarding/MobileOnboardingOverlay', () => ({ __esModule: true, default: () => null }));
jest.mock('../onboarding/OnboardingScrollLock', () => ({ __esModule: true, default: () => null }));

let mockRequestsProviderProps: Record<string, unknown> | null = null;
jest.mock('../contexts/RequestsNotificationsContext', () => {
  const actual = jest.requireActual('../contexts/RequestsNotificationsContext');
  return {
    ...actual,
    RequestsNotificationsProvider: (props: Record<string, unknown>) => {
      mockRequestsProviderProps = props;
      return <actual.RequestsNotificationsProvider {...props} />;
    },
  };
});

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
let mockPathname = '/dashboard';
let mockSearchParams: URLSearchParams | null = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
}));

jest.mock('@/utils/auth', () => ({ isAuthenticated: jest.fn(() => true), clearAuthState: jest.fn() }));
jest.mock('@/utils/csrf', () => ({ fetchCsrfToken: jest.fn(), hasCsrfToken: jest.fn(() => true) }));
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(() => new Promise(() => {})),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(() => new Promise(() => {})),
  },
  endpoints: {
    auth: {
      me: '/auth/me/',
      logout: '/auth/logout/',
      login: '/auth/login/',
      register: '/auth/register/',
      mobileOnboarding: '/auth/onboarding/mobile/',
    },
    dashboard: {
      userProfileBySlug: (slug: string) => `/profile/slug/${slug}/`,
      userProfile: (id: number) => `/profile/${id}/`,
    },
    skills: { list: '/auth/skills/', detail: (id: number) => `/auth/skills/${id}/` },
  },
  invalidateSession: jest.fn(),
  isTransientAuthFailureError: jest.fn(() => false),
  setMayHaveRefreshCookie: jest.fn(),
}));

const mockApiGet = api.get as jest.Mock;
const mockClearAuthState = clearAuthState as jest.Mock;

const baseUser = {
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;
const layoutProps = () => mockLayoutProps as unknown as DashboardLayoutProps;
const activeModule = () => routerProps().activeModule;

const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 390;
const originalInnerWidth = window.innerWidth;

function installViewport(isMobile: boolean) {
  // `useDashboardNavigation` rozlišuje mobil/desktop podľa `window.innerWidth`,
  // `DashboardContent` podľa media query – obe musia hovoriť to isté.
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH,
  });
  (window as unknown as { matchMedia: unknown }).matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes('max-width: 1023px') ? isMobile : false,
    media: q,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

type DashboardProps = ComponentProps<typeof Dashboard>;
type Entry = { route: string; pathname: string; search: string; props?: DashboardProps };
const HOME: Entry = { route: 'home', pathname: '/dashboard', search: '' };
const PROFILE: Entry = { route: 'profile', pathname: '/dashboard/profile', search: '' };
const NOTIFICATIONS: Entry = { route: 'notifications', pathname: '/dashboard/notifications', search: '' };
const MESSAGES: Entry = { route: 'messages', pathname: '/dashboard/messages', search: '' };
const FOREIGN_PROFILE: Entry = {
  route: 'user-profile',
  pathname: '/dashboard/users/55',
  search: '',
  props: { initialViewedUserId: 55 },
};

async function mountDashboard(
  isMobile: boolean,
  entry: Entry,
  user: User | null,
  searchParams?: URLSearchParams | null,
) {
  mockPathname = entry.pathname;
  mockSearchParams = searchParams === undefined ? new URLSearchParams(entry.search) : searchParams;
  window.history.replaceState(null, '', entry.search ? `${entry.pathname}?${entry.search}` : entry.pathname);
  installViewport(isMobile);
  let view!: ReturnType<typeof render>;
  // Viacnásobný reťaz `await`ov v efektoch sa musí dobehnúť vnútri `act`,
  // inak ho RTL 13 zachytí mimo neho.
  await act(async () => {
    view = render(
      <AuthProvider>
        <ThemeProvider>
          <Dashboard initialUser={user ?? undefined} initialRoute={entry.route} {...entry.props} />
        </ThemeProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return view;
}

async function renderDashboard(isMobile = false, entry: Entry = HOME, user: User = baseUser) {
  const view = await mountDashboard(isMobile, entry, user);
  await waitFor(() => expect(activeModule()).toBe(entry.route));
  await settle();
  return view;
}

const ME_URL = '/auth/me/';
const answerMe = (reply: () => Promise<unknown>) =>
  mockApiGet.mockImplementation((url: string) => (url === ME_URL ? reply() : new Promise(() => {})));

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset();
  mockApiGet.mockImplementation(() => new Promise(() => {}));
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockLayoutProps = null;
  mockModalsProps = null;
  mockDesktopOnboardingProps = null;
  mockMobileOnboardingProps = null;
  mockRequestsProviderProps = null;
  mockPathname = '/dashboard';
  mockSearchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
  invalidateUserProfileCache(77);
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalInnerWidth,
  });
});

const clickSearch = () => act(() => layoutProps().onSidebarSearchClick?.());
const goTo = (moduleId: string) => act(() => routerProps().setActiveModule(moduleId));

type ElementLike = { type: unknown; props: Record<string, unknown> };
const asElement = (node: unknown) => node as ElementLike;
const searchPanel = () => asElement(layoutProps().searchOverlay);
const searchModule = () => asElement(searchPanel().props.children);
const notificationsPanel = () => asElement(layoutProps().notificationsOverlay);

const expectExactProps = (actual: unknown, names: string[]) =>
  expect(Object.keys(actual as object).sort()).toEqual([...names].sort());

describe('načítavanie a stav bez používateľa', () => {
  it('bez počiatočného používateľa ukáže načítavaciu obrazovku, kým sa prihlásený nezistí', async () => {
    await mountDashboard(false, HOME, null);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Načítavam dashboard...');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
    expect(mockRouterProps).toBeNull();
    expect(mockLayoutProps).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockClearAuthState).not.toHaveBeenCalled();
  });

  it('po odpovedi servera nahradí načítavaciu obrazovku obsahom s používateľom z odpovede', async () => {
    let respond: (value: unknown) => void = () => {};
    answerMe(() => new Promise((resolve) => { respond = resolve; }));
    await mountDashboard(false, HOME, null);
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => {
      respond({ status: 200, data: baseUser });
    });
    await waitFor(() => expect(activeModule()).toBe('home'));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(routerProps().user).toEqual(baseUser);
    expect(layoutProps().currentUser).toEqual(baseUser);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockClearAuthState).not.toHaveBeenCalled();
  });

  it('s počiatočným používateľom sa načítavacia obrazovka neukáže ani počas overovania', async () => {
    const view = await renderDashboard();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(view.container.querySelector('[aria-hidden="true"].min-h-screen')).toBeNull();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('bez prihláseného používateľa presmeruje na úvodnú stránku a ukáže prázdnu obrazovku', async () => {
    answerMe(() => Promise.resolve({ status: 401, data: null }));

    const view = await mountDashboard(false, HOME, null);
    await settle();

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/');
    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(mockRouterProps).toBeNull();
    expect(mockLayoutProps).toBeNull();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    const placeholder = view.container.querySelector('div.min-h-screen[aria-hidden="true"]');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeEmptyDOMElement();
  });
});

describe('názov účtu v mobilnej hlavičke', () => {
  it.each([
    ['meno a priezvisko spojí do jedného', { first_name: 'Anna', last_name: 'Nováková' }, 'Anna Nováková'],
    ['samotné krstné meno', { first_name: 'Anna', last_name: '' }, 'Anna'],
    ['samotné priezvisko', { first_name: '', last_name: 'Nováková' }, 'Nováková'],
    ['medzery okolo mena oreže', { first_name: '  ', last_name: 'Nováková' }, 'Nováková'],
    [
      'bez mena vezme názov firmy',
      { first_name: '', last_name: '', company_name: '  Acme s.r.o. ' },
      'Acme s.r.o.',
    ],
    [
      'medzerové meno aj firmu preskočí a vezme používateľské meno',
      { first_name: '   ', last_name: '', company_name: '   ', username: ' jana ' },
      'jana',
    ],
    [
      'bez mena, firmy aj používateľského mena ukáže „Profil“',
      { first_name: '', last_name: '', company_name: undefined, username: '  ' },
      'Profil',
    ],
    [
      'prázdne meno, firma aj používateľské meno ukážu „Profil“',
      { first_name: '', last_name: '', company_name: '', username: '' },
      'Profil',
    ],
  ])('%s', async (_title, override, expected) => {
    await renderDashboard(true, HOME, { ...baseUser, ...override } as User);

    expect(layoutProps().mobileAccountName).toBe(expected);
  });

  it('meno berie z prihláseného účtu, nie z počiatočného používateľa', async () => {
    answerMe(() =>
      Promise.resolve({ status: 200, data: { ...baseUser, first_name: 'Nové', last_name: 'Meno' } }),
    );
    await renderDashboard(true);

    await waitFor(() => expect(layoutProps().mobileAccountName).toBe('Nové Meno'));
    expect(routerProps().user.first_name).toBe('Test');
  });

  it('kým prihlásený účet nie je známy, meno vezme z počiatočného používateľa', async () => {
    await renderDashboard(true);

    expect(layoutProps().mobileAccountName).toBe('Test User');
  });
});

describe('sada props pre podriadené komponenty', () => {
  it('ModuleRouter dostane presne dohodnutú sadu props', async () => {
    await renderDashboard();

    expectExactProps(mockRouterProps, [
      'accountType', 'activeModule', 'activeRightItem', 'closeOwnProfileEdit', 'conversationIdForMessages',
      'customCategories', 'feedPostIdForDetail', 'handleRightSidebarToggle', 'highlightedSkillId',
      'initialProfileTab', 'isInSubcategories', 'isRightSidebarOpen', 'mobileAccountSettingsView',
      'offerIdForReviews', 'onCreatePortfolio', 'onDeleteOwnProfileOffer', 'onEditOwnProfileOffer',
      'onEditProfileClick', 'onManageOfferWatches', 'onMobileAccountSettingsViewChange',
      'onNotificationNavigate', 'onOwnProfileTabChange', 'onRetryViewedUserLoad',
      'onSkillsCategoryBackHandlerSet', 'onSkillsClick', 'onSkillsModeToggle', 'onSkillsOfferClick',
      'onSkillsSearchClick', 'onUserUpdate', 'onViewUserProfile', 'onViewUserSkillFromSearch',
      'ownProfileTab', 'portfolioCreateOwnerIdentifier', 'portfolioItemIdForDetail',
      'portfolioOwnerIdentifier', 'removeCustomCategory', 'removeStandardCategory', 'requestsRouteIntent',
      'selectedSkillsCategory', 'setAccountType', 'setActiveModule', 'setEditingCustomCategoryIndex',
      'setEditingStandardCategoryIndex', 'setIsAccountTypeModalOpen', 'setIsAddCustomCategoryModalOpen',
      'setIsInSubcategories', 'setIsPersonalAccountModalOpen', 'setIsSkillDescriptionModalOpen',
      'setIsSkillsCategoryModalOpen', 'setSelectedSkillsCategory', 'standardCategories',
      'targetUserIdForMessages', 'user', 'viewedUserId', 'viewedUserLoadError', 'viewedUserNotFound',
      'viewedUserSlug', 'viewedUserSummary',
    ]);
  });

  it('DashboardLayout dostane presne dohodnutú sadu props a obsah ako potomka', async () => {
    await renderDashboard();

    expectExactProps(mockLayoutProps, [
      'activeModule', 'activeRightItem', 'children', 'currentUser', 'desktopRightRail', 'isMobileMenuOpen',
      'isMobileMessageConversationOpen', 'isMobileOfferDetailOpen', 'isNotificationsPanelOpen',
      'isRightSidebarOpen', 'isSearchOpen', 'mobileAccountName', 'mobileAccountSettingsView',
      'mobileMessagePeerAvatarMembers', 'mobileMessagePeerAvatarUrl', 'mobileMessagePeerIdentifier',
      'mobileMessagePeerIsGroup', 'mobileMessagePeerName', 'notificationsOverlay', 'onLogout',
      'onMobileBack', 'onMobileMenuClose', 'onMobileMenuOpen', 'onMobileMessagesBack',
      'onMobileProfileClick', 'onModuleChange', 'onNotificationsPanelClose', 'onRightItemClick',
      'onRightSidebarClose', 'onSearchClose', 'onSidebarAccountSettingsClick', 'onSidebarAccountTypeClick',
      'onSidebarLanguageClick', 'onSidebarNotificationsClick', 'onSidebarPrivacyClick',
      'onSidebarSearchClick', 'onSkillSaveClick', 'onSkillsModeToggle', 'searchOverlay', 'subcategory',
      'viewedUserNotFound',
    ]);
    expect(screen.getByTestId('layout')).toContainElement(screen.getByTestId('module-state'));
  });

  it('modály dostanú stav účtu, používateľa a úplný stav zručností', async () => {
    await renderDashboard();

    expectExactProps(mockModalsProps, [
      'accountType', 'activeModule', 'isAccountTypeModalOpen', 'isPersonalAccountModalOpen',
      'onCreatedSkillSaved', 'onUserUpdate', 'setAccountType', 'setIsAccountTypeModalOpen',
      'setIsPersonalAccountModalOpen', 'skillsState', 't', 'user',
    ]);
    expect(mockModalsProps).toMatchObject({
      accountType: 'personal',
      activeModule: 'home',
      isAccountTypeModalOpen: false,
      isPersonalAccountModalOpen: false,
      user: baseUser,
    });
    expect(typeof mockModalsProps?.t).toBe('function');
    expectExactProps(mockModalsProps?.skillsState, [
      'applySkillUpdate', 'customCategories', 'editingCustomCategoryIndex', 'editingStandardCategoryIndex',
      'fetchSkillDetail', 'handleRemoveSkillImage', 'isAddCustomCategoryModalOpen',
      'isSkillDescriptionModalOpen', 'isSkillsCategoryModalOpen', 'loadSkills', 'removeCustomCategory',
      'removeStandardCategory', 'selectedSkillsCategory', 'setCustomCategories',
      'setEditingCustomCategoryIndex', 'setEditingStandardCategoryIndex', 'setIsAddCustomCategoryModalOpen',
      'setIsSkillDescriptionModalOpen', 'setIsSkillsCategoryModalOpen', 'setSelectedSkillsCategory',
      'setStandardCategories', 'standardCategories', 'toLocalSkill',
    ]);
  });

  it('oba providery sprievodcu dostanú presne dohodnutú sadu props', async () => {
    await renderDashboard();

    expectExactProps(mockDesktopOnboardingProps, [
      'activeModule', 'children', 'isMobileMenuOpen', 'isNotificationsPanelOpen', 'isProfileEditMode',
      'isRightSidebarOpen', 'isSearchOpen', 'onCloseSearch', 'onOpenEditProfile', 'onOpenHome',
      'onOpenMessages', 'onOpenProfile', 'onOpenRequests', 'onOpenSearch', 'onSkillCreatedHandlerSet',
      'serverState',
    ]);
    expectExactProps(mockMobileOnboardingProps, [
      'activeModule', 'children', 'isBlockedByUi', 'isProfileEditMode', 'onOpenEditProfile', 'onOpenHome',
      'onOpenMessages', 'onOpenProfile', 'onOpenRequests', 'onOpenSearch', 'onSkillCreatedHandlerSet',
      'serverState', 'userId',
    ]);
  });

  it('režim úpravy profilu je pre oboch sprievodcov zapnutý až po otvorení pravého panela', async () => {
    await renderDashboard(false, PROFILE);

    // Predvolená položka pravého panela je „edit-profile“ aj pri zatvorenom paneli.
    expect(routerProps().activeRightItem).toBe('edit-profile');
    expect(routerProps().isRightSidebarOpen).toBe(false);
    expect(mockDesktopOnboardingProps?.isProfileEditMode).toBe(false);
    expect(mockMobileOnboardingProps?.isProfileEditMode).toBe(false);

    act(() => routerProps().onEditProfileClick?.());

    expect(routerProps().isRightSidebarOpen).toBe(true);
    expect(mockDesktopOnboardingProps?.isProfileEditMode).toBe(true);
    expect(mockMobileOnboardingProps?.isProfileEditMode).toBe(true);
  });

  it('na Nástenke dostane ModuleRouter východiskové hodnoty', async () => {
    await renderDashboard();

    expect(routerProps()).toMatchObject({
      user: baseUser,
      activeModule: 'home',
      activeRightItem: 'edit-profile',
      isRightSidebarOpen: false,
      accountType: 'personal',
      viewedUserId: null,
      viewedUserSlug: null,
      viewedUserNotFound: false,
      viewedUserLoadError: false,
      viewedUserSummary: null,
      highlightedSkillId: null,
      ownProfileTab: 'offers',
      offerIdForReviews: null,
      feedPostIdForDetail: null,
      portfolioItemIdForDetail: null,
      portfolioOwnerIdentifier: null,
      portfolioCreateOwnerIdentifier: null,
      conversationIdForMessages: null,
      targetUserIdForMessages: null,
      requestsRouteIntent: null,
      mobileAccountSettingsView: 'overview',
      isInSubcategories: false,
      selectedSkillsCategory: null,
    });
  });

  it('na Nástenke dostane DashboardLayout východiskové hodnoty', async () => {
    await renderDashboard();

    expect(layoutProps()).toMatchObject({
      activeModule: 'home',
      activeRightItem: 'edit-profile',
      currentUser: baseUser,
      viewedUserNotFound: false,
      isRightSidebarOpen: false,
      isMobileMenuOpen: false,
      isSearchOpen: false,
      isNotificationsPanelOpen: false,
      isMobileMessageConversationOpen: false,
      isMobileOfferDetailOpen: false,
      mobileMessagePeerAvatarUrl: null,
      mobileMessagePeerAvatarMembers: [],
      mobileMessagePeerIsGroup: false,
      mobileMessagePeerIdentifier: null,
      mobileAccountSettingsView: 'overview',
      subcategory: null,
      desktopRightRail: null,
    });
    expect(layoutProps().mobileMessagePeerName).toBeUndefined();
    expect(layoutProps().onSkillSaveClick).toBeUndefined();
  });

  it('pri popise zručnosti dostane DashboardLayout podkategóriu a obsluhu uloženia', async () => {
    await renderDashboard();
    act(() => routerProps().setSelectedSkillsCategory({ category: 'Doučovanie', subcategory: 'Matematika' }));
    expect(layoutProps().subcategory).toBeNull();

    goTo('skills-describe');

    expect(layoutProps().subcategory).toBe('Matematika');
    expect(typeof layoutProps().onSkillSaveClick).toBe('function');

    goTo('home');

    expect(layoutProps().subcategory).toBeNull();
    expect(layoutProps().onSkillSaveClick).toBeUndefined();
  });

  it('bez parametrov adresy (useSearchParams vráti null) sa Správy otvoria bez konverzácie', async () => {
    await mountDashboard(false, MESSAGES, baseUser, null);
    await waitFor(() => expect(activeModule()).toBe('messages'));
    await settle();

    expect(routerProps().conversationIdForMessages).toBeNull();
    expect(routerProps().targetUserIdForMessages).toBeNull();
    expect(layoutProps().isMobileMessageConversationOpen).toBe(false);
  });
});

describe('panel hľadania (searchOverlay)', () => {
  it('obalí SearchModule kotvou sprievodcu a podá mu používateľa aj stav panela', async () => {
    await renderDashboard();

    expect(searchPanel().type).toBe('div');
    expect(searchPanel().props.className).toBe('h-full');
    expect(searchPanel().props['data-desktop-onboarding']).toBe('search-panel');
    expect(searchModule().type).toBe(SearchModule);
    expect(searchModule().props.user).toEqual(baseUser);
    expect(searchModule().props.isOverlay).toBe(true);
    expect(searchModule().props.isActive).toBe(false);

    clickSearch();

    expect(layoutProps().isSearchOpen).toBe(true);
    expect(searchModule().props.isActive).toBe(true);
  });

  it('zatvorenie z panela ho zatvorí', async () => {
    await renderDashboard();
    clickSearch();
    expect(searchModule().props.isActive).toBe(true);

    act(() => (searchModule().props.onClose as () => void)());

    expect(layoutProps().isSearchOpen).toBe(false);
    expect(searchModule().props.isActive).toBe(false);
  });

  it('výsledok hľadania otvorí profil používateľa a panel zavrie', async () => {
    await renderDashboard();
    clickSearch();

    act(() => (searchModule().props.onUserClick as (id: number, slug: string) => void)(55, 'jana-novak'));

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBe(55);
    expect(routerProps().viewedUserSlug).toBe('jana-novak');
    expect(layoutProps().isSearchOpen).toBe(false);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/users/jana-novak');
  });

  it('výsledok hľadania so zručnosťou otvorí profil so zvýraznenou zručnosťou', async () => {
    await renderDashboard();
    clickSearch();

    act(() =>
      (searchModule().props.onSkillClick as (id: number, skillId: number, slug: string) => void)(
        55,
        9,
        'jana-novak',
      ),
    );

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBe(55);
    expect(routerProps().viewedUserSlug).toBe('jana-novak');
    expect(layoutProps().isSearchOpen).toBe(false);
    expect(window.location.pathname + window.location.search).toBe('/dashboard/users/jana-novak?highlight=9');
  });

  it('obsluha onViewUserProfile z ModuleRouteru otvorí cudzí profil rovnako ako výsledok hľadania', async () => {
    await renderDashboard();

    act(() => routerProps().onViewUserProfile?.(56, 'peter', undefined));

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBe(56);
    expect(routerProps().viewedUserSlug).toBe('peter');
  });
});

describe('panel upozornení (notificationsOverlay)', () => {
  it('je to NotificationsFeed v režime panela', async () => {
    await renderDashboard();

    expect(notificationsPanel().type).toBe(NotificationsFeed);
    expect(notificationsPanel().props.variant).toBe('panel');
  });

  it('kliknutie na upozornenie prepne modul rovnako ako obsluha v ModuleRouteri', async () => {
    await renderDashboard();

    act(() => (notificationsPanel().props.onNavigate as (url: string) => void)('/dashboard/requests?tab=sent'));

    expect(activeModule()).toBe('requests');
    expect(routerProps().requestsRouteIntent).not.toBeNull();
  });
});

describe('pravý stĺpec Správ (desktopRightRail)', () => {
  const rail = () => asElement(layoutProps().desktopRightRail);

  it('mimo Správ nie je žiadny', async () => {
    await renderDashboard();

    expect(layoutProps().desktopRightRail).toBeNull();
  });

  it('v Správach ukáže zoznam konverzácií s ID prihláseného používateľa', async () => {
    await renderDashboard(false, MESSAGES);

    expect(rail().type).toBe(MessagesDesktopRail);
    expect(rail().props.currentUserId).toBe(1);
    expect(rail().props.selectedConversationId).toBeNull();
  });

  it('vybraná konverzácia z adresy sa podá stĺpcu', async () => {
    await renderDashboard(false, { route: 'messages', pathname: '/dashboard/messages/5', search: '' });

    expect(rail().props.selectedConversationId).toBe(5);
  });

  it('vybraná konverzácia z dotazu sa podá stĺpcu', async () => {
    await renderDashboard(false, { ...MESSAGES, search: 'conversationId=9' });

    expect(rail().props.selectedConversationId).toBe(9);
  });

  it('po odchode zo Správ stĺpec zmizne', async () => {
    await renderDashboard(false, MESSAGES);
    expect(layoutProps().desktopRightRail).not.toBeNull();

    goTo('home');

    expect(layoutProps().desktopRightRail).toBeNull();
  });
});

describe('lišta detailu ponuky na mobile', () => {
  it('na vlastnom profile ju zapína a vypína udalosť detailu ponuky', async () => {
    await renderDashboard(true, PROFILE);
    expect(layoutProps().isMobileOfferDetailOpen).toBe(false);

    act(() => dispatchProfileOfferDetailOpen());
    expect(layoutProps().isMobileOfferDetailOpen).toBe(true);

    act(() => dispatchProfileOfferDetailClose());
    expect(layoutProps().isMobileOfferDetailOpen).toBe(false);
  });

  it('na cudzom profile ju zapína a vypína tá istá udalosť', async () => {
    await renderDashboard(true, FOREIGN_PROFILE);
    expect(activeModule()).toBe('user-profile');

    act(() => dispatchProfileOfferDetailOpen());
    expect(layoutProps().isMobileOfferDetailOpen).toBe(true);

    act(() => dispatchProfileOfferDetailClose());
    expect(layoutProps().isMobileOfferDetailOpen).toBe(false);
  });

  it('mimo profilu ju udalosť nezapne', async () => {
    await renderDashboard(true);

    act(() => dispatchProfileOfferDetailOpen());

    expect(layoutProps().isMobileOfferDetailOpen).toBe(false);
  });

  it('odchod z profilu ju skryje', async () => {
    await renderDashboard(true, PROFILE);
    act(() => dispatchProfileOfferDetailOpen());
    expect(layoutProps().isMobileOfferDetailOpen).toBe(true);

    goTo('home');

    expect(layoutProps().isMobileOfferDetailOpen).toBe(false);
  });

  it('po odmountovaní odoberie obe počúvania na okne', async () => {
    const added = jest.spyOn(window, 'addEventListener');
    const removed = jest.spyOn(window, 'removeEventListener');
    const view = await renderDashboard(true, PROFILE);
    const handlerFor = (spy: jest.SpyInstance, type: string) =>
      spy.mock.calls.filter(([name]) => name === type).map(([, handler]) => handler);
    const opened = handlerFor(added, 'profile:offer-detail-open');
    const closed = handlerFor(added, 'profile:offer-detail-close');
    expect(opened.length).toBeGreaterThan(0);
    expect(closed.length).toBeGreaterThan(0);

    view.unmount();

    expect(handlerFor(removed, 'profile:offer-detail-open')).toEqual(expect.arrayContaining(opened));
    expect(handlerFor(removed, 'profile:offer-detail-close')).toEqual(expect.arrayContaining(closed));
  });
});

describe('profil, ktorý sa nepodarilo načítať', () => {
  const foreignSlug = (slug: string): Entry => ({
    route: 'user-profile',
    pathname: `/dashboard/users/${slug}`,
    search: '',
    props: { initialProfileSlug: slug },
  });
  const failProfile = (slug: string, status: number) =>
    mockApiGet.mockImplementation((url: string) =>
      url === `/profile/slug/${slug}/` ? Promise.reject({ response: { status } }) : new Promise(() => {}),
    );

  it('neexistujúci profil (404) je pre ModuleRouter „nenájdený“ a pre DashboardLayout nedostupný', async () => {
    failProfile('nikto', 404);

    await renderDashboard(false, foreignSlug('nikto'));
    await waitFor(() => expect(routerProps().viewedUserNotFound).toBe(true));

    expect(routerProps().viewedUserLoadError).toBe(false);
    expect(layoutProps().viewedUserNotFound).toBe(true);
  });

  it('chyba načítania (5xx) je pre ModuleRouter chyba a pre DashboardLayout tiež nedostupný profil', async () => {
    failProfile('chybny', 500);

    await renderDashboard(false, foreignSlug('chybny'));
    await waitFor(() => expect(routerProps().viewedUserLoadError).toBe(true));

    expect(routerProps().viewedUserNotFound).toBe(false);
    expect(layoutProps().viewedUserNotFound).toBe(true);
  });

  it('nový pokus zopakuje načítanie a po úspechu chybu zruší', async () => {
    failProfile('opakovany', 500);
    await renderDashboard(false, foreignSlug('opakovany'));
    await waitFor(() => expect(routerProps().viewedUserLoadError).toBe(true));
    mockApiGet.mockClear();
    mockApiGet.mockImplementation((url: string) =>
      url === '/profile/slug/opakovany/'
        ? Promise.resolve({ data: { ...baseUser, id: 77, slug: 'opakovany' } })
        : new Promise(() => {}),
    );

    act(() => routerProps().onRetryViewedUserLoad?.());

    await waitFor(() => expect(routerProps().viewedUserId).toBe(77));
    expect(routerProps().viewedUserLoadError).toBe(false);
    expect(layoutProps().viewedUserNotFound).toBe(false);
    expect(mockApiGet.mock.calls.filter(([url]) => url === '/profile/slug/opakovany/')).toHaveLength(1);
  });
});

describe('odznaky nových položiek (RequestsNotificationsProvider)', () => {
  it.each([
    ['Nástenke', HOME, false, false],
    ['Upozorneniach', NOTIFICATIONS, true, false],
    ['Správach', MESSAGES, false, true],
  ])('na %s potvrdzuje odznaky podľa modulu', async (_title, entry, notifications, messages) => {
    await renderDashboard(false, entry);

    expect(mockRequestsProviderProps?.acknowledgeNotificationsBadge).toBe(notifications);
    expect(mockRequestsProviderProps?.acknowledgeMessagesBadge).toBe(messages);
  });

  it('otvorený panel upozornení potvrdzuje odznak upozornení aj mimo modulu Upozornenia', async () => {
    await renderDashboard();
    expect(mockRequestsProviderProps?.acknowledgeNotificationsBadge).toBe(false);

    act(() => layoutProps().onSidebarNotificationsClick?.());

    expect(layoutProps().isNotificationsPanelOpen).toBe(true);
    expect(mockRequestsProviderProps?.acknowledgeNotificationsBadge).toBe(true);
    expect(mockRequestsProviderProps?.acknowledgeMessagesBadge).toBe(false);
  });
});

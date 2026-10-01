// Desktopové Nastavenia v celom Dashboarde: pravý panel a šípka nikdy nezmiznú, stred nie je prázdny a šípka vedie na pôvod.

import React from 'react';
import { act, configure, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import type { User } from '@/types';
import { resetProfileActionLock } from '../modules/profile/useProfileActionLock';

configure({ asyncUtilTimeout: 3000 });
jest.setTimeout(60000);

jest.mock('../contexts/RequestsNotificationsContext', () => {
  const { createElement, Fragment } = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    RequestsNotificationsProvider: ({ children }: { children?: React.ReactNode }) =>
      createElement(Fragment, null, children),
    useRequestsNotifications: () => ({
      unreadCount: 0,
      refreshUnreadCount: jest.fn(),
      markAllRead: jest.fn(),
    }),
    useMessagesNotifications: () => ({
      unreadCount: 0,
      refreshUnreadCount: jest.fn(),
      setActiveConversationId: jest.fn(),
      syncConversationReadState: jest.fn(),
    }),
    useNotificationsUnread: () => ({
      unreadCount: 0,
      refreshUnreadCount: jest.fn(),
      markAllRead: jest.fn(),
    }),
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}));

jest.mock('../../../utils/auth', () => ({
  isAuthenticated: () => true,
  clearAuthState: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    refreshUser: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  }),
}));

const user: User = {
  id: 1,
  username: 'user',
  email: 'user@example.com',
  first_name: 'User',
  last_name: 'Test',
  slug: 'user-test',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  profile_completeness: 50,
  mobile_onboarding: { version: 1, status: 'completed', step: 'dashboard_finish' },
  desktop_onboarding: { version: 1, status: 'completed', step: 'dashboard_finish' },
};

const PROFILE_PATH = '/dashboard/users/user-test';
const EDIT_PATH = `${PROFILE_PATH}/edit`;

const SECTIONS: Array<[string, string]> = [
  ['Upozornenia', '/dashboard/settings/notifications'],
  ['Sledovanie', '/dashboard/settings/watches'],
  ['Jazyk', '/dashboard/language'],
  ['Typ účtu', '/dashboard/account-type'],
  ['Nastavenia súkromia', '/dashboard/privacy'],
  ['Blokované', '/dashboard/settings/blocked'],
  ['Účet', '/dashboard/settings/account'],
];

const SETTINGS_PATHNAMES = new Set([
  '/dashboard/settings',
  '/dashboard/settings/notifications',
  '/dashboard/settings/watches',
  '/dashboard/settings/account',
  '/dashboard/settings/blocked',
  '/dashboard/language',
  '/dashboard/privacy',
  '/dashboard/account-type',
  EDIT_PATH,
]);

const url = () => `${window.location.pathname}${window.location.search}`;

function isHiddenAtDesktop(el: Element) {
  const cls = el.classList;
  if (cls.contains('lg:hidden')) return true;
  return (
    cls.contains('hidden') &&
    !(
      cls.contains('lg:flex') ||
      cls.contains('lg:block') ||
      cls.contains('lg:grid') ||
      cls.contains('lg:inline') ||
      cls.contains('lg:inline-flex')
    )
  );
}

function isHiddenAtMobile(el: Element) {
  const cls = el.classList;
  if (cls.contains('max-lg:hidden')) return true;
  return cls.contains('hidden') && !cls.contains('max-lg:block') && !cls.contains('max-lg:flex');
}

function visibleText(node: Node, isHidden: (el: Element) => boolean): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  if (isHidden(el)) return '';
  return Array.from(el.childNodes)
    .map((child) => visibleText(child, isHidden))
    .join(' ');
}

function currentMain(): HTMLElement {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) throw new Error('chýba <main data-dashboard-main>');
  return main;
}

function isBlank(isHidden: (el: Element) => boolean) {
  return visibleText(currentMain(), isHidden).replace(/\s+/g, ' ').trim().length === 0;
}

function desktopBackArrow(): HTMLElement | null {
  const main = document.querySelector('[data-dashboard-main]');
  if (!main) return null;
  const candidates = Array.from(main.querySelectorAll<HTMLElement>('button[aria-label="Späť"]'));
  return (
    candidates.find((btn) => {
      let node: Element | null = btn;
      while (node && node !== main) {
        if (isHiddenAtDesktop(node)) return false;
        node = node.parentElement;
      }
      return true;
    }) ?? null
  );
}

function desktopScreen() {
  return {
    path: window.location.pathname,
    panel: Boolean(screen.queryByText('Použitie aplikácie')),
    arrow: desktopBackArrow() !== null,
    blank: isBlank(isHiddenAtDesktop),
  };
}

function expectSettingsScreen(path: string, step = 'now') {
  expect({ step, ...desktopScreen() }).toEqual({
    step,
    path,
    panel: true,
    arrow: true,
    blank: false,
  });
}

function expectNothingStranded(step: string) {
  const state = desktopScreen();
  if (SETTINGS_PATHNAMES.has(window.location.pathname)) {
    expect({ step, ...state }).toEqual({
      step,
      path: state.path,
      panel: true,
      arrow: true,
      blank: false,
    });
  } else {
    expect({ step, path: state.path, blank: state.blank }).toEqual({
      step,
      path: state.path,
      blank: false,
    });
  }
}

function leftHighlight(): string[] {
  return Array.from(document.querySelectorAll('[data-sidebar-nav-item]'))
    .filter((el) => /purple-100/.test(el.className))
    .map((el) => el.getAttribute('data-sidebar-nav-item') ?? '');
}

async function settle(ms = 60) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

function rightPanel(): HTMLElement {
  const nav = screen.getByText('Použitie aplikácie').closest('nav');
  if (!nav) throw new Error('chýba pravý panel');
  return nav as HTMLElement;
}

async function clickRight(name: string) {
  await act(async () => {
    fireEvent.click(within(rightPanel()).getByRole('button', { name: new RegExp(name) }));
  });
  await settle();
}

async function clickLeft(id: string) {
  await act(async () => {
    const el = document.querySelector(`[data-sidebar-nav-item="${id}"]`);
    if (!el) throw new Error(`chýba ľavá položka ${id}`);
    fireEvent.click(el);
  });
  await settle();
}

async function clickBackArrow() {
  const arrow = desktopBackArrow();
  if (!arrow) throw new Error('žiadna viditeľná desktopová šípka');
  await act(async () => {
    fireEvent.click(arrow);
  });
  await settle(150);
}

async function clickEditProfileButton() {
  await act(async () => {
    const all = await screen.findAllByText('Upraviť profil');
    fireEvent.click(all[0]);
  });
  await settle();
}

async function historyGo(delta: number) {
  await act(async () => {
    const popped = new Promise<void>((resolve) => {
      const onPop = () => resolve();
      window.addEventListener('popstate', onPop, { once: true });
      setTimeout(() => {
        window.removeEventListener('popstate', onPop);
        resolve();
      }, 600);
    });
    window.history.go(delta);
    await popped;
    await new Promise((resolve) => setTimeout(resolve, 120));
  });
}

async function togglePrivacyAndConfirm() {
  const toggle = Array.from(currentMain().querySelectorAll<HTMLElement>('button')).find((b) =>
    b.className.includes('w-11'),
  );
  if (!toggle) throw new Error('chýba prepínač súkromia');
  await act(async () => {
    fireEvent.click(toggle);
  });
  await settle();
  const confirm = await screen.findByRole('button', { name: 'Zmeniť' });
  await act(async () => {
    fireEvent.click(confirm);
  });
  await settle(150);
}

function renderAt(route: string, path: string) {
  window.history.replaceState(null, '', path);
  render(
    <ThemeProvider>
      <Dashboard initialUser={user} initialRoute={route} />
    </ThemeProvider>,
  );
}

const LG_QUERY = '(max-width: 1023px)';
const originalMatchMedia = window.matchMedia;
const originalInnerWidth = window.innerWidth;
let viewportIsMobile = false;
const lgChangeListeners = new Set<() => void>();

function setInnerWidth(value: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value });
}

function installViewport(isMobile: boolean) {
  viewportIsMobile = isMobile;
  lgChangeListeners.clear();
  setInnerWidth(isMobile ? 390 : 1024);
  window.matchMedia = jest.fn().mockImplementation((query: string) => {
    const isLg = query === LG_QUERY;
    return {
      get matches() {
        return isLg && viewportIsMobile;
      },
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: (type: string, listener: () => void) => {
        if (isLg && type === 'change') lgChangeListeners.add(listener);
      },
      removeEventListener: (type: string, listener: () => void) => {
        if (isLg && type === 'change') lgChangeListeners.delete(listener);
      },
      dispatchEvent: jest.fn(),
    };
  });
}

function restoreViewport() {
  window.matchMedia = originalMatchMedia;
  setInnerWidth(originalInnerWidth);
  lgChangeListeners.clear();
  viewportIsMobile = false;
}

async function resizeTo(isMobile: boolean) {
  viewportIsMobile = isMobile;
  setInnerWidth(isMobile ? 390 : 1024);
  await act(async () => {
    lgChangeListeners.forEach((listener) => listener());
    window.dispatchEvent(new Event('resize'));
  });
  await settle(150);
}

beforeEach(() => {
  resetProfileActionLock();
  jest.spyOn(api, 'get').mockImplementation(async (apiUrl: string) => {
    if (String(apiUrl).includes('push')) return { data: {} } as never;
    return { data: [] } as never;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function openProfileEdit() {
  renderAt('profile', PROFILE_PATH);
  await settle();
  const profileUrl = url();
  await clickEditProfileButton();
  expectSettingsScreen(EDIT_PATH);
  return profileUrl;
}

async function openSettingsFromLeftMenu(origin: { route: string; path: string }) {
  renderAt(origin.route, origin.path);
  await settle();
  const originUrl = url();
  await clickLeft('settings');
  expectSettingsScreen('/dashboard/settings');
  return originUrl;
}

describe('variant 1: vstup cez profil a „Upraviť profil"', () => {
  it('Upraviť profil → Upozornenia → Sledovanie → Jazyk: šípka vedie rovno na profil', async () => {
    const profileUrl = await openProfileEdit();
    await clickRight('Upozornenia');
    expectSettingsScreen('/dashboard/settings/notifications');
    await clickRight('Sledovanie');
    expectSettingsScreen('/dashboard/settings/watches');
    await clickRight('Jazyk');
    expectSettingsScreen('/dashboard/language');

    await clickBackArrow();

    expect(url()).toBe(profileUrl);
    expect(screen.queryByText('Použitie aplikácie')).not.toBeInTheDocument();
    expect(await screen.findAllByText('Upraviť profil')).not.toHaveLength(0);
  });

  it.each(SECTIONS)('%s: pravý panel aj šípka sú vidieť a šípka vedie rovno na profil', async (name, path) => {
    const profileUrl = await openProfileEdit();

    await clickRight(name);
    expectSettingsScreen(path);
    await clickBackArrow();

    expect(url()).toBe(profileUrl);
    expect(screen.queryByText('Použitie aplikácie')).not.toBeInTheDocument();
    await historyGo(1);
    expect(window.location.pathname).toBe(EDIT_PATH);
  });

  it('šípka priamo z „Upraviť profil" vedie na profil ako doteraz', async () => {
    await openProfileEdit();

    await clickBackArrow();

    expect(url().split('?')[0]).toBe(PROFILE_PATH);
    expect(screen.queryByText('Použitie aplikácie')).not.toBeInTheDocument();
  });

  it('prehliadačové Späť a Vpred: žiadna obrazovka Nastavení neostane bez panela a šípky', async () => {
    await openProfileEdit();
    await clickRight('Upozornenia');
    await clickRight('Sledovanie');
    await clickRight('Jazyk');

    const back = [
      '/dashboard/settings/watches',
      '/dashboard/settings/notifications',
      EDIT_PATH,
      PROFILE_PATH,
    ];
    for (const [index, expected] of back.entries()) {
      await historyGo(-1);
      expect(window.location.pathname).toBe(expected);
      expectNothingStranded(`späť ${index + 1}`);
    }

    const forward = [
      EDIT_PATH,
      '/dashboard/settings/notifications',
      '/dashboard/settings/watches',
      '/dashboard/language',
    ];
    for (const [index, expected] of forward.entries()) {
      await historyGo(1);
      expect(window.location.pathname).toBe(expected);
      expectNothingStranded(`vpred ${index + 1}`);
    }
  });

  it('po kroku Späť v prehliadači vedie šípka stále rovno na profil', async () => {
    const profileUrl = await openProfileEdit();
    await clickRight('Upozornenia');
    await clickRight('Sledovanie');
    await clickRight('Jazyk');
    await historyGo(-1);
    expectSettingsScreen('/dashboard/settings/watches');

    await clickBackArrow();

    expect(url()).toBe(profileUrl);
    expect(screen.queryByText('Použitie aplikácie')).not.toBeInTheDocument();
  });
});

describe('variant 2: vstup cez ľavé menu „Nastavenia"', () => {
  it('Nástenka → Nastavenia → Súkromie → Účet → Jazyk: prvá šípka vedie na Nástenku', async () => {
    const homeUrl = await openSettingsFromLeftMenu({ route: 'home', path: '/dashboard' });
    await clickRight('Nastavenia súkromia');
    expectSettingsScreen('/dashboard/privacy');
    await clickRight('Účet');
    expectSettingsScreen('/dashboard/settings/account');
    await clickRight('Jazyk');
    expectSettingsScreen('/dashboard/language');

    await clickBackArrow();

    expect(url()).toBe(homeUrl);
    expect(screen.queryByText('Použitie aplikácie')).not.toBeInTheDocument();
    expect(leftHighlight()).toContain('home');
  });

  it.each(SECTIONS)('%s: pravý panel aj šípka sú vidieť a šípka vedie rovno na Nástenku', async (name, path) => {
    const homeUrl = await openSettingsFromLeftMenu({ route: 'home', path: '/dashboard' });

    await clickRight(name);
    expectSettingsScreen(path);
    await clickBackArrow();

    expect(url()).toBe(homeUrl);
    expect(screen.queryByText('Použitie aplikácie')).not.toBeInTheDocument();
    await historyGo(1);
    expect(window.location.pathname).toBe('/dashboard/settings');
  });

  it('vstup z inej obrazovky vedie šípka späť na ňu, nie na Nástenku', async () => {
    renderAt('home', '/dashboard');
    await settle();
    await clickLeft('favorites');
    const favoritesUrl = url();
    await clickLeft('settings');
    await clickRight('Upozornenia');
    await clickRight('Nastavenia súkromia');

    await clickBackArrow();

    expect(url()).toBe(favoritesUrl);
    expect(screen.queryByText('Použitie aplikácie')).not.toBeInTheDocument();
    expect(leftHighlight()).toContain('favorites');
  });

  it('zoznam Nastavení bez sekcie: šípka vedie na pôvod ako doteraz', async () => {
    const homeUrl = await openSettingsFromLeftMenu({ route: 'home', path: '/dashboard' });

    await clickBackArrow();

    expect(url()).toBe(homeUrl);
    expect(screen.queryByText('Použitie aplikácie')).not.toBeInTheDocument();
  });

  it('prehliadačové Späť a Vpred: žiadna obrazovka Nastavení neostane bez panela a šípky', async () => {
    await openSettingsFromLeftMenu({ route: 'home', path: '/dashboard' });
    await clickRight('Nastavenia súkromia');
    await clickRight('Účet');
    await clickRight('Jazyk');

    const back = ['/dashboard/settings/account', '/dashboard/privacy', '/dashboard/settings', '/dashboard'];
    for (const [index, expected] of back.entries()) {
      await historyGo(-1);
      expect(window.location.pathname).toBe(expected);
      expectNothingStranded(`späť ${index + 1}`);
    }

    const forward = [
      '/dashboard/settings',
      '/dashboard/privacy',
      '/dashboard/settings/account',
      '/dashboard/language',
    ];
    for (const [index, expected] of forward.entries()) {
      await historyGo(1);
      expect(window.location.pathname).toBe(expected);
      expectNothingStranded(`vpred ${index + 1}`);
    }
  });
});

describe('priame otvorenie obrazovky Nastavení (F5 / odkaz) na desktope', () => {
  it.each([
    ['notification-settings', '/dashboard/settings/notifications'],
    ['privacy', '/dashboard/privacy'],
    ['account-type', '/dashboard/account-type'],
    ['language', '/dashboard/language'],
    ['account-settings', '/dashboard/settings/account'],
    ['blocked-users', '/dashboard/settings/blocked'],
    ['settings', '/dashboard/settings'],
    ['settings', '/dashboard/settings/watches'],
    ['profile', EDIT_PATH],
  ])('%s %s má pravý panel, šípku a neprázdny stred', async (route, path) => {
    renderAt(route, path);
    await settle(150);

    expectSettingsScreen(path);
  });
});

describe('zmena súkromia na desktope', () => {
  beforeEach(() => {
    jest.spyOn(api, 'patch').mockResolvedValue({ data: { user: { ...user, is_public: false } } } as never);
  });

  it('po potvrdení z „Upraviť profil" pravý panel ostáva otvorený a stred nie je prázdny', async () => {
    await openProfileEdit();
    await clickRight('Nastavenia súkromia');

    await togglePrivacyAndConfirm();

    expectSettingsScreen('/dashboard/privacy');
  });

  it('po potvrdení z ľavého menu Nastavenia pravý panel ostáva otvorený a stred nie je prázdny', async () => {
    await openSettingsFromLeftMenu({ route: 'home', path: '/dashboard' });
    await clickRight('Nastavenia súkromia');

    await togglePrivacyAndConfirm();

    expectSettingsScreen('/dashboard/privacy');
  });

  it('po potvrdení a odchode cez ľavé menu nezostane prázdna žiadna obrazovka', async () => {
    await openProfileEdit();
    await clickRight('Nastavenia súkromia');
    await togglePrivacyAndConfirm();

    await clickLeft('profile');
    expect(isBlank(isHiddenAtDesktop)).toBe(false);
    await clickLeft('home');
    expect(isBlank(isHiddenAtDesktop)).toBe(false);
  });

  it('priame otvorenie /dashboard/privacy a potvrdenie: panel ostáva otvorený', async () => {
    renderAt('privacy', '/dashboard/privacy');
    await settle(150);

    await togglePrivacyAndConfirm();

    expectSettingsScreen('/dashboard/privacy');
  });
});

describe('súkromie pri zmene šírky okna', () => {
  afterEach(() => {
    restoreViewport();
  });

  it('mobil: priame otvorenie /dashboard/privacy, potom roztiahnutie na desktop', async () => {
    installViewport(true);
    renderAt('privacy', '/dashboard/privacy');
    await settle(200);
    expect(isBlank(isHiddenAtMobile)).toBe(false);

    await resizeTo(false);

    expect(isBlank(isHiddenAtDesktop)).toBe(false);
  });

  it('mobil: Menu → Súkromie, potom roztiahnutie na desktop', async () => {
    installViewport(true);
    renderAt('profile', PROFILE_PATH);
    await settle(200);
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /Menu/ })[0]);
    });
    await settle();
    await act(async () => {
      const items = screen.getAllByText('Súkromie');
      fireEvent.click(items[items.length - 1]);
    });
    await settle(150);
    expect(isBlank(isHiddenAtMobile)).toBe(false);

    await resizeTo(false);

    expect(isBlank(isHiddenAtDesktop)).toBe(false);
  });

  it('desktop: Súkromie v paneli, zúženie na mobil a späť na desktop', async () => {
    installViewport(false);
    await openProfileEdit();
    await clickRight('Nastavenia súkromia');

    await resizeTo(true);
    expect(isBlank(isHiddenAtMobile)).toBe(false);
    await resizeTo(false);

    expect(isBlank(isHiddenAtDesktop)).toBe(false);
  });
});

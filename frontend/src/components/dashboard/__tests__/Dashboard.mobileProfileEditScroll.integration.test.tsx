/**
 * Mobil, celý reťazec so skutočným `Dashboard`: úprava profilu je samostatná
 * obrazovka, takže scroll formulára (tlačidlo „Uložiť" je úplne dole) sa po
 * uložení ani po zrušení neprenáša do profilu.
 *
 * Jednotlivé články reťazca majú vlastné testy (`DashboardMainIdentitySweep`,
 * `ProfileModule.saveScroll`); tento overuje, že do seba zapadajú – stav
 * z `useDashboardState` a kľúč `<main>`. Desktop pokrýva
 * `Dashboard.profileSaveScroll.integration`.
 */

import React from 'react';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import type { User } from '@/types';

// Celý Dashboard + viackrokový reťazec: na pomalom CI nestačí predvolená 1 s / 5 s rezerva.
configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15000);

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
  // Bez dokončeného tutoriálu by jeho PATCH dostal odpoveď mocknutého uloženia profilu a zacyklil sa.
  mobile_onboarding: { version: 1, status: 'completed', step: 'dashboard_finish' },
};

const savedUser: User = { ...user, first_name: 'Upravený', updated_at: '2024-01-01' };

/** Poloha scrollu prvkov – jsdom drží `scrollTop` stále na 0, prehliadač si ho pamätá. */
const scrollPositions = new WeakMap<Element, number>();
const mainWrites: Array<{ element: Element; value: number }> = [];
const originalMatchMedia = window.matchMedia;

function currentMain(): HTMLElement {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) throw new Error('chýba <main data-dashboard-main>');
  return main;
}

/** Užívateľ odscrolloval `<main>` – prehliadač zmenil pozíciu, JavaScript nič nezapísal. */
function userScrolls(main: HTMLElement, position: number) {
  scrollPositions.set(main, position);
}

async function waitOutScrollRestoreWindow() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
}

async function openProfileEditForm(): Promise<HTMLElement> {
  render(
    <ThemeProvider>
      <Dashboard initialUser={user} initialRoute="profile" />
    </ThemeProvider>,
  );

  const profileMain = currentMain();
  fireEvent.click((await screen.findAllByText('Upraviť profil'))[0]);
  await screen.findByRole('button', { name: 'Uložiť' });

  const formMain = currentMain();
  expect(formMain).not.toBe(profileMain);
  expect(profileMain.isConnected).toBe(false);
  return formMain;
}

describe('Dashboard na mobile: scroll úpravy profilu sa do profilu neprenáša', () => {
  beforeEach(() => {
    mainWrites.length = 0;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 1023px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    // Zoznam ponúk profilu: bez mocku by test poslal skutočný HTTP dotaz na localhost:8000.
    jest.spyOn(api, 'get').mockResolvedValue({ data: [] });
    jest.spyOn(Element.prototype, 'scrollTop', 'get').mockImplementation(function (this: Element) {
      return scrollPositions.get(this) ?? 0;
    });
    jest.spyOn(Element.prototype, 'scrollTop', 'set').mockImplementation(function (this: Element, value: number) {
      if (this.hasAttribute('data-dashboard-main')) mainWrites.push({ element: this, value });
      scrollPositions.set(this, value);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
  });

  it('uloženie zo scrollnutého formulára: profil sa otvorí v NOVOM <main> od začiatku', async () => {
    jest.spyOn(api, 'patch').mockResolvedValue({ data: { user: savedUser } });
    const formMain = await openProfileEditForm();
    userScrolls(formMain, 1240);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Uložiť' }));
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Uložiť' })).not.toBeInTheDocument());
    await waitOutScrollRestoreWindow();

    const profileMain = currentMain();
    expect(profileMain).not.toBe(formMain);
    expect(formMain.isConnected).toBe(false);
    expect(profileMain.scrollTop).toBe(0);
    expect(mainWrites.filter(({ value }) => value !== 0)).toEqual([]);
  });

  it('zrušenie zo scrollnutého formulára: profil sa otvorí v NOVOM <main> od začiatku', async () => {
    const formMain = await openProfileEditForm();
    userScrolls(formMain, 1240);

    fireEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Uložiť' })).not.toBeInTheDocument());

    const profileMain = currentMain();
    expect(profileMain).not.toBe(formMain);
    expect(formMain.isConnected).toBe(false);
    expect(profileMain.scrollTop).toBe(0);
  });
});

/**
 * Skutočný `Dashboard`: „Upraviť profil" je samostatná obrazovka s vlastným
 * `<main>` na mobile aj desktope. Formulár má tlačidlo „Uložiť" úplne dole, takže
 * jeho scroll sa po uložení ani zrušení nesmie preniesť do profilu – ten sa
 * otvorí v novom `<main>` od začiatku – a scroll profilu sa nesmie preniesť
 * do formulára.
 *
 * Uloženie sa môže dokončiť aj po zmene šírky okna (desktop → mobil počas
 * letiaceho PATCH): `handleSave` scroll neobnovuje, takže výsledok je rovnaký.
 *
 * Nový `<main>` znamená aj nový `ProfileModule`, preto sa tu overuje, že aktívna
 * záložka profilu (Portfólio, Príspevky…) úpravu prežije.
 */

import React from 'react';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import type { User } from '@/types';
import { resetProfileActionLock } from '../modules/profile/useProfileActionLock';

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
  desktop_onboarding: { version: 1, status: 'completed', step: 'dashboard_finish' },
};

const savedUser: User = { ...user, first_name: 'Upravený', updated_at: '2024-01-01' };

type PatchResponse = { data: { user: User } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Poloha scrollu prvkov – jsdom drží `scrollTop` stále na 0, prehliadač si ho pamätá. */
const scrollPositions = new WeakMap<Element, number>();
const mainWrites: Array<{ element: Element; value: number }> = [];

/** Užívateľ odscrolloval `<main>` – prehliadač zmenil pozíciu, JavaScript nič nezapísal. */
function userScrolls(main: HTMLElement, position: number) {
  scrollPositions.set(main, position);
}

const LG_QUERY = '(max-width: 1023px)';
const originalMatchMedia = window.matchMedia;
let viewportIsMobile = false;
const lgChangeListeners = new Set<() => void>();

/** `matchMedia` s ovládateľnou šírkou: `useIsMobile` číta `matches` až pri každej zmene. */
function installMatchMedia() {
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

async function resizeViewport(isMobile: boolean) {
  viewportIsMobile = isMobile;
  await act(async () => {
    lgChangeListeners.forEach((listener) => listener());
  });
}

function currentMain(): HTMLElement {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) throw new Error('chýba <main data-dashboard-main>');
  return main;
}

async function waitOutScrollRestoreWindow() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
}

function renderDashboard() {
  render(
    <ThemeProvider>
      <Dashboard initialUser={user} initialRoute="profile" />
    </ThemeProvider>,
  );
}

async function openProfileEdit() {
  fireEvent.click((await screen.findAllByText('Upraviť profil'))[0]);
  await screen.findByRole('button', { name: 'Uložiť' });
}

/** Aj hneď vyriešené PATCH sa dokončí ešte v `act`, inak React hlási zmenu stavu mimo neho. */
async function clickSave() {
  const button = await screen.findByRole('button', { name: 'Uložiť' });
  await act(async () => {
    fireEvent.click(button);
  });
}

async function waitForProfileToReplaceForm() {
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Uložiť' })).not.toBeInTheDocument());
  await waitOutScrollRestoreWindow();
}

describe('Dashboard: scroll po uložení profilu naprieč zmenou obrazovky', () => {
  beforeEach(() => {
    mainWrites.length = 0;
    resetProfileActionLock();
    viewportIsMobile = false;
    lgChangeListeners.clear();
    installMatchMedia();
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

  it('desktop → mobil počas letiaceho uloženia: profil sa otvorí v novom <main> od začiatku', async () => {
    const pending = deferred<PatchResponse>();
    jest.spyOn(api, 'patch').mockReturnValue(pending.promise);
    renderDashboard();

    await openProfileEdit();
    userScrolls(currentMain(), 640);
    await clickSave();

    await resizeViewport(true);
    const formMain = currentMain();
    userScrolls(formMain, 1240);

    await act(async () => {
      pending.resolve({ data: { user: savedUser } });
    });
    await waitForProfileToReplaceForm();

    const profileMain = currentMain();
    expect(profileMain).not.toBe(formMain);
    expect(profileMain.scrollTop).toBe(0);
    expect(mainWrites.filter(({ value }) => value !== 0)).toEqual([]);
  });

  it('desktop: po uložení zo scrollnutého formulára sa profil otvorí v novom <main> od začiatku', async () => {
    jest.spyOn(api, 'patch').mockResolvedValue({ data: { user: savedUser } });
    renderDashboard();

    await openProfileEdit();
    const formMain = currentMain();
    userScrolls(formMain, 640);
    await clickSave();
    await waitForProfileToReplaceForm();

    const profileMain = currentMain();
    expect(profileMain).not.toBe(formMain);
    expect(profileMain.scrollTop).toBe(0);
    expect(mainWrites.filter(({ value }) => value !== 0)).toEqual([]);
  });

  it('desktop: po zrušení úpravy zo scrollnutého formulára sa profil otvorí v novom <main> od začiatku', async () => {
    renderDashboard();

    await openProfileEdit();
    const formMain = currentMain();
    userScrolls(formMain, 640);
    fireEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));
    await waitForProfileToReplaceForm();

    const profileMain = currentMain();
    expect(profileMain).not.toBe(formMain);
    expect(profileMain.scrollTop).toBe(0);
  });

  it('desktop: úprava otvorená z odscrollovaného profilu začína od začiatku', async () => {
    renderDashboard();

    const editButton = (await screen.findAllByText('Upraviť profil'))[0];
    const profileMain = currentMain();
    userScrolls(profileMain, 900);
    fireEvent.click(editButton);
    await screen.findByRole('button', { name: 'Uložiť' });

    const formMain = currentMain();
    expect(formMain).not.toBe(profileMain);
    expect(formMain.scrollTop).toBe(0);
  });

  it.each([
    ['zrušení', 'Zrušiť'],
    ['uložení', 'Uložiť'],
  ])('desktop: po %s úpravy ostáva aktívna záložka profilu', async (_how, buttonName) => {
    // Zvyšok adresy po predošlých testoch by mohol záložku podržať namiesto stavu appky.
    window.history.replaceState(null, '', '/');
    jest.spyOn(api, 'patch').mockResolvedValue({ data: { user: savedUser } });
    renderDashboard();

    fireEvent.click(await screen.findByRole('tab', { name: /Portfólio/ }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Portfólio/ })).toHaveAttribute('aria-selected', 'true'),
    );

    await openProfileEdit();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
    });
    await waitForProfileToReplaceForm();

    expect(screen.getByRole('tab', { name: /Portfólio/ })).toHaveAttribute('aria-selected', 'true');
  });
});

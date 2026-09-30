/**
 * Skutočný `Dashboard`: uloženie profilu ešte letí, keď sa `<main>` – a s ním
 * `ProfileModule` – vytvorí nanovo (šípka späť v hornej lište na mobile, prechod
 * cez breakpoint). Druhé uloženie z novej inštancie nesmie odísť: kým prvé
 * nedobehne, letí jedno PATCH profilu naraz, takže starší snímok (napr. s inou
 * voľbou viditeľnosti kontaktu) nemôže predbehnúť ani prepísať novší.
 *
 * Zámok samotný pokrývajú `useProfileActionLock` a `ProfileModule.saveLock`;
 * tento test overuje, že s reálnym `<main>` a stavom dashboardu naozaj drží.
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

const LG_QUERY = '(max-width: 1023px)';
const originalMatchMedia = window.matchMedia;
let viewportIsMobile = true;
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

describe('Dashboard: letiace uloženie profilu prežije nový <main>', () => {
  beforeEach(() => {
    resetProfileActionLock();
    viewportIsMobile = true;
    lgChangeListeners.clear();
    installMatchMedia();
    // Zoznam ponúk profilu: bez mocku by test poslal skutočný HTTP dotaz na localhost:8000.
    jest.spyOn(api, 'get').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
  });

  it('mobil: šípka späť a znovu „Upraviť profil" počas letiaceho uloženia – druhé uloženie neodíde', async () => {
    const pending = deferred<PatchResponse>();
    const patch = jest.spyOn(api, 'patch').mockReturnValue(pending.promise);
    renderDashboard();

    await openProfileEdit();
    await clickSave();
    expect(patch).toHaveBeenCalledTimes(1);

    const editMain = currentMain();
    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));
    await openProfileEdit();
    expect(currentMain()).not.toBe(editMain);

    await clickSave();
    expect(patch).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ data: { user: savedUser } });
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Uložiť' })).not.toBeInTheDocument());
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('prechod na desktop počas letiaceho uloženia – druhé uloženie z desktopového formulára neodíde', async () => {
    const pending = deferred<PatchResponse>();
    const patch = jest.spyOn(api, 'patch').mockReturnValue(pending.promise);
    renderDashboard();

    await openProfileEdit();
    await clickSave();
    expect(patch).toHaveBeenCalledTimes(1);

    const mobileMain = currentMain();
    await resizeViewport(false);
    expect(currentMain()).not.toBe(mobileMain);

    await clickSave();
    expect(patch).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ data: { user: savedUser } });
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Uložiť' })).not.toBeInTheDocument());
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('po dokončení pôvodného uloženia sa zámok uvoľní: ďalšie uloženie z novej inštancie odíde', async () => {
    const pending = deferred<PatchResponse>();
    const patch = jest
      .spyOn(api, 'patch')
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ data: { user: savedUser } });
    renderDashboard();

    await openProfileEdit();
    await clickSave();
    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));

    await act(async () => {
      pending.resolve({ data: { user: savedUser } });
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Uložiť' })).not.toBeInTheDocument());

    await openProfileEdit();
    await clickSave();
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
  });
});

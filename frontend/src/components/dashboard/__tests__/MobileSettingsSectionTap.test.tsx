/**
 * Ťuknutie na sekciu v mobilnom zozname Nastavení musí prekresliť obrazovku.
 *
 * Riadky zoznamu po navigácii volajú ešte zatvorenie zoznamu – pochádza to
 * z čias, keď bol zoznam iba stavom menu a zatvorenie nenavigovalo. Odkedy je
 * zoznam obrazovkou s adresou, bol z toho druhý krok, ktorý práve otvorenú
 * sekciu vzápätí vrátil: appka vizuálne ostala na zozname a sekcia sa dala
 * zobraziť až tlačidlom „dopredu".
 *
 * Test ide cez skutočný `Sidebar`, nie cez handler – práve na spoji medzi
 * riadkom a navigáciou tá chyba vznikla.
 */

import { act, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import type { User } from '@/types';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: (props: { activeModule: string }) => (
    <div data-testid="module-state" data-module={props.activeModule} />
  ),
}));

let mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname,
}));

jest.mock('@/utils/auth', () => ({ isAuthenticated: jest.fn(() => true), clearAuthState: jest.fn() }));
jest.mock('@/utils/csrf', () => ({ fetchCsrfToken: jest.fn(), hasCsrfToken: jest.fn(() => true) }));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(() => new Promise(() => {})), post: jest.fn() },
  endpoints: {
    auth: { me: '/auth/me/', logout: '/auth/logout/', login: '/auth/login/', register: '/auth/register/' },
    dashboard: {
      userProfileBySlug: (slug: string) => `/profile/slug/${slug}/`,
      userProfile: (id: number) => `/profile/${id}/`,
    },
  },
  invalidateSession: jest.fn(),
  isTransientAuthFailureError: jest.fn(() => false),
  setMayHaveRefreshCookie: jest.fn(),
}));

const user = {
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

/** Riadky zoznamu podľa viditeľného názvu → modul, ktorý majú zobraziť. */
const ROWS: Array<[string, string]> = [
  ['Upozornenia', 'notification-settings'],
  ['Typ účtu', 'account-type'],
  ['Súkromie', 'privacy'],
  ['Jazyk', 'language'],
  ['Blokované', 'blocked-users'],
  ['Účet', 'account-settings'],
];

const shownModule = () =>
  screen.getByTestId('module-state').getAttribute('data-module') ?? '';

/**
 * Riadok zoznamu Nastavení.
 *
 * Hľadá sa vnútri zoznamu: rovnaký názov („Upozornenia") nesie aj iné miesto
 * obrazovky a test má ťukať práve na riadok.
 */
function settingsRow(label: string): HTMLElement {
  const list = document.querySelector<HTMLElement>('[data-mobile-settings-scroll]');
  if (!list) throw new Error('Zoznam Nastavení nie je zobrazený');
  return within(list).getByText(label);
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockPathname = '/dashboard';
  window.history.replaceState(null, '', '/dashboard');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  (window as unknown as { matchMedia: unknown }).matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: true, media: q, onchange: null,
    addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
  }));
});

async function openSettingsList(path = '/dashboard/settings') {
  // Adresa aj props musia hovoriť o zozname – mount ich zosúlaďuje podľa
  // `DASHBOARD_ROUTES`, takže nesúlad by prebil `initialRoute`.
  window.history.replaceState(null, '', path);
  mockPathname = path;
  render(
    <AuthProvider>
      <ThemeProvider>
        <Dashboard initialUser={user} initialRoute="settings" />
      </ThemeProvider>
    </AuthProvider>,
  );
  await waitFor(() => expect(shownModule()).toBe('settings'));
}

/**
 * Krok späť je v jsdom asynchrónny – stav sa musí merať až PO ňom.
 *
 * Bez tohto by test prešiel aj s chybou: modul sa nastavil synchrónne a až
 * potom ho vrátil oneskorený `popstate`.
 */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

describe('ťuknutie na sekciu v mobilnom zozname', () => {
  it.each(ROWS)('%s sa zobrazí hneď, bez kroku „dopredu"', async (label, moduleId) => {
    await openSettingsList();

    act(() => {
      fireEvent.click(settingsRow(label));
    });
    await settle();

    // Predtým tu ostal `settings`: navigácia prebehla, ale zatvorenie zoznamu
    // ju hneď vrátilo krokom späť.
    expect(shownModule()).toBe(moduleId);
  });

  it('Sledovanie tiež – má vlastného hostiteľa, ale rovnaké zatváranie', async () => {
    await openSettingsList();

    // Sledovanie sa nevykresľuje ako modul, ale ako vlastné okno nad zoznamom,
    // takže sa meria adresa. Riadok volá zatvorenie rovnako ako ostatné.
    act(() => {
      fireEvent.click(settingsRow('Sledovanie'));
    });
    await settle();

    expect(window.location.pathname).toBe('/dashboard/settings/watches');
  });

  it.each(ROWS)('%s zmení adresu a nevráti ju späť', async (label) => {
    await openSettingsList();

    act(() => {
      fireEvent.click(settingsRow(label));
    });
    await settle();

    // Chyba sa prejavovala tak, že adresa sa vrátila na zoznam a sekcia
    // ostala dosiahnuteľná len tlačidlom „dopredu".
    expect(window.location.pathname).not.toBe('/dashboard/settings');
  });
});

/**
 * Koncové lomítko je platný tvar tej istej adresy: `skipTrailingSlashRedirect`
 * ju nechá tak a vzory v tabuľke ju prijímajú. Porovnanie ciest ho preto musí
 * zniesť – inak si appka myslí, že zoznam nie je zobrazený, a krížik ani klik
 * mimo panel ho prestanú zatvárať.
 */
describe('adresa zoznamu s koncovým lomítkom', () => {
  it('krížik zoznam zavrie', async () => {
    await openSettingsList('/dashboard/settings/');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Zatvoriť' }));
    });
    await settle();

    expect(shownModule()).not.toBe('settings');
  });

  it('klik mimo panel zoznam zavrie', async () => {
    await openSettingsList('/dashboard/settings/');
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).not.toBeNull();

    act(() => {
      fireEvent.click(backdrop as Element);
    });
    await settle();

    expect(shownModule()).not.toBe('settings');
  });

  it('bežný tvar bez lomítka sa nemení', async () => {
    await openSettingsList('/dashboard/settings');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Zatvoriť' }));
    });
    await settle();

    expect(shownModule()).not.toBe('settings');
  });

  it('ťuknutie na sekciu funguje aj z adresy s lomítkom', async () => {
    await openSettingsList('/dashboard/settings/');

    act(() => {
      fireEvent.click(settingsRow('Jazyk'));
    });
    await settle();

    expect(shownModule()).toBe('language');
  });
});

/**
 * Partner v správach z pohľadu `DashboardContent`: kto je na druhej strane
 * konverzácie (meno, avatar, skupina, identifikátor profilu) a krok späť z
 * konverzácie (`onMobileMessagesBack`). Údaje ide do hornej lišty mobilných
 * Správ cez props `DashboardLayout`.
 *
 * Testy idú cez vonkajšie rozhranie komponentu (adresa, `messagingApi`,
 * props, ktoré dostane `DashboardLayout`), takže nezávisia od toho, v ktorom
 * súbore logika žije, a musia prejsť nezmenené aj po rozdelení
 * `DashboardContent.tsx`.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import type { User } from '@/types';
import type { ConversationListItem, MessagingUserBrief } from '../modules/messages/types';

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

jest.mock('../DashboardModals', () => ({ __esModule: true, default: () => null }));

const mockOpenConversation = jest.fn();
const mockListConversations = jest.fn();
const mockListMessageRequests = jest.fn();
jest.mock('../modules/messages/messagingApi', () => ({
  ...jest.requireActual('../modules/messages/messagingApi'),
  openConversation: (...args: unknown[]) => mockOpenConversation(...args),
  listConversations: (...args: unknown[]) => mockListConversations(...args),
  listMessageRequests: (...args: unknown[]) => mockListMessageRequests(...args),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
let mockPathname = '/dashboard/messages';
let mockSearchParams = new URLSearchParams();
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
    // Onboarding PATCH never settles: no async state update after act, optimistic state stays stable.
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

const baseUser = {
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;
const layoutProps = () => mockLayoutProps as unknown as DashboardLayoutProps;
const activeModule = () => routerProps().activeModule;

const peerName = () => layoutProps().mobileMessagePeerName;
const peerAvatar = () => layoutProps().mobileMessagePeerAvatarUrl;
const peerIdentifier = () => layoutProps().mobileMessagePeerIdentifier;
const peerIsGroup = () => layoutProps().mobileMessagePeerIsGroup;
const groupMembers = () => layoutProps().mobileMessagePeerAvatarMembers;
const isConversationOpen = () => layoutProps().isMobileMessageConversationOpen;

const anna = (over: Partial<MessagingUserBrief> = {}): MessagingUserBrief => ({
  id: 42,
  display_name: 'Anna Nováková',
  slug: 'anna',
  avatar_url: 'https://cdn.example/anna.png',
  ...over,
});

const boris = (over: Partial<MessagingUserBrief> = {}): MessagingUserBrief => ({
  id: 43,
  display_name: 'Boris Kováč',
  slug: 'boris',
  avatar_url: 'https://cdn.example/boris.png',
  ...over,
});

const conversation = (over: Partial<ConversationListItem> = {}): ConversationListItem => ({
  id: 7,
  other_user: anna(),
  last_message_preview: null,
  last_message_at: null,
  last_read_at: null,
  has_unread: false,
  updated_at: '2024-01-01T00:00:00Z',
  ...over,
});

const group = (over: Partial<ConversationListItem> = {}): ConversationListItem =>
  conversation({
    id: 9,
    other_user: null,
    is_group: true,
    name: 'Kolegovia',
    avatar_members: [anna(), boris()],
    ...over,
  });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function installViewport(isMobile: boolean) {
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

/** Adresa pre router aj pre prehliadač (`window.location`) naraz. */
function setUrl(pathname: string, search = '') {
  mockPathname = pathname;
  mockSearchParams = new URLSearchParams(search);
  window.history.replaceState(null, '', search ? `${pathname}?${search}` : pathname);
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

async function renderMessages(
  search = '',
  {
    pathname = '/dashboard/messages',
    route = 'messages',
    mobile = true,
  }: { pathname?: string; route?: string; mobile?: boolean } = {},
) {
  setUrl(pathname, search);
  installViewport(mobile);
  // Načítanie partnera je reťaz viacerých `await`ov: celé musí prebehnúť vnútri `act`.
  await act(async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <Dashboard initialUser={baseUser} initialRoute={route} />
        </ThemeProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await waitFor(() => expect(activeModule()).toBe(route));
}

/**
 * Adresa sa zmení za behu (router hlási novú cestu a dotaz). Prekreslenie vynúti
 * zmena záložky na INÚ hodnotu (rovnaká by sa preskočila).
 */
async function navigateTo(search: string, pathname = '/dashboard/messages') {
  setUrl(pathname, search);
  const otherTab = routerProps().ownProfileTab === 'posts' ? 'offers' : 'posts';
  act(() => routerProps().onOwnProfileTabChange?.(otherTab));
  await settle();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenConversation.mockReset().mockReturnValue(new Promise(() => {}));
  mockListConversations.mockReset().mockReturnValue(new Promise(() => {}));
  mockListMessageRequests.mockReset().mockReturnValue(new Promise(() => {}));
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockLayoutProps = null;
  setUrl('/dashboard/messages');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('partner z ?targetUserId', () => {
  it('nič neukáže, kým sa konverzácia neotvorí, potom meno, avatar a identifikátor partnera', async () => {
    const opening = deferred<{ other_user: MessagingUserBrief }>();
    mockOpenConversation.mockReturnValue(opening.promise);

    await renderMessages('targetUserId=42');

    expect(mockOpenConversation).toHaveBeenCalledTimes(1);
    expect(mockOpenConversation).toHaveBeenCalledWith(42);
    expect(mockListConversations).not.toHaveBeenCalled();
    expect(peerName()).toBeUndefined();
    expect(peerAvatar()).toBeNull();
    expect(peerIdentifier()).toBeNull();

    opening.resolve({ other_user: anna() });
    await settle();

    expect(peerName()).toBe('Anna Nováková');
    expect(peerAvatar()).toBe('https://cdn.example/anna.png');
    expect(peerIdentifier()).toBe('anna');
    expect(peerIsGroup()).toBe(false);
    expect(groupMembers()).toEqual([]);
    expect(isConversationOpen()).toBe(true);
  });

  it('partner bez avatara nemá adresu obrázka', async () => {
    mockOpenConversation.mockResolvedValue({ other_user: anna({ avatar_url: null }) });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    expect(peerAvatar()).toBeNull();
  });

  it.each([
    ['bez slugu', { slug: null }],
    ['s prázdnym slugom z medzier', { slug: '   ' }],
  ])('%s je identifikátorom ID používateľa', async (_label, over) => {
    mockOpenConversation.mockResolvedValue({ other_user: anna(over) });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    expect(peerIdentifier()).toBe('42');
  });

  it('slug sa berie oseknutý o medzery', async () => {
    mockOpenConversation.mockResolvedValue({ other_user: anna({ slug: '  anna-n  ' }) });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    expect(peerIdentifier()).toBe('anna-n');
  });

  it('partner s nečíselným ID a bez slugu nemá identifikátor', async () => {
    mockOpenConversation.mockResolvedValue({
      other_user: anna({ slug: null, id: '42' as unknown as number }),
    });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    expect(peerIdentifier()).toBeNull();
  });

  it('zmazaný používateľ má neutrálne meno a žiadny identifikátor (klik nikam nevedie)', async () => {
    mockOpenConversation.mockResolvedValue({
      other_user: anna({ is_deleted: true, slug: 'anna', display_name: 'Anna Nováková' }),
    });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Zmazaný používateľ'));
    expect(peerIdentifier()).toBeNull();
  });

  it('partner s prázdnym menom sa volá „Používateľ“', async () => {
    mockOpenConversation.mockResolvedValue({ other_user: anna({ display_name: '   ' }) });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Používateľ'));
  });

  it.each([
    ['other_user: null', { other_user: null }],
    ['bez other_user', {}],
  ])('odpoveď (%s) zruší predošlého partnera', async (_label, response) => {
    mockOpenConversation.mockResolvedValueOnce({ other_user: anna() });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));

    mockOpenConversation.mockResolvedValueOnce(response);
    await navigateTo('targetUserId=43');

    expect(mockOpenConversation).toHaveBeenLastCalledWith(43);
    expect(peerName()).toBeUndefined();
    expect(peerAvatar()).toBeNull();
    expect(peerIdentifier()).toBeNull();
  });

  it('zlyhanie otvorenia zruší predošlého partnera', async () => {
    mockOpenConversation.mockResolvedValueOnce({ other_user: anna() });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));

    mockOpenConversation.mockRejectedValueOnce(new Error('403'));
    await navigateTo('targetUserId=43');

    expect(peerName()).toBeUndefined();
    expect(peerIdentifier()).toBeNull();
  });

  it('po zmene cieľa sa stará odpoveď zahodí (úspešná aj zlyhaná)', async () => {
    const first = deferred<{ other_user: MessagingUserBrief }>();
    mockOpenConversation.mockReturnValueOnce(first.promise);
    await renderMessages('targetUserId=42');

    mockOpenConversation.mockResolvedValueOnce({ other_user: boris() });
    await navigateTo('targetUserId=43');
    expect(peerName()).toBe('Boris Kováč');

    first.resolve({ other_user: anna() });
    await settle();
    expect(peerName()).toBe('Boris Kováč');
    expect(peerIdentifier()).toBe('boris');

    const second = deferred<{ other_user: MessagingUserBrief }>();
    mockOpenConversation.mockReturnValueOnce(second.promise);
    await navigateTo('targetUserId=44');
    mockOpenConversation.mockResolvedValueOnce({ other_user: anna() });
    await navigateTo('targetUserId=45');
    expect(peerName()).toBe('Anna Nováková');

    second.reject(new Error('late failure'));
    await settle();
    expect(peerName()).toBe('Anna Nováková');
  });

  it.each(['abc', '0', '-3', '1.5', ''])(
    'neplatné cieľové ID „%s“ nevolá API a konverzáciu neotvorí',
    async (value) => {
      await renderMessages(`targetUserId=${value}`);
      expect(mockOpenConversation).not.toHaveBeenCalled();
      expect(mockListConversations).not.toHaveBeenCalled();
      expect(isConversationOpen()).toBe(false);
      expect(peerName()).toBeUndefined();
    },
  );

  it('cieľový používateľ má prednosť pred ID konverzácie', async () => {
    mockOpenConversation.mockResolvedValue({ other_user: anna() });
    await renderMessages('conversationId=7&targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    expect(mockOpenConversation).toHaveBeenCalledWith(42);
    expect(mockListConversations).not.toHaveBeenCalled();
  });
});

describe('partner z ID konverzácie', () => {
  it('nájde ho v zozname konverzácií a zoznam žiadostí nevolá', async () => {
    mockListConversations.mockResolvedValue([
      conversation({ id: 3, other_user: boris() }),
      conversation({ id: 7, other_user: anna() }),
    ]);
    await renderMessages('conversationId=7');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    expect(peerIdentifier()).toBe('anna');
    expect(peerAvatar()).toBe('https://cdn.example/anna.png');
    expect(peerIsGroup()).toBe(false);
    expect(mockListConversations).toHaveBeenCalledTimes(1);
    expect(mockListMessageRequests).not.toHaveBeenCalled();
    expect(mockOpenConversation).not.toHaveBeenCalled();
    expect(isConversationOpen()).toBe(true);
  });

  it('keď v zozname nie je, nájde ho medzi žiadosťami o správu', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 3, other_user: boris() })]);
    mockListMessageRequests.mockResolvedValue([conversation({ id: 7, other_user: anna() })]);
    await renderMessages('conversationId=7');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    expect(mockListMessageRequests).toHaveBeenCalledTimes(1);
  });

  it('konverzáciu, ktorú nenájde nikde, ukáže bez partnera', async () => {
    mockListConversations.mockResolvedValueOnce([conversation({ id: 7, other_user: anna() })]);
    await renderMessages('conversationId=7');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));

    mockListConversations.mockResolvedValueOnce([conversation({ id: 3, other_user: boris() })]);
    mockListMessageRequests.mockResolvedValueOnce([conversation({ id: 4, other_user: boris() })]);
    await navigateTo('conversationId=8');

    expect(mockListMessageRequests).toHaveBeenCalledTimes(1);
    expect(peerName()).toBeUndefined();
    expect(peerIdentifier()).toBeNull();
    expect(peerIsGroup()).toBe(false);
  });

  it('nájdená konverzácia bez druhého používateľa zruší predošlého partnera', async () => {
    mockListConversations.mockResolvedValueOnce([conversation({ id: 7, other_user: anna() })]);
    await renderMessages('conversationId=7');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));

    mockListConversations.mockResolvedValueOnce([conversation({ id: 8, other_user: null })]);
    await navigateTo('conversationId=8');
    expect(peerName()).toBeUndefined();
    expect(peerIsGroup()).toBe(false);
  });

  it.each([
    ['zoznamu konverzácií', 'list'],
    ['žiadostí', 'requests'],
  ])('zlyhanie %s zruší predošlého partnera', async (_label, failing) => {
    mockListConversations.mockResolvedValueOnce([conversation({ id: 7, other_user: anna() })]);
    await renderMessages('conversationId=7');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));

    if (failing === 'list') {
      mockListConversations.mockRejectedValueOnce(new Error('500'));
    } else {
      mockListConversations.mockResolvedValueOnce([]);
      mockListMessageRequests.mockRejectedValueOnce(new Error('500'));
    }
    await navigateTo('conversationId=8');

    expect(peerName()).toBeUndefined();
    expect(peerIdentifier()).toBeNull();
    expect(mockListMessageRequests).toHaveBeenCalledTimes(failing === 'list' ? 0 : 1);
  });

  it('ID z adresy /dashboard/messages/<id> funguje rovnako ako dotaz', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 9, other_user: boris() })]);
    await renderMessages('', { pathname: '/dashboard/messages/9' });
    await waitFor(() => expect(peerName()).toBe('Boris Kováč'));
    expect(isConversationOpen()).toBe(true);
  });

  it('ID v dotaze má prednosť pred ID v adrese', async () => {
    mockListConversations.mockResolvedValue([
      conversation({ id: 9, other_user: boris() }),
      conversation({ id: 4, other_user: anna() }),
    ]);
    await renderMessages('conversationId=4', { pathname: '/dashboard/messages/9' });
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
  });

  it.each(['abc', '0', '-2', '2.5'])(
    'neplatné ID konverzácie „%s“ nevolá API a konverzáciu neotvorí',
    async (value) => {
      await renderMessages(`conversationId=${value}`);
      expect(mockListConversations).not.toHaveBeenCalled();
      expect(mockListMessageRequests).not.toHaveBeenCalled();
      expect(mockOpenConversation).not.toHaveBeenCalled();
      expect(isConversationOpen()).toBe(false);
    },
  );

  it('návrat na zoznam Správ (adresa bez konverzácie) zruší partnera aj skupinu', async () => {
    mockListConversations.mockResolvedValue([
      conversation({ id: 7, other_user: anna() }),
      group({ id: 9 }),
    ]);
    await renderMessages('conversationId=7');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));

    await navigateTo('');
    expect(isConversationOpen()).toBe(false);
    expect(peerName()).toBeUndefined();
    expect(peerIdentifier()).toBeNull();
    expect(peerAvatar()).toBeNull();

    await navigateTo('conversationId=9');
    expect(peerIsGroup()).toBe(true);

    await navigateTo('');
    expect(isConversationOpen()).toBe(false);
    expect(peerIsGroup()).toBe(false);
    expect(peerName()).toBeUndefined();
    expect(groupMembers()).toEqual([]);
  });

  it('zoznam Správ bez vybranej konverzácie nevolá API a konverzáciu neotvorí', async () => {
    await renderMessages('');
    expect(mockListConversations).not.toHaveBeenCalled();
    expect(mockOpenConversation).not.toHaveBeenCalled();
    expect(isConversationOpen()).toBe(false);
    expect(peerName()).toBeUndefined();
  });
});

describe('skupinová konverzácia', () => {
  it('ukáže názov skupiny a jej členov, bez avatara a bez identifikátora profilu', async () => {
    mockListConversations.mockResolvedValue([group({ id: 9, name: '  Kolegovia  ' })]);
    await renderMessages('conversationId=9');
    await waitFor(() => expect(peerName()).toBe('Kolegovia'));
    expect(peerIsGroup()).toBe(true);
    expect(peerAvatar()).toBeNull();
    expect(peerIdentifier()).toBeNull();
    expect(groupMembers()).toEqual([anna(), boris()]);
    expect(isConversationOpen()).toBe(true);
  });

  it.each([
    ['prázdny názov', ''],
    ['názov z medzier', '   '],
    ['chýbajúci názov', undefined],
  ])('%s nahradí názov „Skupina“', async (_label, name) => {
    mockListConversations.mockResolvedValue([group({ id: 9, name })]);
    await renderMessages('conversationId=9');
    await waitFor(() => expect(peerIsGroup()).toBe(true));
    expect(peerName()).toBe('Skupina');
  });

  it('skupina bez zoznamu členov má prázdny zoznam', async () => {
    mockListConversations.mockResolvedValue([group({ id: 9, avatar_members: undefined })]);
    await renderMessages('conversationId=9');
    await waitFor(() => expect(peerIsGroup()).toBe(true));
    expect(groupMembers()).toEqual([]);
  });

  it('skupinu nájde aj medzi žiadosťami', async () => {
    mockListConversations.mockResolvedValue([]);
    mockListMessageRequests.mockResolvedValue([group({ id: 9 })]);
    await renderMessages('conversationId=9');
    await waitFor(() => expect(peerName()).toBe('Kolegovia'));
    expect(peerIsGroup()).toBe(true);
  });

  it('prechod zo skupiny na jednotlivca skupinu zruší a naopak', async () => {
    mockListConversations.mockResolvedValue([
      group({ id: 9 }),
      conversation({ id: 7, other_user: anna() }),
    ]);
    await renderMessages('conversationId=9');
    await waitFor(() => expect(peerIsGroup()).toBe(true));

    await navigateTo('conversationId=7');
    expect(peerIsGroup()).toBe(false);
    expect(peerName()).toBe('Anna Nováková');
    expect(peerIdentifier()).toBe('anna');
    expect(groupMembers()).toEqual([]);

    await navigateTo('conversationId=9');
    expect(peerIsGroup()).toBe(true);
    expect(peerName()).toBe('Kolegovia');
    expect(peerIdentifier()).toBeNull();
    expect(peerAvatar()).toBeNull();
  });

  it('prechod zo skupiny na cieľového používateľa skupinu zruší', async () => {
    mockListConversations.mockResolvedValue([group({ id: 9 })]);
    await renderMessages('conversationId=9');
    await waitFor(() => expect(peerIsGroup()).toBe(true));

    mockOpenConversation.mockResolvedValue({ other_user: boris() });
    await navigateTo('targetUserId=43');
    expect(peerIsGroup()).toBe(false);
    expect(peerName()).toBe('Boris Kováč');
    expect(groupMembers()).toEqual([]);
  });
});

describe('zlyhanie načítania po skupine', () => {
  it.each([
    ['otvorenia cieľového používateľa', () => mockOpenConversation.mockRejectedValueOnce(new Error('403')), 'targetUserId=43'],
    ['zoznamu konverzácií', () => mockListConversations.mockRejectedValueOnce(new Error('500')), 'conversationId=8'],
  ])('zlyhanie %s zruší predošlú skupinu', async (_label, failNext, search) => {
    mockListConversations.mockResolvedValueOnce([group({ id: 9 })]);
    await renderMessages('conversationId=9');
    await waitFor(() => expect(peerIsGroup()).toBe(true));

    failNext();
    await navigateTo(search);

    expect(peerIsGroup()).toBe(false);
    expect(peerName()).toBeUndefined();
    expect(groupMembers()).toEqual([]);
  });
});

describe('zrušené načítanie konverzácie', () => {
  it('po zmene konverzácie sa odpoveď zoznamu pre tú starú zahodí a žiadosti sa nevolajú', async () => {
    const first = deferred<ConversationListItem[]>();
    mockListConversations.mockReturnValueOnce(first.promise);
    await renderMessages('conversationId=7');

    mockListConversations.mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    await navigateTo('conversationId=8');
    expect(peerName()).toBe('Boris Kováč');

    first.resolve([]);
    await settle();

    expect(peerName()).toBe('Boris Kováč');
    expect(mockListMessageRequests).not.toHaveBeenCalled();
  });

  it('po zmene konverzácie sa odpoveď žiadostí pre tú starú zahodí', async () => {
    mockListConversations.mockResolvedValueOnce([]);
    const requests = deferred<ConversationListItem[]>();
    mockListMessageRequests.mockReturnValueOnce(requests.promise);
    await renderMessages('conversationId=7');

    mockListConversations.mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    await navigateTo('conversationId=8');
    expect(peerName()).toBe('Boris Kováč');

    requests.resolve([conversation({ id: 7, other_user: anna() })]);
    await settle();
    expect(peerName()).toBe('Boris Kováč');
  });

  it('po zmene konverzácie sa zlyhanie pre tú starú zahodí', async () => {
    const first = deferred<ConversationListItem[]>();
    mockListConversations.mockReturnValueOnce(first.promise);
    await renderMessages('conversationId=7');

    mockListConversations.mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    await navigateTo('conversationId=8');

    first.reject(new Error('late failure'));
    await settle();
    expect(peerName()).toBe('Boris Kováč');
  });
});

describe('mimo modulu Správy', () => {
  it('na inej obrazovke nevolá API ani keď je v adrese konverzácia', async () => {
    await renderMessages('conversationId=3&targetUserId=42', { pathname: '/dashboard', route: 'home' });
    expect(mockOpenConversation).not.toHaveBeenCalled();
    expect(mockListConversations).not.toHaveBeenCalled();
    expect(isConversationOpen()).toBe(false);
    expect(peerName()).toBeUndefined();
  });

  it('odchod zo Správ zruší partnera aj skupinu a neskorá odpoveď ich nevráti', async () => {
    const opening = deferred<{ other_user: MessagingUserBrief }>();
    mockOpenConversation.mockReturnValueOnce(opening.promise);
    await renderMessages('targetUserId=42');

    act(() => layoutProps().onModuleChange('home'));
    await settle();
    expect(activeModule()).toBe('home');

    opening.resolve({ other_user: anna() });
    await settle();
    expect(peerName()).toBeUndefined();
    expect(isConversationOpen()).toBe(false);
  });

  it('odchod zo Správ zruší aj už načítaného partnera (meno, avatar aj identifikátor)', async () => {
    mockOpenConversation.mockResolvedValue({ other_user: anna({ avatar_url: '/media/anna.png' }) });
    await renderMessages('targetUserId=42');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    expect(peerIdentifier()).toBe('anna');
    expect(peerAvatar()).toBe('/media/anna.png');

    act(() => layoutProps().onModuleChange('home'));
    await settle();

    expect(activeModule()).toBe('home');
    expect(peerName()).toBeUndefined();
    expect(peerIdentifier()).toBeNull();
    expect(peerAvatar()).toBeNull();
  });

  it('odchod zo Správ zruší aj načítanú skupinu', async () => {
    mockListConversations.mockResolvedValue([group({ id: 9 })]);
    await renderMessages('conversationId=9');
    await waitFor(() => expect(peerIsGroup()).toBe(true));

    act(() => layoutProps().onModuleChange('home'));
    await settle();

    expect(peerIsGroup()).toBe(false);
    expect(peerName()).toBeUndefined();
    expect(groupMembers()).toEqual([]);
  });

  it('partner sa načíta aj na desktope (hlavička ho dostane bez ohľadu na šírku okna)', async () => {
    mockOpenConversation.mockResolvedValue({ other_user: anna() });
    await renderMessages('targetUserId=42', { mobile: false });
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
  });
});

describe('otvorená konverzácia v hornej lište', () => {
  it.each([
    ['ID konverzácie v dotaze', '', '/dashboard/messages', 'conversationId=5', true],
    ['cieľový používateľ v dotaze', '', '/dashboard/messages', 'targetUserId=5', true],
    ['ID konverzácie v adrese', '', '/dashboard/messages/5', '', true],
    ['zoznam bez konverzácie', '', '/dashboard/messages', '', false],
  ])('%s', async (_label, _unused, pathname, search, expected) => {
    await renderMessages(search, { pathname });
    expect(isConversationOpen()).toBe(expected);
  });
});

describe('krok späť z konverzácie (onMobileMessagesBack)', () => {
  it('z inej obrazovky vráti zoznam Správ a adresu bez konverzácie', async () => {
    await renderMessages('', { pathname: '/dashboard', route: 'home' });
    const historyLength = window.history.length;

    act(() => layoutProps().onMobileMessagesBack?.());

    expect(activeModule()).toBe('messages');
    expect(window.location.pathname).toBe('/dashboard/messages');
    expect(window.location.search).toBe('');
    expect(window.history.length).toBe(historyLength + 1);
  });

  it('z otvorenej konverzácie zapíše adresu zoznamu Správ novým záznamom histórie', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 7, other_user: anna() })]);
    await renderMessages('conversationId=7');
    await waitFor(() => expect(peerName()).toBe('Anna Nováková'));
    const historyLength = window.history.length;

    act(() => layoutProps().onMobileMessagesBack?.());

    expect(activeModule()).toBe('messages');
    expect(window.location.pathname).toBe('/dashboard/messages');
    expect(window.location.search).toBe('');
    expect(window.history.length).toBe(historyLength + 1);
  });

  it('zruší vybranú položku pravého panela', async () => {
    await renderMessages('conversationId=7');
    act(() => layoutProps().onRightItemClick?.('language'));
    expect(layoutProps().activeRightItem).toBe('language');

    act(() => layoutProps().onMobileMessagesBack?.());

    expect(layoutProps().activeRightItem).toBe('');
    expect(activeModule()).toBe('messages');
  });

  it('zo sledovania ponúk (otvorený pravý panel, modul Nastavenia) vráti zoznam Správ a panel zatvorí', async () => {
    await renderMessages('conversationId=7');
    act(() => layoutProps().onRightItemClick?.('offer-watches'));
    expect(activeModule()).toBe('settings');
    expect(layoutProps().isRightSidebarOpen).toBe(true);
    expect(layoutProps().activeRightItem).toBe('offer-watches');

    act(() => layoutProps().onMobileMessagesBack?.());

    expect(activeModule()).toBe('messages');
    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
    expect(window.location.pathname).toBe('/dashboard/messages');
  });
});

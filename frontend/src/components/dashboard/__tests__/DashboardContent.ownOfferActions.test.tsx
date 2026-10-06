/**
 * Úprava a mazanie vlastnej karty (ponuky) z profilu: `DashboardContent`
 * dostane od profilu `onEditOwnProfileOffer` / `onDeleteOwnProfileOffer` a
 * sám rieši načítanie detailu, otvorenie úpravy (okno na desktope, celá
 * stránka na mobile), potvrdenie mazania, volanie API a upratanie stavu.
 *
 * Testy idú cez vonkajšie rozhranie: props, ktoré dostane `ModuleRouter`,
 * `skillsState`, ktorý dostane `DashboardModals`, a skutočné potvrdzovacie
 * okno (`role="alertdialog"`). Nezávisia od toho, v ktorom súbore handlery
 * žijú, a musia prejsť nezmenené aj po rozdelení `DashboardContent.tsx`.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import toast from 'react-hot-toast';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import type DashboardModals from '../DashboardModals';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import type { User } from '@/types';
import type { Offer } from '../modules/profile/profileOffersTypes';
import { PROFILE_OFFERS_REFRESH_EVENT } from '../modules/profile/profileOfferEvents';
import {
  getOffersFromCache,
  makeOffersCacheKey,
  setOffersToCache,
} from '../modules/profile/profileOffersCache';
import { getSkillsDescribeReturnModule } from '../modules/skills/skillsDescribeReturnSession';

type ModuleRouterProps = ComponentProps<typeof ModuleRouter>;
type DashboardLayoutProps = ComponentProps<typeof DashboardLayout>;
type DashboardModalsProps = ComponentProps<typeof DashboardModals>;

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
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

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

jest.mock('@/utils/auth', () => ({ isAuthenticated: jest.fn(() => true), clearAuthState: jest.fn() }));
jest.mock('@/utils/csrf', () => ({ fetchCsrfToken: jest.fn(), hasCsrfToken: jest.fn(() => true) }));

const mockApiGet = jest.fn();
const mockApiDelete = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: jest.fn(),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
  endpoints: {
    auth: { me: '/auth/me/', logout: '/auth/logout/', login: '/auth/login/', register: '/auth/register/' },
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

const user = {
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

const { t } = jest.requireMock('@/contexts/LanguageContext').useLanguage() as {
  t: (key: string, fallback?: string) => string;
};
const editFailedText = t('skills.cardEditFailed', 'Kartu sa nepodarilo otvoriť na úpravu. Skúste to znova.');
const deleteFailedText = t('skills.cardDeleteFailed', 'Kartu sa nepodarilo odstrániť. Skúste to znova.');
const deleteSuccessText = t('skills.cardDeleteSuccess', 'Karta bola vymazaná.');
const languageContext = jest.requireMock('@/contexts/LanguageContext').useLanguage() as {
  t: (key: string, fallback?: string) => string;
};

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;
const layoutProps = () => mockLayoutProps as unknown as DashboardLayoutProps;
const skillsState = () => (mockModalsProps as unknown as DashboardModalsProps).skillsState;
const activeModule = () => routerProps().activeModule;

type EditHandler = (offer: Offer) => Promise<void>;
const editOffer = (offer: Offer) =>
  act(async () => {
    await (routerProps().onEditOwnProfileOffer as unknown as EditHandler)(offer);
  });
const deleteOffer = (offer: Offer) =>
  act(() => {
    routerProps().onDeleteOwnProfileOffer?.(offer);
  });

function makeOffer(id: number, extra: Partial<Offer> = {}): Offer {
  return { id, category: 'IT', subcategory: 'Web', description: 'popis', ...extra };
}

/** Odpoveď API pre detail karty (tvar, ktorý dostane `toLocalSkill`). */
function skillDetail(id: number, extra: Record<string, unknown> = {}) {
  return { id, category: 'IT', subcategory: 'Web', description: 'popis', is_seeking: false, ...extra };
}

let mockIsMobile = false;

function installViewport(isMobile: boolean) {
  mockIsMobile = isMobile;
  (window as unknown as { matchMedia: unknown }).matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes('max-width: 1023px') ? mockIsMobile : false,
    media: q,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

async function renderDashboard({ mobile = false }: { mobile?: boolean } = {}) {
  installViewport(mobile);
  render(
    <AuthProvider>
      <ThemeProvider>
        <Dashboard initialUser={user} initialRoute="home" />
      </ThemeProvider>
    </AuthProvider>,
  );
  await waitFor(() => expect(activeModule()).toBe('home'));
  // Dobeh úvodného overenia prihlásenia (AuthProvider) – inak by ho test zachytil mimo act.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const dialog = () => screen.getByRole('alertdialog');
const queryDialog = () => screen.queryByRole('alertdialog');
const dialogButtons = () => {
  const [cancel, confirm] = within(dialog()).getAllByRole('button');
  return { cancel, confirm };
};

const listCalls = () => mockApiGet.mock.calls.filter(([url]) => url === '/auth/skills/');

beforeEach(() => {
  jest.clearAllMocks();
  mockApiGet.mockReset();
  mockApiDelete.mockReset();
  mockApiGet.mockImplementation((url: string) => {
    if (url === '/auth/skills/') return Promise.resolve({ data: [] });
    return new Promise(() => {});
  });
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockLayoutProps = null;
  mockModalsProps = null;
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('úprava vlastnej karty', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'neplatné id %p ukáže chybu a nič nenačíta',
    async (id) => {
      await renderDashboard();
      act(() => routerProps().onOwnProfileTabChange?.('portfolio'));

      await editOffer(makeOffer(id));

      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(editFailedText);
      expect(mockApiGet).not.toHaveBeenCalledWith(`/auth/skills/${id}/`);
      // Neplatná karta sa nedostane ani k prepnutiu záložky.
      expect(routerProps().ownProfileTab).toBe('portfolio');
      expect(skillsState().isSkillDescriptionModalOpen).toBe(false);
    },
  );

  describe('na desktope', () => {
    it('načíta detail a otvorí okno úpravy', async () => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/7/'
          ? Promise.resolve({ data: skillDetail(7, { category: 'Doprava', subcategory: 'Sťahovanie' }) })
          : Promise.resolve({ data: [] }),
      );
      await renderDashboard();
      act(() => routerProps().onOwnProfileTabChange?.('portfolio'));
      act(() => {
        skillsState().setEditingCustomCategoryIndex(2);
        skillsState().setEditingStandardCategoryIndex(3);
      });
      expect(skillsState().editingCustomCategoryIndex).toBe(2);

      await editOffer(makeOffer(7));

      expect(mockApiGet).toHaveBeenCalledWith('/auth/skills/7/');
      expect(routerProps().ownProfileTab).toBe('offers');
      expect(skillsState().selectedSkillsCategory).toMatchObject({
        id: 7,
        category: 'Doprava',
        subcategory: 'Sťahovanie',
      });
      expect(skillsState().editingCustomCategoryIndex).toBeNull();
      expect(skillsState().editingStandardCategoryIndex).toBeNull();
      expect(localStorage.getItem('skillsDescribeMode')).toBe('offer');
      expect(skillsState().isSkillDescriptionModalOpen).toBe(true);
      expect(activeModule()).toBe('home');
      expect(toast.error).not.toHaveBeenCalled();
      // Na desktope sa návratová stopa pre celú stránku nezapisuje.
      expect(getSkillsDescribeReturnModule(7)).toBeNull();
    });

    it('karta z časti „Hľadám“ sa otvorí v režime search', async () => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/8/'
          ? Promise.resolve({ data: skillDetail(8, { is_seeking: true }) })
          : Promise.resolve({ data: [] }),
      );
      await renderDashboard();

      await editOffer(makeOffer(8, { is_seeking: true }));

      expect(localStorage.getItem('skillsDescribeMode')).toBe('search');
      expect(skillsState().isSkillDescriptionModalOpen).toBe(true);
    });

    it('chyba localStorage okno úpravy nezruší', async () => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/7/'
          ? Promise.resolve({ data: skillDetail(7) })
          : Promise.resolve({ data: [] }),
      );
      await renderDashboard();
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });

      await editOffer(makeOffer(7));

      expect(skillsState().isSkillDescriptionModalOpen).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('úzke okno bez príznaku mobilu otvorí úpravu na celej stránke', async () => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/7/'
          ? Promise.resolve({ data: skillDetail(7) })
          : Promise.resolve({ data: [] }),
      );
      await renderDashboard();
      installViewport(true);

      await editOffer(makeOffer(7));

      expect(activeModule()).toBe('skills-describe');
      expect(skillsState().isSkillDescriptionModalOpen).toBe(false);
    });
  });

  describe('na mobile', () => {
    it('otvorí úpravu na celej stránke a zatvorí panely', async () => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/7/'
          ? Promise.resolve({ data: skillDetail(7) })
          : Promise.resolve({ data: [] }),
      );
      await renderDashboard({ mobile: true });
      act(() => skillsState().setIsSkillDescriptionModalOpen(true));
      act(() => layoutProps().onSidebarNotificationsClick?.());
      act(() => layoutProps().onSidebarSearchClick?.());
      act(() => layoutProps().onRightItemClick?.('offer-watches'));
      expect(layoutProps().isRightSidebarOpen).toBe(true);
      expect(layoutProps().isSearchOpen).toBe(true);

      await editOffer(makeOffer(7));

      expect(activeModule()).toBe('skills-describe');
      expect(skillsState().isSkillDescriptionModalOpen).toBe(false);
      expect(layoutProps().isRightSidebarOpen).toBe(false);
      expect(layoutProps().activeRightItem).toBe('');
      expect(layoutProps().isSearchOpen).toBe(false);
      expect(layoutProps().isNotificationsPanelOpen).toBe(false);
      expect(localStorage.getItem('activeModule')).toBe('skills-describe');
      expect(localStorage.getItem('skillsDescribeMode')).toBe('offer');
      expect(getSkillsDescribeReturnModule(7)).toBe('profile');
      expect(skillsState().selectedSkillsCategory).toMatchObject({ id: 7 });
    });

    it('zatvorí aj samotný otvorený panel upozornení', async () => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/7/'
          ? Promise.resolve({ data: skillDetail(7) })
          : Promise.resolve({ data: [] }),
      );
      await renderDashboard({ mobile: true });
      act(() => layoutProps().onSidebarNotificationsClick?.());
      expect(layoutProps().isNotificationsPanelOpen).toBe(true);

      await editOffer(makeOffer(7));

      expect(layoutProps().isNotificationsPanelOpen).toBe(false);
      expect(activeModule()).toBe('skills-describe');
    });

    it('príznak mobilu zo stavu rozlíšenia stačí, aj keď živý dotaz na šírku už mobil nehlási', async () => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/7/'
          ? Promise.resolve({ data: skillDetail(7) })
          : Promise.resolve({ data: [] }),
      );
      await renderDashboard({ mobile: true });
      installViewport(false);

      await editOffer(makeOffer(7));

      expect(activeModule()).toBe('skills-describe');
      expect(skillsState().isSkillDescriptionModalOpen).toBe(false);
      expect(getSkillsDescribeReturnModule(7)).toBe('profile');
    });

    it('chyba localStorage stránku úpravy nezruší', async () => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/7/'
          ? Promise.resolve({ data: skillDetail(7) })
          : Promise.resolve({ data: [] }),
      );
      await renderDashboard({ mobile: true });
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });

      await editOffer(makeOffer(7));

      expect(activeModule()).toBe('skills-describe');
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('keď sa detail nepodarí načítať', () => {
    it.each([
      ['chyba zo servera', { response: { data: { error: 'Karta neexistuje.' } } }, 'Karta neexistuje.'],
      ['detail zo servera', { response: { data: { detail: 'Nemáš oprávnenie.' } } }, 'Nemáš oprávnenie.'],
      ['chyba má prednosť pred detailom', { response: { data: { error: 'A', detail: 'B' } } }, 'A'],
      ['prázdna chyba spadne na detail', { response: { data: { error: '  ', detail: 'B' } } }, 'B'],
      ['prázdny detail spadne na text appky', { response: { data: { error: '', detail: ' ' } } }, editFailedText],
      ['chyba, ktorá nie je text', { response: { data: { error: 500, detail: { x: 1 } } } }, editFailedText],
      ['sieť bez odpovede', new Error('Network Error'), editFailedText],
    ])('%s', async (_name, error, expectedText) => {
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/7/' ? Promise.reject(error) : Promise.resolve({ data: [] }),
      );
      await renderDashboard();
      act(() => routerProps().onOwnProfileTabChange?.('portfolio'));

      await editOffer(makeOffer(7));

      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(expectedText);
      expect(skillsState().isSkillDescriptionModalOpen).toBe(false);
      expect(skillsState().selectedSkillsCategory).toBeNull();
      expect(activeModule()).toBe('home');
      // Záložka sa prepne ešte pred načítaním, takže ostáva na „Ponuky“.
      expect(routerProps().ownProfileTab).toBe('offers');
    });
  });
});

describe('mazanie vlastnej karty', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'neplatné id %p ukáže chybu a okno neotvorí',
    async (id) => {
      await renderDashboard();

      await deleteOffer(makeOffer(id));

      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(deleteFailedText);
      expect(queryDialog()).toBeNull();
      expect(mockApiDelete).not.toHaveBeenCalled();
    },
  );

  it('platná karta otvorí potvrdenie a nič ešte nemaže', async () => {
    await renderDashboard();
    expect(queryDialog()).toBeNull();

    await deleteOffer(makeOffer(7));

    expect(dialog()).toBeInTheDocument();
    expect(mockApiDelete).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('tlačidlo Zrušiť okno zavrie bez mazania', async () => {
    await renderDashboard();
    await deleteOffer(makeOffer(7));

    fireEvent.click(dialogButtons().cancel);

    expect(queryDialog()).toBeNull();
    expect(mockApiDelete).not.toHaveBeenCalled();
  });

  it('klik na pozadie okno zavrie, klik dovnútra nie', async () => {
    await renderDashboard();
    await deleteOffer(makeOffer(7));

    fireEvent.click(within(dialog()).getByText(t('skills.deleteCardTitle', 'Vymazať kartu?')));
    expect(queryDialog()).toBeInTheDocument();

    fireEvent.click(dialog());
    expect(queryDialog()).toBeNull();
    expect(mockApiDelete).not.toHaveBeenCalled();
  });

  describe('potvrdenie', () => {
    async function openDeleteDialog(offer: Offer) {
      await deleteOffer(offer);
      return dialogButtons();
    }

    it('zmaže kartu, upratá stav a spustí obnovenie zoznamov', async () => {
      mockApiDelete.mockResolvedValue({});
      // Odpoveď na obnovenie zoznamu visí, aby bolo vidieť lokálne odfiltrovanie.
      mockApiGet.mockImplementation(() => new Promise(() => {}));
      const refreshed: unknown[] = [];
      const onRefresh = (event: Event) => refreshed.push((event as CustomEvent).detail);
      window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, onRefresh);
      try {
        await renderDashboard();
        act(() => {
          skillsState().setStandardCategories([
            { id: 7, category: 'IT', subcategory: 'Web' },
            { id: 8, category: 'IT', subcategory: 'Dizajn' },
          ]);
          skillsState().setCustomCategories([
            { id: 7, category: 'Vlastná', subcategory: 'Vlastná' },
            { id: 9, category: 'Iná', subcategory: 'Iná' },
          ]);
          skillsState().setSelectedSkillsCategory({ id: 7, category: 'IT', subcategory: 'Web' });
          skillsState().setIsSkillDescriptionModalOpen(true);
        });
        setOffersToCache(makeOffersCacheKey(user.id), [makeOffer(7), makeOffer(8)]);
        expect(getOffersFromCache('user-1')).toHaveLength(2);
        const listCallsBefore = listCalls().length;
        const { confirm } = await openDeleteDialog(makeOffer(7));

        await act(async () => {
          fireEvent.click(confirm);
        });

        expect(mockApiDelete).toHaveBeenCalledTimes(1);
        expect(mockApiDelete).toHaveBeenCalledWith('/auth/skills/7/');
        expect(skillsState().standardCategories.map((s) => s.id)).toEqual([8]);
        expect(skillsState().customCategories.map((s) => s.id)).toEqual([9]);
        expect(skillsState().selectedSkillsCategory).toBeNull();
        expect(skillsState().isSkillDescriptionModalOpen).toBe(false);
        expect(getOffersFromCache('user-1')).toBeUndefined();
        expect(refreshed).toEqual([{ ownerUserId: 1, deletedOfferId: 7 }]);
        expect(queryDialog()).toBeNull();
        expect(toast.success).toHaveBeenCalledWith(deleteSuccessText);
        expect(toast.error).not.toHaveBeenCalled();
        expect(listCalls().length).toBe(listCallsBefore + 1);
      } finally {
        window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, onRefresh);
      }
    });

    it('po zmazaní zoznamy nahradia čerstvé dáta zo servera', async () => {
      mockApiDelete.mockResolvedValue({});
      await renderDashboard();
      act(() => {
        skillsState().setStandardCategories([{ id: 7, category: 'IT', subcategory: 'Web' }]);
      });
      mockApiGet.mockImplementation((url: string) =>
        url === '/auth/skills/'
          ? Promise.resolve({
              data: [
                skillDetail(8, { subcategory: 'Dizajn' }),
                skillDetail(9, { category: 'Vlastná', subcategory: 'Vlastná' }),
              ],
            })
          : new Promise(() => {}),
      );
      const { confirm } = await openDeleteDialog(makeOffer(7));

      await act(async () => {
        fireEvent.click(confirm);
      });

      await waitFor(() => expect(skillsState().standardCategories.map((s) => s.id)).toEqual([8]));
      expect(skillsState().customCategories.map((s) => s.id)).toEqual([9]);
    });

    it('otvorenú úpravu inej karty pri mazaní nezavrie', async () => {
      mockApiDelete.mockResolvedValue({});
      await renderDashboard();
      act(() => {
        skillsState().setSelectedSkillsCategory({ id: 8, category: 'IT', subcategory: 'Dizajn' });
        skillsState().setIsSkillDescriptionModalOpen(true);
      });
      const { confirm } = await openDeleteDialog(makeOffer(7));

      await act(async () => {
        fireEvent.click(confirm);
      });

      expect(mockApiDelete).toHaveBeenCalledWith('/auth/skills/7/');
      expect(skillsState().selectedSkillsCategory).toMatchObject({ id: 8 });
      expect(skillsState().isSkillDescriptionModalOpen).toBe(true);
      expect(queryDialog()).toBeNull();
    });

    it('počas mazania sa okno nedá zavrieť ani potvrdiť znova', async () => {
      let finishDelete: () => void = () => {};
      mockApiDelete.mockImplementation(
        () => new Promise<void>((resolve) => {
          finishDelete = resolve;
        }),
      );
      await renderDashboard();
      const { confirm, cancel } = await openDeleteDialog(makeOffer(7));

      await act(async () => {
        fireEvent.click(confirm);
      });

      expect(confirm).toBeDisabled();
      expect(cancel).toBeDisabled();
      expect(within(dialog()).getByText(t('common.deleting', 'Vymazávam...'))).toBeInTheDocument();
      fireEvent.click(confirm);
      fireEvent.click(cancel);
      fireEvent.click(dialog());
      expect(queryDialog()).toBeInTheDocument();
      expect(mockApiDelete).toHaveBeenCalledTimes(1);

      await act(async () => {
        finishDelete();
      });

      expect(queryDialog()).toBeNull();
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['chyba zo servera', { response: { data: { error: 'Nemôžeš mazať.' } } }, 'Nemôžeš mazať.'],
      ['detail zo servera', { response: { data: { detail: 'Zakázané.' } } }, 'Zakázané.'],
      ['sieť bez odpovede', new Error('Network Error'), deleteFailedText],
    ])('zlyhanie (%s) nechá okno otvorené a nič nezmení', async (_name, error, expectedText) => {
      mockApiDelete.mockRejectedValue(error);
      const refreshed: unknown[] = [];
      const onRefresh = (event: Event) => refreshed.push((event as CustomEvent).detail);
      window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, onRefresh);
      try {
        await renderDashboard();
        act(() => {
          skillsState().setStandardCategories([{ id: 7, category: 'IT', subcategory: 'Web' }]);
          skillsState().setSelectedSkillsCategory({ id: 7, category: 'IT', subcategory: 'Web' });
        });
        setOffersToCache(makeOffersCacheKey(user.id), [makeOffer(7)]);
        const { confirm, cancel } = await openDeleteDialog(makeOffer(7));

        await act(async () => {
          fireEvent.click(confirm);
        });

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith(expectedText);
        expect(toast.success).not.toHaveBeenCalled();
        expect(queryDialog()).toBeInTheDocument();
        expect(skillsState().standardCategories.map((s) => s.id)).toEqual([7]);
        expect(skillsState().selectedSkillsCategory).toMatchObject({ id: 7 });
        expect(getOffersFromCache('user-1')).toHaveLength(1);
        expect(refreshed).toEqual([]);
        // Tlačidlá sa po neúspechu odomknú, dá sa to skúsiť znova aj zrušiť.
        expect(confirm).toBeEnabled();
        expect(cancel).toBeEnabled();
        fireEvent.click(cancel);
        expect(queryDialog()).toBeNull();
      } finally {
        window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, onRefresh);
      }
    });

    it('po neúspechu sa dá potvrdiť znova a vtedy sa karta zmaže', async () => {
      mockApiDelete.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({});
      await renderDashboard();
      const { confirm } = await openDeleteDialog(makeOffer(7));

      await act(async () => {
        fireEvent.click(confirm);
      });
      expect(queryDialog()).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(confirm);
      });

      expect(mockApiDelete).toHaveBeenCalledTimes(2);
      expect(queryDialog()).toBeNull();
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    it('kartu, ktorej id sa medzitým pokazilo, nezmaže a okno zavrie', async () => {
      // Obranná vetva: id sa kontroluje aj pri potvrdení, nielen pri otvorení.
      const offer = makeOffer(7);
      await renderDashboard();
      const { confirm } = await openDeleteDialog(offer);
      offer.id = 0;

      await act(async () => {
        fireEvent.click(confirm);
      });

      expect(mockApiDelete).not.toHaveBeenCalled();
      expect(queryDialog()).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(deleteFailedText);
    });
  });
});

describe('texty hlášok', () => {
  it('berú sa z prekladača komponentu: kľúč aj záložný text sa naň odovzdajú', async () => {
    jest
      .spyOn(languageContext, 't')
      .mockImplementation((key: string, fallback?: string) => `[${key}] ${fallback}`);
    mockApiDelete.mockResolvedValue({});
    await renderDashboard();

    await editOffer(makeOffer(0));
    expect(toast.error).toHaveBeenLastCalledWith(
      '[skills.cardEditFailed] Kartu sa nepodarilo otvoriť na úpravu. Skúste to znova.',
    );

    await deleteOffer(makeOffer(0));
    expect(toast.error).toHaveBeenLastCalledWith(
      '[skills.cardDeleteFailed] Kartu sa nepodarilo odstrániť. Skúste to znova.',
    );

    await deleteOffer(makeOffer(7));
    await act(async () => {
      fireEvent.click(dialogButtons().confirm);
    });
    expect(toast.success).toHaveBeenLastCalledWith('[skills.cardDeleteSuccess] Karta bola vymazaná.');
  });
});

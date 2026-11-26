/**
 * Stránka výsledkov vyhľadávania (`SearchLayout`): panel upozornení v ľavom menu (nález 380).
 *
 * Samostatné rozloženie `/search` malo v ľavom menu zapojené len vyhľadávanie a pár sekcií, takže Upozornenia nerobili nič
 * (panel upozornení tam vôbec nebol). Testy idú cez skutočné ľavé menu (`Sidebar`), skutočný zoznam upozornení
 * (`NotificationsFeed` s falošným serverom), atrapu smerovača a atrapu vyhľadávacieho panela; vlastnosti od rozloženia sa
 * zachytia, aby sa dali volať ako z vnútra panela.
 */

import type { ComponentProps, ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type Sidebar from '@/components/dashboard/Sidebar';
import type SearchModule from '@/components/dashboard/modules/SearchModule';
import type NotificationsFeed from '@/components/dashboard/modules/notifications/NotificationsFeed';
import {
  listNotificationsPage,
  markNotificationRead,
} from '@/components/dashboard/modules/notifications/notificationsApi';
import { notification } from '@/components/dashboard/modules/notifications/notificationsFeedTestUtils';
import { SearchLayout } from './SearchLayout';

const mockPush = jest.fn();
let mockSidebarProps: ComponentProps<typeof Sidebar>;
let mockSearchProps: ComponentProps<typeof SearchModule>;
let mockFeedProps: ComponentProps<typeof NotificationsFeed>;
let mockProviderProps: { acknowledgeNotificationsBadge?: boolean };

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 105, slug: 'test-user' }, logout: jest.fn() }),
}));
jest.mock('@/components/dashboard/contexts/RequestsNotificationsContext', () => ({
  RequestsNotificationsProvider: (props: { children: ReactNode; acknowledgeNotificationsBadge?: boolean }) => {
    mockProviderProps = { acknowledgeNotificationsBadge: props.acknowledgeNotificationsBadge };
    return <>{props.children}</>;
  },
  useRequestsNotifications: () => ({ unreadCount: 0, markAllRead: jest.fn() }),
  useMessagesNotifications: () => ({ unreadCount: 0 }),
  useNotificationsUnread: () => ({ unreadCount: 0 }),
}));

// Skutočné ľavé menu: kliky a stav aktívnej položky idú cez ňu; vlastnosti sa len zachytia.
jest.mock('@/components/dashboard/Sidebar', () => {
  const RealSidebar = jest.requireActual('@/components/dashboard/Sidebar').default;
  return {
    __esModule: true,
    /** Skutočné menu bez dopytov na počty upozornení; vlastnosti od rozloženia sa len zachytia. */
    default: (props: ComponentProps<typeof Sidebar>) => {
      mockSidebarProps = props;
      return <RealSidebar {...props} />;
    },
  };
});

// Vyhľadávanie samo (dopyty na server) nie je predmetom testu; vlastnosti od rozloženia sa zachytia.
jest.mock('@/components/dashboard/modules/SearchModule', () => ({
  __esModule: true,
  /** Atrapa vyhľadávacieho panela s poľom, v ktorom sa dá overiť zachovanie napísaného dopytu. */
  default: (props: ComponentProps<typeof SearchModule>) => {
    mockSearchProps = props;
    return (
      <div data-testid="search-child" data-active={String(props.isActive)}>
        <input aria-label="Vyhľadávací dopyt" />
      </div>
    );
  },
}));

// Skutočný zoznam upozornení (položky, ich cieľ aj udalosť pri zhode so sledovaním ponuky), len obalený značkou
// a so zachytenými vlastnosťami, aby sa dalo zavolať `onNavigate` s ľubovoľnou adresou.
jest.mock('@/components/dashboard/modules/notifications/NotificationsFeed', () => {
  const RealNotificationsFeed = jest.requireActual(
    '@/components/dashboard/modules/notifications/NotificationsFeed',
  ).default;
  return {
    __esModule: true,
    /** Skutočný zoznam upozornení v značke, ktorá hovorí, že panel je otvorený. */
    default: (props: ComponentProps<typeof NotificationsFeed>) => {
      mockFeedProps = props;
      return (
        <div data-testid="notifications-child" data-variant={props.variant}>
          <RealNotificationsFeed {...props} />
        </div>
      );
    },
  };
});

// Falošný server upozornení: bez siete, odpoveď určuje každý test.
jest.mock('@/components/dashboard/modules/notifications/notificationsApi', () => ({
  __esModule: true,
  listNotificationsPage: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));
jest.mock('@/components/dashboard/contexts/notificationUnreadStore', () => ({
  __esModule: true,
  publishNotificationUnreadCount: jest.fn(),
}));

const listMock = listNotificationsPage as jest.Mock;
const markReadMock = markNotificationRead as jest.Mock;

/** Vykreslí rozloženie so skutočným menu a tlačidlom s výsledkami, na ktoré sa dá kliknúť mimo panela. */
function renderLayout() {
  const view = render(
    <ThemeProvider>
      <SearchLayout>
        <button>Výsledky stránky</button>
      </SearchLayout>
    </ThemeProvider>,
  );
  const sidebar = view.container.querySelector('[data-sidebar="left"]')!;
  return { ...view, sidebar, panel: sidebar.nextElementSibling! };
}

/** Tlačidlo ľavého menu podľa stabilného identifikátora, nezávisle od prekladov. */
function navButton(id: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`[data-sidebar-nav-item="${id}"]`)!;
}

const jePanelUpozorneniOtvoreny = () => screen.queryByTestId('notifications-child') !== null;

/** Otvorí panel upozornení ťukom na menu a overí, že sa naozaj otvoril (inak by ďalšie overenia nič nedokazovali). */
function otvorPanelUpozorneni() {
  fireEvent.click(navButton('notifications'));
  expect(jePanelUpozorneniOtvoreny()).toBe(true);
}

/** Upozornenie na zhodu so sledovaním ponuky neodovzdá cieľ cez `onNavigate`, ale oknovou udalosťou ako skutočná položka. */
function poslatUdalostProfilu(detail: { identifier: string; highlightId: number | string }) {
  window.dispatchEvent(new CustomEvent('goToUserProfile', { detail }));
}

/** Odpoveď falošného servera s danými upozorneniami na jednej stránke. */
function serverSUpozorneniami(...items: ReturnType<typeof notification>[]) {
  listMock.mockResolvedValue({
    results: items,
    total: items.length,
    page: 1,
    pageSize: 15,
    totalPages: 1,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProviderProps = {};
  // Zoznam sa načíta len v testoch, ktoré ho potrebujú; inak ostane čakať a po teste nič nezmení.
  listMock.mockReturnValue(new Promise(() => {}));
  markReadMock.mockResolvedValue({ id: 1, is_read: true, read_at: null, unread_count: 0 });
  document.body.classList.remove('filter-modal-open');
  document.documentElement.classList.remove('dark');
  window.history.replaceState(null, '', '/search?q=ap');
});

afterEach(() => {
  document.body.classList.remove('filter-modal-open');
  window.history.replaceState(null, '', '/');
});

describe('stránka výsledkov: panel upozornení', () => {
  it('ťuk na Upozornenia otvorí panel upozornení v stĺpci vedľa menu a nič nenaviguje', () => {
    const { sidebar, panel } = renderLayout();
    expect(jePanelUpozorneniOtvoreny()).toBe(false);

    fireEvent.click(navButton('notifications'));

    expect(jePanelUpozorneniOtvoreny()).toBe(true);
    expect(screen.getByTestId('notifications-child')).toHaveAttribute('data-variant', 'panel');
    expect(panel.contains(screen.getByTestId('notifications-child'))).toBe(true);
    expect(sidebar.nextElementSibling).toBe(panel);
    expect(panel).toHaveAttribute('aria-hidden', 'false');
    // Stĺpec nesmie ostať skrytý ako zatvorený: panel má byť viditeľný a ovládateľný.
    expect(panel).toHaveClass('opacity-100', 'pointer-events-auto');
    expect(panel).not.toHaveClass('invisible');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('kým je panel otvorený, ľavé menu označuje Upozornenia; po zatvorení znova Vyhľadávanie', () => {
    renderLayout();
    expect(mockSidebarProps.activeItem).toBe('search');

    fireEvent.click(navButton('notifications'));
    expect(mockSidebarProps.activeItem).toBe('notifications');

    fireEvent.click(navButton('notifications'));
    expect(mockSidebarProps.activeItem).toBe('search');
  });

  it('druhý ťuk na Upozornenia panel zatvorí', () => {
    const { panel } = renderLayout();
    otvorPanelUpozorneni();

    fireEvent.click(navButton('notifications'));

    expect(jePanelUpozorneniOtvoreny()).toBe(false);
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveClass('invisible');
  });

  it('otvorenie upozornení zavrie vyhľadávací panel, ktorý ostane namontovaný, a naopak', () => {
    renderLayout();
    fireEvent.click(navButton('search'));
    expect(screen.getByTestId('search-child')).toHaveAttribute('data-active', 'true');

    fireEvent.click(navButton('notifications'));
    expect(jePanelUpozorneniOtvoreny()).toBe(true);
    expect(screen.getByTestId('search-child')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('search-child').parentElement).toHaveClass('hidden');

    fireEvent.click(navButton('search'));
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
    expect(screen.getByTestId('search-child')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('search-child').parentElement).not.toHaveClass('hidden');
  });

  it('rozpísaný dopyt vo vyhľadávaní prežije otvorenie a zatvorenie upozornení', () => {
    renderLayout();
    fireEvent.click(navButton('search'));
    fireEvent.change(screen.getByLabelText('Vyhľadávací dopyt'), { target: { value: 'aplikácia' } });

    otvorPanelUpozorneni();
    fireEvent.click(navButton('notifications'));
    fireEvent.click(navButton('search'));

    expect(screen.getByLabelText('Vyhľadávací dopyt')).toHaveValue('aplikácia');
  });

  it('zatvorenie požadované vyhľadávacím panelom zavrie aj panel upozornení (jeden spoločný stĺpec)', () => {
    renderLayout();
    otvorPanelUpozorneni();

    act(() => mockSearchProps.onClose?.());

    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('otvorený panel upozornení rozšíri mriežku o stĺpec panela rovnako ako vyhľadávanie, zatvorený ho zbalí', () => {
    const { container } = renderLayout();
    const mriezka = container.querySelector('.grid')!;
    expect(mriezka).toHaveClass('lg:grid-cols-[280px_0px_1fr]');

    fireEvent.click(navButton('notifications'));
    expect(mriezka).toHaveClass('lg:grid-cols-[280px_280px_1fr]');

    fireEvent.click(navButton('notifications'));
    expect(mriezka).toHaveClass('lg:grid-cols-[280px_0px_1fr]');
  });

  it('poskytovateľ upozornení dostane potvrdenie zobrazenia odznaku, len kým je panel otvorený', () => {
    renderLayout();
    expect(mockProviderProps.acknowledgeNotificationsBadge).toBe(false);

    fireEvent.click(navButton('notifications'));
    expect(mockProviderProps.acknowledgeNotificationsBadge).toBe(true);

    fireEvent.click(navButton('notifications'));
    expect(mockProviderProps.acknowledgeNotificationsBadge).toBe(false);
  });

  it('Upozornenia ani Vyhľadávanie samy nenavigujú', () => {
    renderLayout();

    fireEvent.click(navButton('notifications'));
    fireEvent.click(navButton('search'));

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('stránka výsledkov: zatvorenie panela upozornení', () => {
  it('stlačenie myši na výsledkoch mimo panela ho zatvorí bez navigácie', () => {
    renderLayout();
    otvorPanelUpozorneni();

    fireEvent.mouseDown(screen.getByText('Výsledky stránky'));

    expect(jePanelUpozorneniOtvoreny()).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('stlačenie myši vnútri panela ho nezatvorí', () => {
    renderLayout();
    otvorPanelUpozorneni();

    fireEvent.mouseDown(screen.getByTestId('notifications-child'));

    expect(jePanelUpozorneniOtvoreny()).toBe(true);
  });

  it('stlačenie myši na tlačidle Upozornenia v menu ho nezatvorí zvlášť (zatvorenie rieši samotný ťuk)', () => {
    renderLayout();
    otvorPanelUpozorneni();

    fireEvent.mouseDown(navButton('notifications'));
    expect(jePanelUpozorneniOtvoreny()).toBe(true);

    fireEvent.click(navButton('notifications'));
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('stlačenie myši na inej položke menu ho zatvorí', () => {
    renderLayout();
    otvorPanelUpozorneni();

    fireEvent.mouseDown(navButton('favorites'));

    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('Escape panel zatvorí a udalosť spotrebuje, iné klávesy ho nechajú', () => {
    renderLayout();
    otvorPanelUpozorneni();

    expect(fireEvent.keyDown(document.body, { key: 'Enter' })).toBe(true);
    expect(jePanelUpozorneniOtvoreny()).toBe(true);

    expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(false);
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('Escape vo vnútri dialógu panel upozornení nezatvorí', () => {
    renderLayout();
    otvorPanelUpozorneni();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const field = document.createElement('input');
    dialog.appendChild(field);
    document.body.appendChild(dialog);

    fireEvent.keyDown(field, { key: 'Escape' });

    expect(jePanelUpozorneniOtvoreny()).toBe(true);
    dialog.remove();
  });

  it('po zatvorení už Escape nič nespotrebúva (poslucháči sa odobrali)', () => {
    renderLayout();
    otvorPanelUpozorneni();
    fireEvent.click(navButton('notifications'));

    expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true);
  });
});

describe('stránka výsledkov: preklik z panela upozornení', () => {
  it.each([
    ['príspevok s komentárom', '/dashboard/feed/7?comment=3'],
    ['žiadosti s filtrom v adrese', '/dashboard/requests?status=active&tab=sent'],
    ['samotný dashboard', '/dashboard'],
  ])('cieľ %s prejde na adresu v dashboarde bez straty a zatvorí panel', (_nazov, adresa) => {
    renderLayout();
    otvorPanelUpozorneni();

    act(() => mockFeedProps.onNavigate?.(adresa));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(adresa);
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it.each([
    ['prihlasovacia stránka', '/login'],
    ['adresa s dvoma lomkami', '//dashboard/requests'],
    ['iný web', 'https://example.com/dashboard/requests'],
    ['podobný začiatok cesty', '/dashboardx/requests'],
    ['prázdna adresa', ''],
  ])('%s sa ignoruje: bez navigácie a panel ostane otvorený', (_nazov, adresa) => {
    renderLayout();
    otvorPanelUpozorneni();

    act(() => mockFeedProps.onNavigate?.(adresa));

    expect(mockPush).not.toHaveBeenCalled();
    expect(jePanelUpozorneniOtvoreny()).toBe(true);
  });
});

describe('stránka výsledkov: upozornenie na zhodu so sledovaním ponuky (udalosť goToUserProfile)', () => {
  it('otvorí profil so zvýraznením ponuky a zatvorí panel', () => {
    renderLayout();
    otvorPanelUpozorneni();

    act(() => poslatUdalostProfilu({ identifier: 'test', highlightId: 7 }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/test?highlight=7');
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('s neplatným zvýraznením otvorí profil bez neho', () => {
    renderLayout();
    otvorPanelUpozorneni();

    act(() => poslatUdalostProfilu({ identifier: 'test', highlightId: 'abc' }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/test');
  });

  it('bez identifikátora sa ignoruje: bez navigácie a panel ostane otvorený', () => {
    renderLayout();
    otvorPanelUpozorneni();

    act(() => poslatUdalostProfilu({ identifier: '  ', highlightId: 7 }));

    expect(mockPush).not.toHaveBeenCalled();
    expect(jePanelUpozorneniOtvoreny()).toBe(true);
  });

  it('kým je panel zatvorený, udalosť na stránke výsledkov nič nerobí', () => {
    renderLayout();

    act(() => poslatUdalostProfilu({ identifier: 'test', highlightId: 7 }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('po zatvorení panela sa poslucháč odobral', () => {
    renderLayout();
    otvorPanelUpozorneni();
    fireEvent.click(navButton('notifications'));

    act(() => poslatUdalostProfilu({ identifier: 'test', highlightId: 7 }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('po odmontovaní stránky sa poslucháč odobral', () => {
    const { unmount } = renderLayout();
    otvorPanelUpozorneni();
    unmount();

    act(() => poslatUdalostProfilu({ identifier: 'test', highlightId: 7 }));

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('stránka výsledkov: skutočný zoznam upozornení v paneli', () => {
  const zhodaSoSledovanim = notification(1, {
    type: 'offer_watch_match',
    data: { offer_id: 42, offer_is_seeking: false },
    actor: { id: 8, display_name: 'Testovací Autor' },
    target_url: '/dashboard/users/watch-owner?highlight=42',
  });
  const komentar = notification(2, {
    type: 'feed_post_commented',
    actor: { id: 9, display_name: 'Testovací Čitateľ' },
    target_url: '/dashboard/feed/7?comment=3',
  });

  it('zobrazí upozornenia zo servera bez ďalších poskytovateľov mimo rozloženia', async () => {
    serverSUpozorneniami(zhodaSoSledovanim, komentar);
    renderLayout();

    otvorPanelUpozorneni();

    expect(await screen.findByRole('button', { name: /zodpovedá tvojmu sledovaniu/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /komentoval tvoj príspevok/ })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('upozornenie na zhodu so sledovaním ponuky otvorí profil so zvýraznením ponuky a zatvorí panel', async () => {
    serverSUpozorneniami(zhodaSoSledovanim);
    renderLayout();
    otvorPanelUpozorneni();

    fireEvent.click(await screen.findByRole('button', { name: /zodpovedá tvojmu sledovaniu/ }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/watch-owner?highlight=42');
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
    expect(markReadMock).toHaveBeenCalledWith(1);
  });

  it('upozornenie na komentár prejde na príspevok s komentárom a zatvorí panel', async () => {
    serverSUpozorneniami(komentar);
    renderLayout();
    otvorPanelUpozorneni();

    fireEvent.click(await screen.findByRole('button', { name: /komentoval tvoj príspevok/ }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/feed/7?comment=3');
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });
});

describe('stránka výsledkov: Správy a Štatistiky v ľavom menu', () => {
  it.each([
    ['messages', '/dashboard/messages'],
    ['statistics', '/dashboard/statistics'],
  ])('%s prejde na svoju adresu v dashboarde (jedna navigácia)', (id, url) => {
    renderLayout();
    fireEvent.click(navButton(id));
    expect(mockPush.mock.calls).toEqual([[url]]);
  });
});

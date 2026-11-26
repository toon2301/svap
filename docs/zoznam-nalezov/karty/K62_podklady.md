# Podklady ku karte K62 (oprava nálezu 380)

Pripravil agent 26. 11. 2026 ako podklad ku karte `karty/K62.md`. Je to **prototyp v kópii mimo repozitára** (zložený z `main` `8afe1fd6`), nie hotový kód: kolega z neho vychádza, ale **neprepisuje ho naslepo**. Každé tvrdenie si over voči kódu, napíš vlastné commity a testy a ak niečo nedrží, napíš prečo.

## Čo prototyp overil

| Kontrola | Výsledok |
| --- | --- |
| Nový súbor testov `SearchLayout.upozornenia.test.tsx` na pôvodnom `SearchLayout.tsx` | **16 z 23 padá** (medzi nimi otvorenie panela upozornení, označenie položky menu, zatvorenie klávesom Escape a klikom mimo, preklik z panela a obe položky Správy a Štatistiky); 7 prechádza (pravidlá, ktoré sa nesmú pokaziť) |
| Ten istý súbor po oprave | **23 z 23 prechádza** |
| Existujúce `SearchLayout.navigation.test.tsx`, `SearchLayout.scroll.test.tsx` a `SearchLayout.viewportHeight.test.tsx` po oprave | **52 z 52 prechádza**, bez zmeny týchto súborov |
| Celé `components/search` a `app/search` po oprave | 22 sád, 345 testov, 0 pádov |
| `tsc --noEmit` celej aplikácie | 0 chýb |
| ESLint na `SearchLayout.tsx` | 0 chýb; jedno staré upozornenie (nepoužitý parameter `_summary`, riadok 84 pôvodného súboru), ktoré nesúvisí s dávkou |
| Zásahy do kódu (14, každý je jedna výmena textu v prototype) | **14 zo 14 zachytených** (menu bez obsluhy Upozornení; menu stále označuje Vyhľadávanie; upozornenia nezavrú vyhľadávanie; vyhľadávanie nezavrie upozornenia; mousedown na Upozorneniach v menu zatvorí panel; klik mimo a Escape len pre vyhľadávanie; preklik bez kontroly adresy; panel po prekliku ostane otvorený; Správy nezapojené; Štatistiky nezapojené; odznak nepotvrdený; vyhľadávanie sa pri upozorneniach neskryje; mriežka len pre vyhľadávanie; panel bez `onNavigate`) |

Veľkosť: `SearchLayout.tsx` 181 → 215 riadkov, vzorový súbor testov 337 riadkov. Prototyp nemení nič v `frontend/src/components/dashboard/**`.

## Diff `SearchLayout.tsx` (prototyp)

```diff
--- a/frontend/src/components/search/SearchLayout.tsx
+++ b/frontend/src/components/search/SearchLayout.tsx
@@ -5,6 +5,7 @@
 import { useAuth } from '@/contexts/AuthContext';
 import Sidebar from '@/components/dashboard/Sidebar';
 import SearchModule from '@/components/dashboard/modules/SearchModule';
+import NotificationsFeed from '@/components/dashboard/modules/notifications/NotificationsFeed';
 import { RequestsNotificationsProvider } from '@/components/dashboard/contexts/RequestsNotificationsContext';
 import {
   openUserProfileFromSearch,
@@ -23,6 +24,8 @@
   const router = useRouter();
   const { logout: authLogout, user } = useAuth();
   const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
+  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
+  const isAuxiliaryPanelOpen = isSearchPanelOpen || isNotificationsPanelOpen;
   const mainRef = useRef<HTMLElement>(null);
   useSearchScrollRestoration(mainRef, user?.id);
   useDashboardWindowScrollReset('search');
@@ -35,6 +38,8 @@
       if (itemId === 'home') url = '/dashboard';
       else if (itemId === 'favorites') url = '/dashboard/favorites';
       else if (itemId === 'requests') url = '/dashboard/requests';
+      else if (itemId === 'messages') url = '/dashboard/messages';
+      else if (itemId === 'statistics') url = '/dashboard/statistics';
       else if (itemId === 'watches') url = '/dashboard/watches';
       else if (itemId === 'profile') {
         const identifier = user?.slug || (user ? String(user.id) : '');
@@ -46,8 +51,27 @@
     [router, user],
   );
 
-  /** Toggle the desktop search overlay without creating a browser history entry. */
-  const handleSidebarSearchClick = useCallback(() => setIsSearchPanelOpen((prev) => !prev), []);
+  /** Toggle the desktop search overlay without creating a browser history entry; it replaces the notifications panel. */
+  const handleSidebarSearchClick = useCallback(() => {
+    setIsNotificationsPanelOpen(false);
+    setIsSearchPanelOpen((prev) => !prev);
+  }, []);
+
+  /** Toggle the desktop notifications panel (same column as the search panel); it replaces the search panel. */
+  const handleSidebarNotificationsClick = useCallback(() => {
+    setIsSearchPanelOpen(false);
+    setIsNotificationsPanelOpen((prev) => !prev);
+  }, []);
+
+  /** A notification target always lives in the dashboard: leave the search page and close the panel. */
+  const handleNotificationNavigate = useCallback(
+    (targetUrl: string) => {
+      if (targetUrl !== '/dashboard' && !targetUrl.startsWith('/dashboard/')) return;
+      setIsNotificationsPanelOpen(false);
+      router.push(targetUrl);
+    },
+    [router],
+  );
 
   /** End the current session before navigating back to the public home page. */
   const handleLogout = useCallback(() => {
@@ -73,14 +97,17 @@
     [router],
   );
 
-  /** Dismiss only the overlay, leaving the main search results and URL intact. */
-  const handleCloseSearchPanel = useCallback(() => setIsSearchPanelOpen(false), []);
+  /** Dismiss only the overlay (search or notifications), leaving the main search results and URL intact. */
+  const handleCloseSearchPanel = useCallback(() => {
+    setIsSearchPanelOpen(false);
+    setIsNotificationsPanelOpen(false);
+  }, []);
 
   const searchPanelRef = useRef<HTMLDivElement>(null);
 
   // Zatvor vyhľadávací panel pri kliknutí mimo neho (rovnaká logika ako DashboardLayout)
   useEffect(() => {
-    if (!isSearchPanelOpen) return;
+    if (!isAuxiliaryPanelOpen) return;
 
     /** Ignore panel/filter interactions but dismiss the search overlay on outside clicks. */
     const handleClickOutside = (event: MouseEvent) => {
@@ -97,7 +124,7 @@
       const leftSidebar = document.querySelector('[data-sidebar="left"]');
       if (leftSidebar?.contains(target)) {
         const el = target as HTMLElement;
-        if (el.closest?.('[data-sidebar-nav-item="search"]')) {
+        if (el.closest?.('[data-sidebar-nav-item="search"]') || el.closest?.('[data-sidebar-nav-item="notifications"]')) {
           return;
         }
         handleCloseSearchPanel();
@@ -125,23 +152,24 @@
       document.removeEventListener('mousedown', handleClickOutside);
       document.removeEventListener('keydown', handleKeyDown);
     };
-  }, [isSearchPanelOpen, handleCloseSearchPanel]);
-
-  const gridColsClassName = isSearchPanelOpen
+  }, [isAuxiliaryPanelOpen, handleCloseSearchPanel]);
+
+  const gridColsClassName = isAuxiliaryPanelOpen
     ? 'lg:grid-cols-[280px_280px_1fr] xl:grid-cols-[384px_384px_1fr]'
     : 'lg:grid-cols-[280px_0px_1fr] xl:grid-cols-[384px_0px_1fr]';
 
   return (
-    <RequestsNotificationsProvider>
+    <RequestsNotificationsProvider acknowledgeNotificationsBadge={isNotificationsPanelOpen}>
       <div className={`${VIEWPORT_HEIGHT_CLASSES} bg-[var(--background)] text-[var(--foreground)] overflow-hidden`}>
         <div className={`h-full grid grid-cols-1 ${gridColsClassName}`}>
           {/* Left Sidebar - Desktop only */}
           <div className="hidden lg:block h-screen overflow-hidden" data-sidebar="left">
             <Sidebar
-              activeItem="search"
+              activeItem={isNotificationsPanelOpen ? 'notifications' : 'search'}
               onItemClick={handleItemClick}
               onLogout={handleLogout}
               onSearchClick={handleSidebarSearchClick}
+              onNotificationsClick={handleSidebarNotificationsClick}
             />
           </div>
 
@@ -150,19 +178,25 @@
             ref={searchPanelRef}
             className={[
               'hidden lg:flex h-screen flex-col overflow-hidden bg-[var(--background)] transition-opacity duration-200',
-              isSearchPanelOpen ? 'opacity-100 pointer-events-auto border-r border-gray-200 dark:border-gray-800' : 'invisible opacity-0 pointer-events-none border-r-0',
+              isAuxiliaryPanelOpen ? 'opacity-100 pointer-events-auto border-r border-gray-200 dark:border-gray-800' : 'invisible opacity-0 pointer-events-none border-r-0',
             ].join(' ')}
-            aria-hidden={!isSearchPanelOpen}
+            aria-hidden={!isAuxiliaryPanelOpen}
           >
-            {user ? (
-              <SearchModule
-                user={user}
-                onUserClick={handleViewUserProfile}
-                onSkillClick={handleViewUserSkill}
-                isOverlay
-                isActive={isSearchPanelOpen}
-                onClose={handleCloseSearchPanel}
-              />
+            {/* Search stays mounted (its query and filters survive) and is only hidden while notifications are shown. */}
+            <div className={isNotificationsPanelOpen ? 'hidden' : 'h-full'}>
+              {user ? (
+                <SearchModule
+                  user={user}
+                  onUserClick={handleViewUserProfile}
+                  onSkillClick={handleViewUserSkill}
+                  isOverlay
+                  isActive={isSearchPanelOpen}
+                  onClose={handleCloseSearchPanel}
+                />
+              ) : null}
+            </div>
+            {isNotificationsPanelOpen ? (
+              <NotificationsFeed variant="panel" onNavigate={handleNotificationNavigate} />
             ) : null}
           </div>
 
```

## Vzorový súbor testov (prototyp; kolega píše vlastný, názvy po slovensky)

```tsx
/**
 * Stránka výsledkov vyhľadávania (`SearchLayout`): panel upozornení a položky menu, ktoré tu dosiaľ nič nerobili (nález 380).
 *
 * Samostatný rozložný komponent `/search` mal v ľavom menu zapojené len vyhľadávanie a pár sekcií. Upozornenia (panel v
 * rovnakom stĺpci ako vyhľadávanie), Správy a Štatistiky nerobili nič. Testy idú cez skutočné ľavé menu (`Sidebar`) a cez
 * vonkajšie rozhranie rozloženia (DOM, `data-sidebar-nav-item`, atrapa smerovača a atrapy panelov vyhľadávania a
 * upozornení, ktoré vystavia vlastnosti od rozloženia).
 */

import type { ComponentProps, ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type Sidebar from '@/components/dashboard/Sidebar';
import type SearchModule from '@/components/dashboard/modules/SearchModule';
import type NotificationsFeed from '@/components/dashboard/modules/notifications/NotificationsFeed';
import { SearchLayout } from './SearchLayout';

const mockPush = jest.fn();
let mockSidebarProps: ComponentProps<typeof Sidebar>;
let mockSearchProps: ComponentProps<typeof SearchModule>;
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
    default: (props: ComponentProps<typeof Sidebar>) => {
      mockSidebarProps = props;
      return <RealSidebar {...props} />;
    },
  };
});

jest.mock('@/components/dashboard/modules/SearchModule', () => ({
  __esModule: true,
  default: (props: ComponentProps<typeof SearchModule>) => {
    mockSearchProps = props;
    return (
      <div data-testid="search-child" data-active={String(props.isActive)}>
        <input aria-label="Vyhľadávací dopyt" />
      </div>
    );
  },
}));

jest.mock('@/components/dashboard/modules/notifications/NotificationsFeed', () => ({
  __esModule: true,
  default: (props: ComponentProps<typeof NotificationsFeed>) => {
    return (
      <div data-testid="notifications-child" data-variant={props.variant}>
        <button onClick={() => props.onNavigate?.('/dashboard/feed/7?comment=3')}>Upozornenie na komentár</button>
        <button onClick={() => props.onNavigate?.('/dashboard')}>Upozornenie na Nástenku</button>
        <button onClick={() => props.onNavigate?.('/login')}>Cudzia adresa</button>
        <button onClick={() => props.onNavigate?.('//dashboard/requests')}>Adresa s dvoma lomkami</button>
        <button onClick={() => props.onNavigate?.('https://example.com/dashboard/requests')}>Adresa na iný web</button>
      </div>
    );
  },
}));

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

beforeEach(() => {
  jest.clearAllMocks();
  mockProviderProps = {};
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
    fireEvent.click(navButton('notifications'));

    fireEvent.click(navButton('notifications'));

    expect(jePanelUpozorneniOtvoreny()).toBe(false);
    expect(panel).toHaveAttribute('aria-hidden', 'true');
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

    fireEvent.click(navButton('notifications'));
    fireEvent.click(navButton('notifications'));
    fireEvent.click(navButton('search'));

    expect(screen.getByLabelText('Vyhľadávací dopyt')).toHaveValue('aplikácia');
  });

  it('zatvorenie z vyhľadávacieho panela zavrie aj panel upozornení (jeden spoločný stĺpec)', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

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
});

describe('stránka výsledkov: zatvorenie panela upozornení', () => {
  it('stlačenie myši na výsledkoch mimo panela ho zatvorí bez navigácie', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

    fireEvent.mouseDown(screen.getByText('Výsledky stránky'));

    expect(jePanelUpozorneniOtvoreny()).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('stlačenie myši vnútri panela ho nezatvorí', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

    fireEvent.mouseDown(screen.getByText('Upozornenie na komentár'));

    expect(jePanelUpozorneniOtvoreny()).toBe(true);
  });

  it('stlačenie myši na tlačidle Upozornenia v menu ho nezatvorí zvlášť (zatvorenie rieši samotný ťuk)', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

    fireEvent.mouseDown(navButton('notifications'));
    expect(jePanelUpozorneniOtvoreny()).toBe(true);

    fireEvent.click(navButton('notifications'));
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('stlačenie myši na inej položke menu ho zatvorí', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

    fireEvent.mouseDown(navButton('favorites'));

    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('Escape panel zatvorí a udalosť spotrebuje, iné klávesy ho nechajú', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

    expect(fireEvent.keyDown(document.body, { key: 'Enter' })).toBe(true);
    expect(jePanelUpozorneniOtvoreny()).toBe(true);

    expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(false);
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('Escape vo vnútri dialógu panel upozornení nezatvorí', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));
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
    fireEvent.click(navButton('notifications'));
    fireEvent.click(navButton('notifications'));

    expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true);
  });
});

describe('stránka výsledkov: preklik z panela upozornení', () => {
  it('upozornenie na komentár prejde na adresu v dashboarde a zatvorí panel', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

    fireEvent.click(screen.getByText('Upozornenie na komentár'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/feed/7?comment=3');
    expect(jePanelUpozorneniOtvoreny()).toBe(false);
  });

  it('adresa samotného dashboardu je tiež platný cieľ', () => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

    fireEvent.click(screen.getByText('Upozornenie na Nástenku'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it.each([
    ['Cudzia adresa'],
    ['Adresa s dvoma lomkami'],
    ['Adresa na iný web'],
  ])('%s sa ignoruje: bez navigácie a panel ostane otvorený', (nazov) => {
    renderLayout();
    fireEvent.click(navButton('notifications'));

    fireEvent.click(screen.getByText(nazov));

    expect(mockPush).not.toHaveBeenCalled();
    expect(jePanelUpozorneniOtvoreny()).toBe(true);
  });
});

describe('stránka výsledkov: ďalšie položky menu, ktoré nič nerobili', () => {
  it.each([
    ['messages', '/dashboard/messages'],
    ['statistics', '/dashboard/statistics'],
  ])('%s prejde na svoju adresu v dashboarde', (id, url) => {
    renderLayout();

    fireEvent.click(navButton(id));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(url);
  });

  it('Upozornenia ani Vyhľadávanie samy nenavigujú', () => {
    renderLayout();

    fireEvent.click(navButton('notifications'));
    fireEvent.click(navButton('search'));

    expect(mockPush).not.toHaveBeenCalled();
  });
});
```

## Poznámky k návrhu

- **Prečo `SearchModule` ostáva namontovaný:** pôvodný kód ho drží v DOM aj zatvorený (`isActive` len prepína), takže napísaný dopyt a filtre prežijú zatvorenie panela. `DashboardLayout` ho pri upozorneniach odmontuje (`{isNotificationsPanelOpen ? notificationsOverlay : searchOverlay}`), no v `SearchLayout` by to zmenilo existujúce správanie, ktoré stráži test `SearchLayout.navigation.test.tsx`.
- **Prečo mousedown na tlačidle Upozornenia v menu panel nezatvára:** zatvorenie rieši ťuk (prepínač). Keby ho zatvoril aj mousedown, ťuk by ho hneď znova otvoril (to isté už robí `DashboardLayout.tsx:213-216`).
- **Čo prototyp nerieši a kolega over v reálnom prehliadači:** vzhľad stĺpca s `NotificationsFeed` (šírka 280 px, od `xl` 384 px; rovnaká trieda mriežky ako pri vyhľadávaní), načítanie zoznamu upozornení a označenie odznaku v živej aplikácii (testy používajú atrapy), a preklik na príspevok (nová plná navigácia na `/dashboard/feed/<id>` otvorí príspevok v okne nad Nástenkou).
- **Mimo dávky:** mobil (na `/search` sa ľavé menu nezobrazuje, `hidden lg:block`), obsah panela upozornení a odznak počtu.

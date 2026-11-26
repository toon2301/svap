'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import SearchModule from '@/components/dashboard/modules/SearchModule';
import NotificationsFeed from '@/components/dashboard/modules/notifications/NotificationsFeed';
import { RequestsNotificationsProvider } from '@/components/dashboard/contexts/RequestsNotificationsContext';
import {
  openUserProfileFromSearch,
  profileIdentifierFor,
} from '@/components/dashboard/modules/profile/openUserProfileFromSearch';
import { parseDashboardHighlightId } from '@/components/dashboard/components/dashboardTargetUrl';
import { useDashboardWindowScrollReset } from '@/components/dashboard/hooks/useDashboardWindowScrollReset';
import { VIEWPORT_HEIGHT_CLASSES } from '@/components/dashboard/viewportHeightClasses';
import { useSearchScrollRestoration } from './useSearchScrollRestoration';

interface SearchLayoutProps {
  children: React.ReactNode;
}

/** Samostatná stránka výsledkov vyhľadávania so spoločným ľavým menu a zatvárateľným bočným panelom (vyhľadávanie alebo upozornenia). */
export function SearchLayout({ children }: SearchLayoutProps) {
  const router = useRouter();
  const { logout: authLogout, user } = useAuth();
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  /** Vyhľadávanie a upozornenia sa striedajú v jednom stĺpci vedľa menu, takže otvorený je vždy najviac jeden z nich. */
  const isAuxiliaryPanelOpen = isSearchPanelOpen || isNotificationsPanelOpen;
  const mainRef = useRef<HTMLElement>(null);
  useSearchScrollRestoration(mainRef, user?.id);
  useDashboardWindowScrollReset('search');

  /** Use Next navigation for full-page destinations outside the independent search layout. */
  const handleItemClick = useCallback(
    (itemId: string) => {
      if (itemId === 'search') return;
      let url: string;
      if (itemId === 'home') url = '/dashboard';
      else if (itemId === 'favorites') url = '/dashboard/favorites';
      else if (itemId === 'requests') url = '/dashboard/requests';
      else if (itemId === 'watches') url = '/dashboard/watches';
      else if (itemId === 'profile') {
        const identifier = user?.slug || (user ? String(user.id) : '');
        url = identifier ? `/dashboard/users/${identifier}` : '/dashboard';
      } else if (itemId === 'settings') url = '/dashboard/settings';
      else return;
      router.push(url);
    },
    [router, user],
  );

  /** Prepne vyhľadávací panel na počítači bez záznamu v histórii prehliadača; otvorený panel upozornení pritom zavrie. */
  const handleSidebarSearchClick = useCallback(() => {
    setIsNotificationsPanelOpen(false);
    setIsSearchPanelOpen((prev) => !prev);
  }, []);

  /** Prepne panel upozornení v tom istom stĺpci bez záznamu v histórii prehliadača; otvorené vyhľadávanie pritom zavrie. */
  const handleSidebarNotificationsClick = useCallback(() => {
    setIsSearchPanelOpen(false);
    setIsNotificationsPanelOpen((prev) => !prev);
  }, []);

  /**
   * Preklik z panela upozornení: cieľ upozornenia je vždy v dashboarde, teda mimo tejto stránky, takže panel zavrie a prejde
   * na adresu. Rovnako ako `useNotificationNavigation` v dashboarde ignoruje všetko, čo nie je presne `/dashboard` alebo
   * `/dashboard/…` (cudzí web, prihlasovacia stránka, adresa s dvoma lomkami), a panel nechá otvorený.
   */
  const handleNotificationNavigate = useCallback(
    (targetUrl: string) => {
      if (targetUrl !== '/dashboard' && !targetUrl.startsWith('/dashboard/')) return;
      setIsNotificationsPanelOpen(false);
      router.push(targetUrl);
    },
    [router],
  );

  /**
   * Upozornenie na zhodu so sledovaním ponuky (`offer_watch_match`) neodovzdá cieľ cez `onNavigate`, ale oknovou udalosťou
   * `goToUserProfile`, ktorú počúva len dashboard. Kým je panel upozornení otvorený, stránka výsledkov ju prevedie na rovnaké
   * otvorenie profilu ako pri výsledkoch vyhľadávania (adresa so zvýraznením ponuky, označenie pôvodu, zapamätanie polohy
   * výsledkov) a panel zavrie. Udalosť bez identifikátora ignoruje a panel nechá otvorený.
   */
  useEffect(() => {
    if (!isNotificationsPanelOpen) return;

    const handleGoToUserProfile = (event: Event) => {
      const detail = (event as CustomEvent<{ identifier?: string; highlightId?: number | string | null }>).detail;
      const identifier = (detail?.identifier || '').trim();
      if (!identifier) return;
      setIsNotificationsPanelOpen(false);
      openUserProfileFromSearch(router, identifier, {
        highlightSkillId: parseDashboardHighlightId(detail?.highlightId),
      });
    };

    window.addEventListener('goToUserProfile', handleGoToUserProfile);
    return () => window.removeEventListener('goToUserProfile', handleGoToUserProfile);
  }, [isNotificationsPanelOpen, router]);

  /** End the current session before navigating back to the public home page. */
  const handleLogout = useCallback(() => {
    authLogout();
    router.push('/');
  }, [authLogout, router]);

  /** Open a selected user through the shared profile-origin navigation helper. */
  const handleViewUserProfile = useCallback(
    (userId: number, slug?: string | null, _summary?: unknown) => {
      openUserProfileFromSearch(router, profileIdentifierFor(userId, slug));
    },
    [router],
  );

  /** Open the card owner's profile and retain the card highlight parameter. */
  const handleViewUserSkill = useCallback(
    (userId: number, skillId: number, slug?: string | null) => {
      openUserProfileFromSearch(router, profileIdentifierFor(userId, slug), {
        highlightSkillId: skillId,
      });
    },
    [router],
  );

  /** Zavrie bočný panel (vyhľadávanie aj upozornenia); výsledky na stránke a jej adresa ostanú, ako boli. */
  const handleCloseAuxiliaryPanel = useCallback(() => {
    setIsSearchPanelOpen(false);
    setIsNotificationsPanelOpen(false);
  }, []);

  const auxiliaryPanelRef = useRef<HTMLDivElement>(null);

  // Zatvor bočný panel (vyhľadávanie aj upozornenia) pri kliknutí mimo neho alebo klávesom Escape (rovnaká logika ako DashboardLayout)
  useEffect(() => {
    if (!isAuxiliaryPanelOpen) return;

    /** Interakcie v paneli a vo filtri ignoruje, kliknutie mimo panela ho zatvorí. */
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (typeof document !== 'undefined' && document.body.classList.contains('filter-modal-open')) {
        return;
      }

      if (auxiliaryPanelRef.current?.contains(target)) {
        return;
      }

      const leftSidebar = document.querySelector('[data-sidebar="left"]');
      if (leftSidebar?.contains(target)) {
        const el = target as HTMLElement;
        // Tlačidlá Vyhľadávanie a Upozornenia sa prepínajú ťukom; zatvorenie pri stlačení myši by ich ťuk hneď znova otvoril.
        if (
          el.closest?.('[data-sidebar-nav-item="search"]') ||
          el.closest?.('[data-sidebar-nav-item="notifications"]')
        ) {
          return;
        }
        handleCloseAuxiliaryPanel();
        return;
      }

      handleCloseAuxiliaryPanel();
    };

    /** Escape najprv prenechá modálnym dialógom; panel pod nimi zatvorí až potom. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const el = event.target as HTMLElement;
      const isInFilterModal =
        el.closest('[role="dialog"]') !== null || document.body.classList.contains('filter-modal-open');
      if (!isInFilterModal) {
        event.preventDefault();
        handleCloseAuxiliaryPanel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuxiliaryPanelOpen, handleCloseAuxiliaryPanel]);

  const gridColsClassName = isAuxiliaryPanelOpen
    ? 'lg:grid-cols-[280px_280px_1fr] xl:grid-cols-[384px_384px_1fr]'
    : 'lg:grid-cols-[280px_0px_1fr] xl:grid-cols-[384px_0px_1fr]';

  return (
    <RequestsNotificationsProvider acknowledgeNotificationsBadge={isNotificationsPanelOpen}>
      <div className={`${VIEWPORT_HEIGHT_CLASSES} bg-[var(--background)] text-[var(--foreground)] overflow-hidden`}>
        <div className={`h-full grid grid-cols-1 ${gridColsClassName}`}>
          {/* Left Sidebar - Desktop only */}
          <div className="hidden lg:block h-screen overflow-hidden" data-sidebar="left">
            <Sidebar
              activeItem={isNotificationsPanelOpen ? 'notifications' : 'search'}
              onItemClick={handleItemClick}
              onLogout={handleLogout}
              onSearchClick={handleSidebarSearchClick}
              onNotificationsClick={handleSidebarNotificationsClick}
            />
          </div>

          {/* Side panel (search or notifications) - Desktop only */}
          <div
            ref={auxiliaryPanelRef}
            className={[
              'hidden lg:flex h-screen flex-col overflow-hidden bg-[var(--background)] transition-opacity duration-200',
              isAuxiliaryPanelOpen ? 'opacity-100 pointer-events-auto border-r border-gray-200 dark:border-gray-800' : 'invisible opacity-0 pointer-events-none border-r-0',
            ].join(' ')}
            aria-hidden={!isAuxiliaryPanelOpen}
          >
            {/* Vyhľadávanie ostáva namontované (napísaný dopyt a filtre prežijú) a len sa skryje, kým sú otvorené upozornenia. */}
            <div className={isNotificationsPanelOpen ? 'hidden' : 'h-full'}>
              {user ? (
                <SearchModule
                  user={user}
                  onUserClick={handleViewUserProfile}
                  onSkillClick={handleViewUserSkill}
                  isOverlay
                  isActive={isSearchPanelOpen}
                  onClose={handleCloseAuxiliaryPanel}
                />
              ) : null}
            </div>
            {isNotificationsPanelOpen ? (
              <NotificationsFeed variant="panel" onNavigate={handleNotificationNavigate} />
            ) : null}
          </div>

          {/* Main Content - rovnaká šírka ako profil; klik mimo ľavého panelu zatvára search (cez useEffect) */}
          <main ref={mainRef} data-dashboard-main data-search-scroll-root className={`relative ${VIEWPORT_HEIGHT_CLASSES} overflow-y-auto elegant-scrollbar`}>
            <div className="py-4 lg:py-8 px-4 sm:px-6 lg:px-8">
              <div className="w-full mx-auto max-w-7xl">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </RequestsNotificationsProvider>
  );
}

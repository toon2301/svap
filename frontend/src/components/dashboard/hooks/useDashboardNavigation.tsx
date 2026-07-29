"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type User } from '@/types';
import { type SearchUserResult } from '../modules/search/types';
import { primeUserSlugId } from '../modules/profile/profileUserCache';
import { type UseDashboardStateResult } from './useDashboardState';
import { createDesktopSettingsReturnTarget } from './desktopSettingsNavigation';

/**
 * Bezpečný identifikátor profilu pre URL `/dashboard/users/{identifier}`.
 * Preferuje slug, potom číselné id; ak `user` chýba, vráti `'profile'` – tak
 * nikdy nevznikne URL s "undefined" (napr. keď sa profil otvorí skôr, než sa
 * `user` načíta).
 */
function profileIdentifier(user: User | null | undefined): string {
  return user?.slug || (user?.id != null ? String(user.id) : 'profile');
}

export interface DashboardNavigationProps {
  handleMainModuleChange: (moduleId: string) => void;
  handleEditProfileClick: () => void;
  handleViewUserSkillFromSearch: (userId: number, skillId: number, slug?: string | null) => void;
  handleViewUserProfileFromSearch: (userId: number, slug?: string | null, summary?: SearchUserResult) => void;
  handleSkillsClick: () => void;
  handleSkillsOfferClick: () => void;
  handleSkillsSearchClick: () => void;
  handleSidebarSearchClick: () => void;
  handleSearchClose: () => void;
  handleMobileProfileClick: () => void;
  handleSidebarLanguageClick: () => void;
  handleSidebarAccountTypeClick: () => void;
  handleSidebarAccountSettingsClick: () => void;
  handleSidebarPrivacyClick: () => void;
  handleRightSidebarClose: () => void;
}

interface UseDashboardNavigationParams {
  user: User | null;
  dashboardState: UseDashboardStateResult;
  setIsSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setViewedUserId: (userId: number | null) => void;
  setViewedUserSlug: (slug: string | null) => void;
  setViewedUserSummary: (summary: SearchUserResult | null) => void;
  setHighlightedSkillId: (skillId: number | null) => void;
  highlightTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

/**
 * Custom hook pre navigačnú logiku Dashboard komponenta
 */
export function useDashboardNavigation({
  user,
  dashboardState,
  setIsSearchOpen,
  setViewedUserId,
  setViewedUserSlug,
  setViewedUserSummary,
  setHighlightedSkillId,
  highlightTimeoutRef,
}: UseDashboardNavigationParams): DashboardNavigationProps {
  const router = useRouter();
  
  const {
    activeModule,
    activeRightItem,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    openOwnProfileEdit,
    openDesktopSettings,
    closeOwnProfileEdit,
    handleModuleChange,
    setIsMobileMenuOpen,
  } = dashboardState;

  // Hlavná navigačná logika pre zmenu modulov
  const handleMainModuleChange = useCallback((moduleId: string) => {
    // Pri zmene modulu zrušiť zvýraznenie karty
    setHighlightedSkillId(null);
    
    // Vyčistiť sessionStorage a timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('highlightedSkillId');
        sessionStorage.removeItem('highlightedSkillTime');
      }
    } catch {
      // ignore
    }

    // Pri prepnutí hlavného modulu zatvor vyhľadávací panel
    setIsSearchOpen(false);

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (moduleId === 'settings' && isDesktop) {
      const currentUrl =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : '/dashboard';
      openDesktopSettings(
        createDesktopSettingsReturnTarget(activeModule, currentUrl),
      );
      return;
    }

    if (moduleId === 'statistics') {
      setActiveModule('statistics');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      try {
        localStorage.setItem('activeModule', 'statistics');
      } catch {
        // UI state is already synchronized; ignore storage failures.
      }
      if (isDesktop) {
        router.push('/dashboard/statistics');
      } else if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/dashboard/statistics');
      }
      return;
    }

    if (moduleId === 'profile' && activeModule === 'statistics' && !isDesktop) {
      setActiveModule('profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      try {
        localStorage.setItem('activeModule', 'profile');
      } catch {
        // UI state is already synchronized; ignore storage failures.
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/dashboard/users/${profileIdentifier(user)}`);
      }
      return;
    }

    // Synchronizuj URL s hlavnými sekciami dashboardu - použijeme window.history.pushState bez reloadu
    let url = '/dashboard';
    if (moduleId === 'search') {
      url = '/dashboard/search';
    } else if (moduleId === 'settings') {
      url = '/dashboard/settings';
    } else if (moduleId === 'notifications') {
      url = '/dashboard/notifications';
    } else if (moduleId === 'notification-settings') {
      url = '/dashboard/settings/notifications';
    } else if (moduleId === 'account-settings') {
      url = '/dashboard/settings/account';
    } else if (moduleId === 'blocked-users') {
      url = '/dashboard/settings/blocked';
    } else if (moduleId === 'language') {
      url = '/dashboard/language';
    } else if (moduleId === 'account-type') {
      url = '/dashboard/account-type';
    } else if (moduleId === 'privacy') {
      url = '/dashboard/privacy';
    } else if (moduleId === 'profile') {
      url = `/dashboard/users/${profileIdentifier(user)}`;
    } else if (moduleId === 'favorites') {
      url = '/dashboard/favorites';
    } else if (moduleId === 'messages') {
      url = '/dashboard/messages';
    } else if (moduleId === 'requests') {
      url = '/dashboard/requests';
    } else if (moduleId === 'skills-offer') {
      url = '/dashboard/skills/offer';
    } else if (moduleId === 'skills-search') {
      url = '/dashboard/skills/search';
    }

    if (typeof window !== 'undefined') {
      // Najprv zmeň URL v browseri (to funguje vždy)
      window.history.pushState(null, '', url);
    }

    handleModuleChange(moduleId);
  }, [
    user,
    setHighlightedSkillId,
    highlightTimeoutRef,
    setIsSearchOpen,
    handleModuleChange,
    activeModule,
    openDesktopSettings,
    router,
    setActiveModule,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsRightSidebarOpen,
  ]);

  // Edit profile navigácia
  const handleEditProfileClick = useCallback(() => {
    // Nastaviť edit mód priamo (bez toggle) - otvoriť sidebar a nastaviť edit-profile
    openOwnProfileEdit();

    // Zmeniť URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
  }, [openOwnProfileEdit]);

  // Navigácia na profil používateľa s konkrétnou kartou na zvýraznenie
  const handleViewUserSkillFromSearch = useCallback((
    userId: number,
    skillId: number,
    slug?: string | null,
  ) => {
    setViewedUserId(userId);
    setViewedUserSlug(slug ?? null);
    setViewedUserSummary(null);
    // setHighlightedSkillId(skillId) - neriešime priamo, rieši to URL parameter
    setActiveModule('user-profile');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsSearchOpen(false); // Zatvoriť search panel
    
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'user-profile');
      }
    } catch {
      // ignore
    }

    // Použiť slug ak existuje, inak userId
    const identifier = slug || String(userId);
    const url = `/dashboard/users/${identifier}?highlight=${skillId}`;
    
    // Aktualizovať URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', url);
    }
  }, [
    setViewedUserId,
    setViewedUserSlug,
    setViewedUserSummary,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsSearchOpen
  ]);

  // Navigácia na cudzí profil používateľa
  const handleViewUserProfileFromSearch = useCallback((
    userId: number,
    slug?: string | null,
    summary?: SearchUserResult
  ) => {
    // Invalidovať cache ponúk pre cudzí profil, aby sa načítali čerstvé dáta (vrátane filtrovania skrytých kariet)
    if (userId !== user?.id) {
      import('../modules/profile/profileOffersCache').then(({ invalidateOffersCache }) => {
        invalidateOffersCache(userId);
      });
    }

    setViewedUserId(userId);
    setViewedUserSlug(slug ?? null);
    setViewedUserSummary(summary ?? null);
    setActiveModule('user-profile');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsSearchOpen(false); // Zatvoriť search panel
    
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'user-profile');
      }
    } catch {
      // ignore
    }

    // Použiť slug ak existuje, inak userId
    const identifier = slug || String(userId);
    const url = `/dashboard/users/${identifier}`;

    // router.push na slug URL remountuje Dashboard (users/[userId]/page.tsx), pričom
    // sa stratí už známe `userId` z výsledku vyhľadávania. Naprimujeme slug -> id
    // mapovanie, aby `resolveViewedUserBySlug` po remounte vyriešil profil z cache
    // bez zbytočného `userProfileBySlug` API round-tripu.
    primeUserSlugId(slug ?? null, userId);

    router.push(url);
  }, [
    user?.id,
    setViewedUserId,
    setViewedUserSlug,
    setViewedUserSummary,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsSearchOpen,
    router
  ]);

  // Skills navigation handlers
  const handleSkillsClick = useCallback(() => {
    handleMainModuleChange('skills');
  }, [handleMainModuleChange]);

  const handleSkillsOfferClick = useCallback(() => {
    handleMainModuleChange('skills-offer');
  }, [handleMainModuleChange]);

  const handleSkillsSearchClick = useCallback(() => {
    handleMainModuleChange('skills-search');
  }, [handleMainModuleChange]);

  // Search sidebar handlers
  const handleSidebarSearchClick = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
  }, [setIsSearchOpen]);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
  }, [setIsSearchOpen]);

  // Mobile and sidebar handlers
  const handleMobileProfileClick = useCallback(() => {
    if (!user) return;
    setActiveModule('profile');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsMobileMenuOpen(false);
    
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'profile');
      }
    } catch {
      // ignore
    }

    const url = `/dashboard/users/${profileIdentifier(user)}`;

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', url);
    }
  }, [user, setActiveModule, setIsRightSidebarOpen, setActiveRightItem, setIsMobileMenuOpen]);

  const handleSidebarLanguageClick = useCallback(() => {
    setActiveModule('profile');
    setIsRightSidebarOpen(true);
    setActiveRightItem('language');
  }, [setActiveModule, setIsRightSidebarOpen, setActiveRightItem]);

  const handleSidebarAccountTypeClick = useCallback(() => {
    setActiveModule('profile');
    setIsRightSidebarOpen(true);
    setActiveRightItem('account-type');
  }, [setActiveModule, setIsRightSidebarOpen, setActiveRightItem]);

  const handleSidebarAccountSettingsClick = useCallback(() => {
    setActiveModule('profile');
    setIsRightSidebarOpen(true);
    setActiveRightItem('account-settings');
  }, [setActiveModule, setIsRightSidebarOpen, setActiveRightItem]);

  const handleSidebarPrivacyClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setActiveModule('privacy');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      try {
        localStorage.setItem('activeModule', 'privacy');
      } catch {
        // ignore
      }
    } else {
      setActiveModule('profile');
      setIsRightSidebarOpen(true);
      setActiveRightItem('privacy');
    }
  }, [setActiveModule, setIsRightSidebarOpen, setActiveRightItem]);

  const handleRightSidebarClose = useCallback(() => {
    if (
      (activeModule === 'profile' || activeModule === 'settings') &&
      activeRightItem === 'edit-profile'
    ) {
      closeOwnProfileEdit();
      return;
    }
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
  }, [activeModule, activeRightItem, closeOwnProfileEdit, setIsRightSidebarOpen, setActiveRightItem]);

  return {
    handleMainModuleChange,
    handleEditProfileClick,
    handleViewUserSkillFromSearch,
    handleViewUserProfileFromSearch,
    handleSkillsClick,
    handleSkillsOfferClick,
    handleSkillsSearchClick,
    handleSidebarSearchClick,
    handleSearchClose,
    handleMobileProfileClick,
    handleSidebarLanguageClick,
    handleSidebarAccountTypeClick,
    handleSidebarAccountSettingsClick,
    handleSidebarPrivacyClick,
    handleRightSidebarClose,
  };
}

"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type User } from '@/types';
import { type SearchUserResult } from '../modules/search/types';
import { primeUserSlugId } from '../modules/profile/profileUserCache';
import { preloadProfileAvatar } from '../modules/profile/preloadAvatar';
import { type UseDashboardStateResult } from './useDashboardState';
import {
  createDesktopSettingsReturnTarget,
  withDesktopSettingsOriginHistory,
} from './desktopSettingsNavigation';
import { useDesktopSettingsOriginRestore } from './useDesktopSettingsOriginRestore';
import { useSkillsRouteSynchronization } from './useSkillsRouteSynchronization';
import { currentBrowserUrl } from '@/utils/currentBrowserUrl';
import { clearFeedReturn } from '../modules/feed/feedReturnState';
import { markProfileFreshEntry } from '../modules/profile/profileFreshEntry';
import { withProfileOriginEntry } from '../modules/profile/profileOriginHistory';
import {
  dashboardProfilePath,
  dashboardSectionPath,
} from '../components/dashboardRoutes';

/**
 * Identifikátor profilu pre URL `/dashboard/users/{identifier}`.
 * Preferuje slug, potom číselné id. Ak `user` chýba (alebo nemá ani slug, ani
 * použiteľné id), vráti `null` – volajúci má vtedy navigáciu ODLOŽIŤ (nič
 * neposielať), kým dáta nie sú k dispozícii. Zámerne NEvraciame sentinel ako
 * `'profile'`, ktorý by len vytvoril inú nefunkčnú URL.
 */
export function profileIdentifier(user: User | null | undefined): string | null {
  if (user?.slug) return user.slug;
  if (user?.id != null) return String(user.id);
  return null;
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

  useDesktopSettingsOriginRestore({
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsSearchOpen,
  });

  useSkillsRouteSynchronization({
    onModuleChange: handleModuleChange,
    setIsSearchOpen,
    setViewedUserId,
    setViewedUserSlug,
    setViewedUserSummary,
  });

  // Hlavná navigačná logika pre zmenu modulov
  const handleMainModuleChange = useCallback((moduleId: string) => {
    // Odchod do INEJ sekcie zahodí návratovú snímku Nástenky.
    //
    // Snímka patrí VÝHRADNE návratu z profilu, ponuky/dopytu alebo portfólia
    // otvoreného z Nástenky. Bez tohto by prežila aj odbočku do Štatistík či
    // Správ a pri ďalšom otvorení Nástenky by obnovila starú pozíciu aj starý
    // zoznam – používateľ by dostal feed, ktorý si nevypýtal.
    //
    // Prepnutie na `profile` bez platného identifikátora sa NEUSKUTOČNÍ
    // (vetvy nižšie sa vrátia bez zmeny), takže by sa snímka zahodila za nič.
    const changesModule =
      moduleId !== 'home' &&
      (moduleId !== 'profile' || profileIdentifier(user) != null);
    if (changesModule) clearFeedReturn();

    // „Profil" v navigácii je nový vstup do vlastného profilu – od vrchu, na
    // Ponukách. Len keď sa prepnutie naozaj uskutoční (vetvy nižšie sa bez
    // identifikátora vrátia).
    if (moduleId === 'profile' && profileIdentifier(user) != null) {
      markProfileFreshEntry({ id: user?.id, slug: user?.slug });
    }

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
      const currentUrl = currentBrowserUrl('/dashboard');
      const returnTarget = createDesktopSettingsReturnTarget(activeModule, currentUrl);
      if (returnTarget && typeof window !== 'undefined') {
        window.history.replaceState(
          withDesktopSettingsOriginHistory(window.history.state, returnTarget),
          '',
          returnTarget.url,
        );
      }
      openDesktopSettings(returnTarget);
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
      const statisticsPath = dashboardSectionPath('statistics');
      if (statisticsPath) {
        if (isDesktop) {
          router.push(statisticsPath);
        } else if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', statisticsPath);
        }
      }
      return;
    }

    if (moduleId === 'profile' && activeModule === 'statistics' && !isDesktop) {
      const identifier = profileIdentifier(user);
      // Bez platného slug/id nemáme kam navigovať → odlož (nič nemeníme).
      if (identifier == null) return;
      setActiveModule('profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      try {
        localStorage.setItem('activeModule', 'profile');
      } catch {
        // UI state is already synchronized; ignore storage failures.
      }
      const profilePath = dashboardProfilePath(identifier);
      if (typeof window !== 'undefined' && profilePath) {
        window.history.replaceState(null, '', profilePath);
      }
      return;
    }

    // Synchronizuj URL s hlavnými sekciami dashboardu - použijeme window.history.pushState bez reloadu
    //
    // Adresa sa skladá z `DASHBOARD_ROUTES` – z toho istého zoznamu, podľa
    // ktorého sa adresa pri kroku späť aj číta. Vlastný reťazec `if/else` sa
    // od stránok postupne rozišiel a modul, ktorý v ňom chýbal, skončil na
    // `/dashboard`. Sekcia, ktorú tabuľka nepozná, si adresu nevymýšľa:
    // ostáva `/dashboard` presne ako doteraz.
    let url = '/dashboard';
    if (moduleId === 'profile') {
      const identifier = profileIdentifier(user);
      // Bez platného slug/id nemáme kam navigovať → odlož navigáciu.
      if (identifier == null) return;
      url = dashboardProfilePath(identifier) ?? url;
    } else {
      url = dashboardSectionPath(moduleId) ?? url;
    }

    if (typeof window !== 'undefined') {
      // Vstup do vlastného profilu si značí pôvod, aby appková šípka vedela
      // opustiť profil celý – tam, kde sa značí aj nový vstup (vyššie).
      const historyState = moduleId === 'profile' ? withProfileOriginEntry(null) : null;
      // Najprv zmeň URL v browseri (to funguje vždy)
      window.history.pushState(historyState, '', url);
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
    // Cesta z tabuľky, zvýraznenie je query tej istej stránky.
    const profilePath = dashboardProfilePath(identifier);

    // Aktualizovať URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
    if (typeof window !== 'undefined' && profilePath) {
      window.history.pushState(null, '', `${profilePath}?highlight=${skillId}`);
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
    preloadProfileAvatar(summary?.avatar_url);

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
    const identifier = profileIdentifier(user);
    // Bez platného slug/id nemáme kam navigovať → odlož (nič nemeníme).
    if (identifier == null) return;
    // Vlastný profil z mobilnej lišty je tiež „iná sekcia" – nejde sa oň
    // z Nástenky preklikom, takže návratová snímka tu neplatí.
    clearFeedReturn();
    markProfileFreshEntry({ id: user.id, slug: user.slug });
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

    const url = `/dashboard/users/${identifier}`;

    if (typeof window !== 'undefined') {
      window.history.pushState(withProfileOriginEntry(null), '', url);
    }
  }, [user, setActiveModule, setIsRightSidebarOpen, setActiveRightItem, setIsMobileMenuOpen]);

  /**
   * Sekcia Nastavení zo zoznamu.
   *
   * Na mobile je sekcia samostatná obrazovka, takže ide bežnou navigáciou –
   * dostane vlastnú adresu aj vlastný záznam histórie a krok späť ju vráti na
   * zoznam. Predtým sa nastavil len stav (pravá položka nad profilom), adresa
   * sa nemenila vôbec a návrat musel riešiť ručný handler pre každú sekciu
   * zvlášť – Jazyk ho nemal a šípka mu chýbala celkom.
   *
   * Na desktope ostáva sekcia pravou položkou vedľa zoznamu, ako doteraz.
   */
  const openSettingsSection = useCallback(
    (moduleId: string, rightItem: string) => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      if (isMobile) {
        handleMainModuleChange(moduleId);
        return;
      }
      setActiveModule('profile');
      setIsRightSidebarOpen(true);
      setActiveRightItem(rightItem);
    },
    [handleMainModuleChange, setActiveModule, setIsRightSidebarOpen, setActiveRightItem],
  );

  const handleSidebarLanguageClick = useCallback(
    () => openSettingsSection('language', 'language'),
    [openSettingsSection],
  );

  const handleSidebarAccountTypeClick = useCallback(
    () => openSettingsSection('account-type', 'account-type'),
    [openSettingsSection],
  );

  const handleSidebarAccountSettingsClick = useCallback(
    () => openSettingsSection('account-settings', 'account-settings'),
    [openSettingsSection],
  );

  const handleSidebarPrivacyClick = useCallback(
    () => openSettingsSection('privacy', 'privacy'),
    [openSettingsSection],
  );

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

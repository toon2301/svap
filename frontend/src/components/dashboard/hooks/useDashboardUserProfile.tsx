"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { type User } from '@/types';
import { type SearchUserResult } from '../modules/search/types';
import { api, endpoints } from '@/lib/api';
import {
  getUserIdBySlug,
  getUserProfileFromCache,
  setUserProfileToCache,
} from '../modules/profile/profileUserCache';
import { type UseDashboardStateResult } from './useDashboardState';

export interface DashboardUserProfileProps {
  viewedUserId: number | null;
  setViewedUserId: (userId: number | null) => void;
  viewedUserSlug: string | null;
  setViewedUserSlug: (slug: string | null) => void;
  viewedUserSummary: SearchUserResult | null;
  setViewedUserSummary: (summary: SearchUserResult | null) => void;
  viewedUserNotFound: boolean;
  initialRightItemAppliedRef: React.MutableRefObject<boolean>;
}

interface UseDashboardUserProfileParams {
  user: User | null;
  activeModule: string;
  dashboardState: UseDashboardStateResult;
  initialViewedUserId?: number | null;
  initialHighlightedSkillId?: number | null;
  initialProfileSlug?: string | null;
  initialRightItem?: string | null;
  setHighlightedSkillId: (skillId: number | null) => void;
}

/**
 * Custom hook pre user profile handling v Dashboard
 */
export function useDashboardUserProfile({
  user,
  activeModule,
  dashboardState,
  initialViewedUserId,
  initialHighlightedSkillId,
  initialProfileSlug,
  initialRightItem,
  setHighlightedSkillId,
}: UseDashboardUserProfileParams): DashboardUserProfileProps {
  const [viewedUserId, setViewedUserId] = useState<number | null>(null);
  const [viewedUserSlug, setViewedUserSlug] = useState<string | null>(null);
  const [viewedUserSummary, setViewedUserSummary] = useState<SearchUserResult | null>(null);
  // True ak slug profil neexistuje (404 – napr. zmazaný/anonymizovaný účet).
  const [viewedUserNotFound, setViewedUserNotFound] = useState(false);
  const initialRightItemAppliedRef = useRef(false);

  const {
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    isRightSidebarOpen,
    activeRightItem,
  } = dashboardState;

  // Centralizovaný profil-fetch s konzistentným 404 handlingom: nech profil
  // načíta ktorákoľvek cesta (slug aj ID), pri 404 sa vždy nastaví
  // `viewedUserNotFound` (UI ukáže chybu namiesto nekonečného "Načítavam...").
  const fetchProfileWithNotFound = useCallback(
    async (url: string, isCancelled: () => boolean): Promise<User | null> => {
      try {
        const { data } = await api.get<User>(url);
        return isCancelled() ? null : data;
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (!isCancelled() && status === 404) {
          setViewedUserNotFound(true);
        }
        return null;
      }
    },
    [],
  );

  // Zdieľané rozlíšenie slug -> viewedUserId: najprv cache, inak API (+ zápis do cache).
  // Vracia cleanup, ktorý zruší prebiehajúci fetch (ochrana proti stale/po-unmount zápisu).
  // Používajú ho oba efekty nižšie (mount-time podľa `initialProfileSlug` aj state-driven
  // podľa `viewedUserSlug`), aby bola logika a 404/cancellation handling na jednom mieste.
  const resolveViewedUserBySlug = useCallback(
    (slug: string): (() => void) | undefined => {
      const cachedId = getUserIdBySlug(slug);
      if (cachedId) {
        setViewedUserId(cachedId);
        return undefined;
      }

      let cancelled = false;
      void (async () => {
        const data = await fetchProfileWithNotFound(
          endpoints.dashboard.userProfileBySlug(slug),
          () => cancelled,
        );
        if (!data) return; // 404 (not-found nastavený v helperi) alebo zrušené
        setViewedUserId(data.id);
        setUserProfileToCache(data.id, data);
      })();

      return () => {
        cancelled = true;
      };
    },
    [fetchProfileWithNotFound],
  );

  // Inicializácia profilu podľa slug alebo ID
  useEffect(() => {
    // Nová navigácia → vyresetuj "not found" stav.
    setViewedUserNotFound(false);
    // Priorita: ak máme initialViewedUserId, použiť ho
    if (initialViewedUserId) {
      setViewedUserId(initialViewedUserId);
      if (initialHighlightedSkillId != null) {
        setHighlightedSkillId(initialHighlightedSkillId);
      }
      return;
    }

    if (!initialProfileSlug) return;

    setViewedUserSlug(initialProfileSlug);

    // Slug -> id (cache, inak API); helper vracia cleanup prebiehajúceho fetchu.
    return resolveViewedUserBySlug(initialProfileSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProfileSlug, initialViewedUserId, initialHighlightedSkillId, setHighlightedSkillId]);

  // Rozlíšenie slug -> id aj pri state-driven navigácii (popstate, návrat z portfolia,
  // notifikácie), nie len pri mount cez `initialProfileSlug`. Bez tohto ostane ModuleRouter
  // trvalo na "Načítavam profil...", pretože `viewedUserId` je null a nič ho nedoplní:
  // canonická URL vlastného profilu `/dashboard/users/[slug]` sa cez popstate vyhodnotí
  // ako `user-profile` len so slugom (viewedUserSlug set, viewedUserId null). Tento efekt
  // garantuje ukončenie loading stavu – buď doplní id, alebo (pri 404) nastaví not-found.
  useEffect(() => {
    if (activeModule !== 'user-profile') return;
    // `viewedUserNotFound` zámerne NIE je v guarde ani v deps: stale not-found z
    // predošlého profilu (napr. 404) nesmie zablokovať načítanie ĎALŠIEHO profilu pri
    // popstate. Keďže nie je v deps, po 404 sa efekt pre ten istý slug znovu nespustí
    // (žiadny refetch-loop) – znovu zbehne až pri skutočnej zmene slugu/id.
    if (viewedUserId || !viewedUserSlug) return;

    // Vlastný profil zobrazujeme cez plnohodnotný `profile` modul (edit, atď.) –
    // rovnako ako mount-time konverzia nižšie.
    if (user?.slug && user.slug === viewedUserSlug) {
      setActiveModule('profile');
      return;
    }

    // Nový slug → vyresetuj prípadný stale not-found z predošlého profilu, nech nový
    // profil nezostane omylom na "not found". 404 pre tento slug ho nastaví znovu.
    setViewedUserNotFound(false);

    // Slug -> id (cache, inak API); helper vracia cleanup prebiehajúceho fetchu.
    return resolveViewedUserBySlug(viewedUserSlug);
  }, [
    activeModule,
    viewedUserId,
    viewedUserSlug,
    user?.slug,
    setActiveModule,
    resolveViewedUserBySlug,
  ]);

  // Vlastny slug prepina na ProfileModule iba pre bezny profil route.
  // Portfolio detail/create si musia zachovat vlastny aktivny modul aj po reloade.
  useEffect(() => {
    if (!user || !initialProfileSlug) return;
    if (activeModule !== 'user-profile') return;
    // `initialProfileSlug` je zamrznuty Next.js params prop – pri pushState navigacii
    // (klik na ponuku/cudzi profil) sa NEaktualizuje a pri router.push zaostava za
    // synchronnym `setActiveModule('user-profile')`. Bez tohto guardu by prepnutie na
    // vlastny profil vyskocilo aj ked uz interaktivne prezerame INEHO pouzivatela.
    // Prepiname preto len ked skutocne zobrazujeme vlastny profil: `viewedUserId` je
    // este nevyriesene (null) alebo sa rovna vlastnemu id.
    const viewingSelf = viewedUserId === null || viewedUserId === user.id;
    if (viewingSelf && user.slug && user.slug === initialProfileSlug) {
      setActiveModule('profile');
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeModule', 'profile');
        }
      } catch {
        // ignore
      }
    }
  }, [activeModule, user, initialProfileSlug, viewedUserId, setActiveModule]);

  // Aplikuj počiatočný stav pravého sidebaru pre vlastný profil na základe URL (edit, account, privacy, language)
  useEffect(() => {
    if (!user || !initialProfileSlug || !initialRightItem || initialRightItemAppliedRef.current) {
      return;
    }

    if (user.slug && user.slug === initialProfileSlug) {
      initialRightItemAppliedRef.current = true;

      if (initialRightItem === 'edit-profile') {
        // Zodpovedá handleRightSidebarToggle() pri zapnutí edit módu
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('edit-profile');
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('activeModule', 'profile');
          }
        } catch {
          // ignore
        }
      } else if (initialRightItem === 'account-type') {
        // Zodpovedá handleSidebarAccountTypeClick()
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('account-type');
      } else if (initialRightItem === 'privacy') {
        // Zodpovedá handleSidebarPrivacyClick()
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
      } else if (initialRightItem === 'language') {
        // Zodpovedá handleSidebarLanguageClick()
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('language');
      }
    }
  }, [
    user, 
    initialProfileSlug, 
    initialRightItem, 
    setActiveModule, 
    setIsRightSidebarOpen, 
    setActiveRightItem
  ]);

  // Aktualizácia URL na slug pre vlastný profil
  useEffect(() => {
    // Len ak sme na vlastnom profile a máme slug
    if (!user?.slug || activeModule !== 'profile' || !user?.id) return;

    // Skontrolovať, či sme na vlastnom profile (nie na cudzom)
    // Ak je viewedUserId nastavený a je iný ako user.id, sme na cudzom profile
    if (viewedUserId && viewedUserId !== user.id) return;

    // Skontrolovať, či sme v edit móde
    const isEditMode = isRightSidebarOpen && activeRightItem === 'edit-profile';
    
    // Zistiť aktuálnu URL
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const expectedPath = `/dashboard/users/${user.slug}`;
    const expectedPathWithEdit = `/dashboard/users/${user.slug}/edit`;

    // Ak sme v edit móde, očakávaná URL by mala obsahovať /edit
    const expectedPathForCurrentMode = isEditMode ? expectedPathWithEdit : expectedPath;

    // Ak sme na správnej URL, nič nerobiť
    if (currentPath === expectedPathForCurrentMode) {
      return;
    }

    // Aktualizovať URL bez reloadu - window.history.replaceState mení URL bez prerenderovania stránky
    if (currentPath.startsWith('/dashboard/users/')) {
      const currentIdentifier = currentPath.replace('/dashboard/users/', '').split('/')[0];
      const isCurrentPathEdit = currentPath.endsWith('/edit');
      
      // Kontrola, či URL obsahuje /edit - ak áno a je to vlastný profil, nastaviť edit mode
      if (isCurrentPathEdit && currentIdentifier === user.slug) {
        // URL obsahuje /edit - nastaviť edit mode (ak ešte nie je nastavený)
        if (!isEditMode) {
          setActiveModule('profile');
          setIsRightSidebarOpen(true);
          setActiveRightItem('edit-profile');
        }
        // Zachovať URL s /edit - nemeníme ju
        return;
      }
      
      // Ak sme v edit móde a slug sa zmenil, aktualizovať URL s novým slugom a zachovať /edit
      if (isEditMode && currentIdentifier !== user.slug) {
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', expectedPathWithEdit);
        }
        return;
      }
      
      // Ak je aktuálny identifikátor číslo (ID) a máme slug
      if (/^\d+$/.test(currentIdentifier) && currentIdentifier !== user.slug) {
        const newUrl = isEditMode ? expectedPathWithEdit : expectedPath;
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', newUrl);
        }
      } else if (currentIdentifier !== user.slug) {
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', expectedPathForCurrentMode);
        }
      }
    } else {
      // Sme mimo user profile URL štruktúry
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', expectedPathForCurrentMode);
      }
    }
  }, [
    user?.slug,
    user?.id,
    activeModule,
    viewedUserId,
    isRightSidebarOpen,
    activeRightItem,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
  ]);

  // Aktualizácia URL na slug, keď sa načíta profil cudzieho používateľa
  useEffect(() => {
    // Len ak sme na cudzom profile (nie na vlastnom)
    if (!viewedUserId || !user || viewedUserId === user.id) return;
    if (activeModule !== 'user-profile') return;

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const currentIdentifier = currentPath.startsWith('/dashboard/users/') 
      ? currentPath.replace('/dashboard/users/', '').split('/')[0] 
      : null;

    // Skús získať slug z cache alebo z viewedUserSummary
    let userSlug: string | null | undefined = viewedUserSlug;
    
    // Ak nemáme slug, skús ho získať z viewedUserSummary
    if (!userSlug && viewedUserSummary?.slug) {
      userSlug = viewedUserSummary.slug;
    }
    
    // Ak nemáme slug, skús ho získať z cache
    if (!userSlug) {
      const cachedUser = getUserProfileFromCache(viewedUserId);
      if (cachedUser?.slug) {
        userSlug = cachedUser.slug;
      }
    }
    
    // Pomocná funkcia na aktualizáciu URL so slugom
    const updateUrlWithSlug = (slug: string) => {
      if (typeof window === 'undefined') return;
      
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/dashboard/users/')) return;
      
      const currentIdentifier = currentPath.replace('/dashboard/users/', '').split('/')[0];
      
      // Ak je aktuálny identifikátor číslo (ID) a máme slug, aktualizovať URL
      if (/^\d+$/.test(currentIdentifier) && currentIdentifier !== slug) {
        let newUrl = `/dashboard/users/${slug}`;
        
        // Zachovať highlight parameter ak existuje
        if (window.location.search) {
          newUrl += window.location.search;
        }
        
        // Aktualizovať URL bez reloadu - window.history.replaceState je konzistentnejšie
        window.history.replaceState(null, '', newUrl);
        
        // Aktualizovať viewedUserSlug
        setViewedUserSlug(slug);
      }
    };

    // Ak máme slug a URL má ID namiesto slugu, aktualizovať URL
    if (userSlug) {
      updateUrlWithSlug(userSlug);
    } else {
      // Fallback: Ak nemáme slug, načítať profil z API
      // Len ak URL má ID (nie slug), načítať profil z API
      if (currentIdentifier && /^\d+$/.test(currentIdentifier)) {
        let cancelled = false;

        const loadProfileFromApi = async () => {
          const data = await fetchProfileWithNotFound(
            endpoints.dashboard.userProfile(viewedUserId),
            () => cancelled,
          );
          if (!data) return; // 404 (not-found nastavený v helperi) alebo zrušené

          // Uložiť do cache
          setUserProfileToCache(data.id, data);

          // Ak má používateľ slug, aktualizovať URL a viewedUserSlug
          if (data.slug) {
            setViewedUserSlug(data.slug);
            updateUrlWithSlug(data.slug);
          }
        };

        void loadProfileFromApi();

        return () => {
          cancelled = true;
        };
      }
    }
  }, [viewedUserId, user, activeModule, viewedUserSlug, viewedUserSummary, fetchProfileWithNotFound]);

  return {
    viewedUserId,
    setViewedUserId,
    viewedUserSlug,
    setViewedUserSlug,
    viewedUserSummary,
    setViewedUserSummary,
    viewedUserNotFound,
    initialRightItemAppliedRef,
  };
}

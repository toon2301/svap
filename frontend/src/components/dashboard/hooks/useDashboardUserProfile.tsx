"use client";

import { useEffect, useRef, useState } from 'react';
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
  const initialRightItemAppliedRef = useRef(false);

  const {
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    isRightSidebarOpen,
    activeRightItem,
  } = dashboardState;

  // Inicializácia profilu podľa slug alebo ID
  useEffect(() => {
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

    // 1) Skús mapovanie slug -> userId z cache
    const cachedId = getUserIdBySlug(initialProfileSlug);
    if (cachedId) {
      setViewedUserId(cachedId);
      const cachedUser = getUserProfileFromCache(cachedId);
      if (!cachedUser) {
        // profil sa pri ďalšej interakcii dotiahne cez existujúce fetchy
      }
      return;
    }

    // 2) Ak nemáme ID v cache, načítaj profil podľa slugu (vyžaduje slug endpoint na backende)
    let cancelled = false;

    const loadBySlug = async () => {
      try {
        const { data } = await api.get<User>(
          endpoints.dashboard.userProfileBySlug(initialProfileSlug),
        );
        if (cancelled) return;

        setViewedUserId(data.id);
        setUserProfileToCache(data.id, data);
      } catch (error: any) {
        // Ak je 404, slug neexistuje (používateľ zmenil meno alebo slug sa nezmenil)
        // Tichá chyba - downstream komponenty zobrazia user-friendly hlášku
        if (error?.response?.status === 404) {
          // Slug neexistuje - môže to byť starý slug po zmene mena
          // Nezobrazovať chybu v konzole, len ticho ignorovať
          console.debug(`User with slug "${initialProfileSlug}" not found`);
        }
        // Iné chyby riešia downstream komponenty (napr. jemná hláška v UI)
      }
    };

    void loadBySlug();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProfileSlug, initialViewedUserId, initialHighlightedSkillId, setHighlightedSkillId]);

  // Ak aktuálny route slug patrí prihlásenému používateľovi, zobraz jeho profil (ProfileModule)
  useEffect(() => {
    if (!user || !initialProfileSlug) return;
    if (user.slug && user.slug === initialProfileSlug) {
      setActiveModule('profile');
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeModule', 'profile');
        }
      } catch {
        // ignore
      }
    }
  }, [user, initialProfileSlug, setActiveModule]);

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

    // Ak sme v edit móde, NEOBNOVOVAŤ URL - handleEditProfileClick už to urobil
    // Tento useEffect by sa nemal spúšťať v edit móde, pretože URL je už nastavený
    const isEditMode = isRightSidebarOpen && activeRightItem === 'edit-profile';
    if (isEditMode) {
      // V edit móde nič nerobiť - URL je už nastavený v handleEditProfileClick
      return;
    }
    
    // Zistiť aktuálnu URL
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const expectedPath = `/dashboard/users/${user.slug}`;

    // Ak sme na správnej URL, nič nerobiť
    if (currentPath === expectedPath) {
      return;
    }

    // Aktualizovať URL bez reloadu - window.history.replaceState mení URL bez prerenderovania stránky
    if (currentPath.startsWith('/dashboard/users/')) {
      const currentIdentifier = currentPath.replace('/dashboard/users/', '').split('/')[0];
      
      // Ak je aktuálny identifikátor číslo (ID) a máme slug
      if (/^\d+$/.test(currentIdentifier) && currentIdentifier !== user.slug) {
        const newUrl = `/dashboard/users/${user.slug}`;
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', newUrl);
        }
      } else if (currentIdentifier !== user.slug) {
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', expectedPath);
        }
      }
    } else {
      // Sme mimo user profile URL štruktúry
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', expectedPath);
      }
    }
  }, [user?.slug, user?.id, activeModule, viewedUserId, isRightSidebarOpen, activeRightItem]);

  // Aktualizácia URL na slug, keď sa načíta profil cudzieho používateľa
  useEffect(() => {
    // DIAGNOSTIKA: Začiatok useEffect
    console.log('[URL-SLUG-DEBUG] useEffect spustený', {
      viewedUserId,
      user: user?.id,
      activeModule,
      viewedUserSlug,
      viewedUserSummary: viewedUserSummary ? { id: viewedUserSummary.id, slug: viewedUserSummary.slug } : null,
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
    });

    // Len ak sme na cudzom profile (nie na vlastnom)
    if (!viewedUserId || !user || viewedUserId === user.id) {
      console.log('[URL-SLUG-DEBUG] Early return: nie sme na cudzom profile', {
        viewedUserId,
        user: user?.id,
        isOwnProfile: viewedUserId === user?.id,
      });
      return;
    }
    if (activeModule !== 'user-profile') {
      console.log('[URL-SLUG-DEBUG] Early return: activeModule nie je user-profile', { activeModule });
      return;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const currentIdentifier = currentPath.startsWith('/dashboard/users/') 
      ? currentPath.replace('/dashboard/users/', '').split('/')[0] 
      : null;

    console.log('[URL-SLUG-DEBUG] Kontrola URL', {
      currentPath,
      currentIdentifier,
      isNumeric: currentIdentifier ? /^\d+$/.test(currentIdentifier) : false,
    });

    // Skús získať slug z cache alebo z viewedUserSummary
    let userSlug: string | null | undefined = viewedUserSlug;
    let slugSource = 'viewedUserSlug';
    
    // Ak nemáme slug, skús ho získať z viewedUserSummary
    if (!userSlug && viewedUserSummary?.slug) {
      userSlug = viewedUserSummary.slug;
      slugSource = 'viewedUserSummary';
      console.log('[URL-SLUG-DEBUG] Slug získaný z viewedUserSummary', { userSlug });
    }
    
    // Ak nemáme slug, skús ho získať z cache
    if (!userSlug) {
      const cachedUser = getUserProfileFromCache(viewedUserId);
      if (cachedUser?.slug) {
        userSlug = cachedUser.slug;
        slugSource = 'cache';
        console.log('[URL-SLUG-DEBUG] Slug získaný z cache', { userSlug, cachedUserId: cachedUser.id });
      } else {
        console.log('[URL-SLUG-DEBUG] Slug NENÁJDENÝ v cache', { viewedUserId, cachedUser: cachedUser ? 'exists but no slug' : 'not found' });
      }
    }
    
    console.log('[URL-SLUG-DEBUG] Finálny stav pred aktualizáciou URL', {
      userSlug,
      slugSource,
      currentIdentifier,
      needsUpdate: userSlug && currentIdentifier && /^\d+$/.test(currentIdentifier) && currentIdentifier !== userSlug,
    });
    
    // Pomocná funkcia na aktualizáciu URL so slugom
    const updateUrlWithSlug = (slug: string, source: string) => {
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
        
        console.log('[URL-SLUG-DEBUG] ⚡ AKTUALIZUJEM URL', {
          from: currentPath + window.location.search,
          to: newUrl,
          slugSource: source,
          method: 'window.history.replaceState',
        });
        
        // Aktualizovať URL bez reloadu - window.history.replaceState je konzistentnejšie
        window.history.replaceState(null, '', newUrl);
        
        // Aktualizovať viewedUserSlug
        setViewedUserSlug(slug);
        
        // Overenie po zmene
        setTimeout(() => {
          const afterPath = window.location.pathname;
          console.log('[URL-SLUG-DEBUG] ✅ URL po aktualizácii', {
            expected: newUrl,
            actual: afterPath + window.location.search,
            match: afterPath === `/dashboard/users/${slug}`,
          });
        }, 100);
      } else {
        console.log('[URL-SLUG-DEBUG] URL už má slug alebo nie je číslo', {
          currentIdentifier,
          slug,
          isNumeric: currentIdentifier ? /^\d+$/.test(currentIdentifier) : false,
          isSame: currentIdentifier === slug,
        });
      }
    };

    // Ak máme slug a URL má ID namiesto slugu, aktualizovať URL
    if (userSlug) {
      updateUrlWithSlug(userSlug, slugSource);
    } else {
      // Fallback: Ak nemáme slug, načítať profil z API
      console.log('[URL-SLUG-DEBUG] ❌ NEMÁME SLUG - Načítavam profil z API', {
        viewedUserId,
        viewedUserSlug,
        viewedUserSummarySlug: viewedUserSummary?.slug,
        cacheCheck: getUserProfileFromCache(viewedUserId)?.slug || 'not in cache',
      });

      // Len ak URL má ID (nie slug), načítať profil z API
      if (currentIdentifier && /^\d+$/.test(currentIdentifier)) {
        let cancelled = false;

        const loadProfileFromApi = async () => {
          try {
            console.log('[URL-SLUG-DEBUG] 🔄 Načítavam profil z API', { userId: viewedUserId });
            const { data } = await api.get<User>(endpoints.dashboard.userProfile(viewedUserId));
            
            if (cancelled) return;

            console.log('[URL-SLUG-DEBUG] ✅ Profil načítaný z API', {
              userId: data.id,
              slug: data.slug,
              hasSlug: !!data.slug,
            });

            // Uložiť do cache
            setUserProfileToCache(data.id, data);

            // Ak má používateľ slug, aktualizovať URL a viewedUserSlug
            if (data.slug) {
              setViewedUserSlug(data.slug);
              updateUrlWithSlug(data.slug, 'API');
            } else {
              console.log('[URL-SLUG-DEBUG] ⚠️ Používateľ nemá slug v databáze', { userId: data.id });
            }
          } catch (error: any) {
            if (cancelled) return;
            
            // Ticho ignorovať chyby - downstream komponenty zobrazia user-friendly hlášku
            console.debug('[URL-SLUG-DEBUG] Chyba pri načítaní profilu z API', {
              userId: viewedUserId,
              error: error?.response?.status || error?.message,
            });
          }
        };

        void loadProfileFromApi();

        return () => {
          cancelled = true;
        };
      } else {
        console.log('[URL-SLUG-DEBUG] URL už má slug, nie je potrebné načítať profil z API', {
          currentIdentifier,
        });
      }
    }
  }, [viewedUserId, user, activeModule, viewedUserSlug, viewedUserSummary]);

  return {
    viewedUserId,
    setViewedUserId,
    viewedUserSlug,
    setViewedUserSlug,
    viewedUserSummary,
    setViewedUserSummary,
    initialRightItemAppliedRef,
  };
}

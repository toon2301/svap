'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../../../types';
import { clearAuthState } from '../../../utils/auth';
import { setUserProfileToCache } from '../modules/profile/profileUserCache';
import { invalidateSearchCacheForUser } from '../modules/SearchModule';
import { useAuth } from '@/contexts/AuthContext';

type AccountType = 'personal' | 'business';

const accountTypeFromUser = (u: User | null | undefined): AccountType =>
  u?.user_type === 'company' ? 'business' : 'personal';

const getInitialModule = (): string => {
  if (typeof window !== 'undefined') {
    if (sessionStorage.getItem('forceHome') === '1') return 'home';
    return localStorage.getItem('activeModule') || 'home';
  }
  return 'home';
};

export interface UseDashboardStateResult {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  activeModule: string;
  setActiveModule: React.Dispatch<React.SetStateAction<string>>;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeRightItem: string;
  setActiveRightItem: React.Dispatch<React.SetStateAction<string>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  accountType: AccountType;
  setAccountType: React.Dispatch<React.SetStateAction<AccountType>>;
  isAccountTypeModalOpen: boolean;
  setIsAccountTypeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPersonalAccountModalOpen: boolean;
  setIsPersonalAccountModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openOwnProfileEdit: () => void;
  closeOwnProfileEdit: (targetUser?: Pick<User, 'id' | 'slug'> | null) => void;
  handleModuleChange: (moduleId: string) => void;
  handleRightSidebarToggle: () => void;
  handleRightItemClick: (itemId: string) => void;
  handleUserUpdate: (updatedUserOrUpdater: User | ((prev: User | null) => User | null)) => void;
  handleLogout: () => Promise<void>;
  handleMobileBack: (isInSubcategories?: boolean) => void;
}

export function useDashboardState(initialUser?: User, initialModule?: string): UseDashboardStateResult {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, refreshUser: refreshAuthUser, logout: authLogout, updateUser: updateAuthUser } = useAuth();
  const [user, setUser] = useState<User | null>(initialUser || authUser || null);
  const userRef = useRef<User | null>(initialUser || authUser || null); // Ref pre sledovanie zmien slugu
  const isLoading = !initialUser && authLoading;
  
  // Inicializácia modulu - používame initialModule ak je poskytnutý (rovnaký pre SSR aj CSR)
  // Ak nie, použijeme 'home' (hydration fix)
  const [activeModule, setActiveModule] = useState<string>(initialModule || 'home');

  // Pri client-side navigácii (router.push / zmena URL bez full reloadu) môže rovnaká inštancia
  // Dashboardu dostať nové `initialModule`. Bez synchronizácie by UI ostalo na starom module.
  useEffect(() => {
    if (!initialModule) return;

    setActiveModule(initialModule);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', initialModule);
      }
    } catch {
      // ignore
    }
  }, [initialModule]);
  
  // Inicializácia sidebaru - ak initialModule je sidebar sekcia, otvor sidebar hneď
  const rightSidebarItems = ['notifications', 'language', 'account-type', 'privacy'];
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => {
    return initialModule ? rightSidebarItems.includes(initialModule) : false;
  });
  
  const [activeRightItem, setActiveRightItem] = useState(() => {
    return initialModule && rightSidebarItems.includes(initialModule) ? initialModule : 'edit-profile';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(() => accountTypeFromUser(initialUser || authUser || null));
  const [isAccountTypeModalOpen, setIsAccountTypeModalOpen] = useState(false);
  const [isPersonalAccountModalOpen, setIsPersonalAccountModalOpen] = useState(false);
  const getOwnProfileIdentifier = useCallback(
    (targetUser?: Pick<User, 'id' | 'slug'> | null) => {
      const slug = targetUser?.slug ?? userRef.current?.slug;
      if (slug) return slug;
      const id = targetUser?.id ?? userRef.current?.id;
      return id != null ? String(id) : null;
    },
    []
  );

  const openOwnProfileEdit = useCallback(() => {
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

    const identifier = getOwnProfileIdentifier();
    if (identifier && typeof window !== 'undefined') {
      window.history.pushState(null, '', `/dashboard/users/${identifier}/edit`);
    }
  }, [getOwnProfileIdentifier]);

  const closeOwnProfileEdit = useCallback(
    (targetUser?: Pick<User, 'id' | 'slug'> | null) => {
      setActiveModule('profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeModule', 'profile');
        }
      } catch {
        // ignore
      }

      const identifier = getOwnProfileIdentifier(targetUser);
      if (identifier && typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/dashboard/users/${identifier}`);
      }
    },
    [getOwnProfileIdentifier]
  );

  // Synchronizácia accountType s user.user_type z databázy
  useEffect(() => {
    if (user?.user_type) {
      const correctAccountType: AccountType = user.user_type === 'company' ? 'business' : 'personal';
      setAccountType((currentAccountType) => {
        // Aktualizovať accountType len ak sa líši od aktuálnej hodnoty
        if (currentAccountType !== correctAccountType) {
          return correctAccountType;
        }
        return currentAccountType;
      });
    }
  }, [user?.id, user?.user_type]);

  useEffect(() => {
    const goToProfileHandler = () => {
      setActiveModule('profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activeModule', 'profile');
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('goToProfile', goToProfileHandler as EventListener);
    return () => {
      window.removeEventListener('goToProfile', goToProfileHandler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || sessionStorage.getItem('forceHome') !== '1') return;

    setActiveModule('home');
    setIsRightSidebarOpen(false);
    try {
      localStorage.setItem('activeModule', 'home');
      sessionStorage.removeItem('forceHome');
    } catch {
      // ignore
    }
  }, []);

  // Dashboard state iba mirroruje AuthContext bootstrap; nesmie spúšťať vlastné
  // /auth/me refresh cykly pri každom novom mounte dashboard shellu.
  useEffect(() => {
    if (initialUser) {
      userRef.current = initialUser;
      setUser(initialUser);
      return;
    }

    // Kľúčové: nepresmerovať, kým AuthContext ešte len dokončuje bootstrap.
    if (authLoading) return;

    if (authUser) {
      userRef.current = authUser;
      setUser(authUser);
      return;
    }

    clearAuthState();
    router.push('/');
  }, [authUser, authLoading, initialUser, router]);

  const handleModuleChange = useCallback(
    (moduleId: string) => {
      const validModules = [
        'home',
        'profile',
        'user-profile',
        'search',
        'favorites',
        'settings',
        'create',
        'messages',
        'requests',
        'notifications',
        'language',
        'account-type',
        'skills',
        'skills-offer',
        'skills-search',
        'skills-select-category',
        'skills-describe',
        'skills-add-custom-category',
      ];
      if (!validModules.includes(moduleId)) return;
      setActiveModule(moduleId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activeModule', moduleId);
        } catch {
          // ignore
        }
      }
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
    },
    []
  );

  const handleRightSidebarToggle = useCallback(() => {
    const isClosingOwnEdit =
      activeModule === 'profile' && isRightSidebarOpen && activeRightItem === 'edit-profile';
    if (isClosingOwnEdit) {
      closeOwnProfileEdit();
      return;
    }

    if (!isRightSidebarOpen) {
      openOwnProfileEdit();
      return;
    }

    setIsRightSidebarOpen(false);
    setActiveRightItem('');
  }, [activeModule, activeRightItem, closeOwnProfileEdit, isRightSidebarOpen, openOwnProfileEdit]);

  const handleRightItemClick = useCallback(
    (itemId: string) => {
      setActiveRightItem(itemId);
      if (itemId === 'edit-profile') {
        openOwnProfileEdit();
        return;
        // Nastaviť edit mód - otvoriť sidebar a nastaviť edit-profile
        
        // Zmeniť URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
      } else if (itemId === 'notifications') {
        setActiveModule('notifications');
        const url = '/dashboard/notifications';
        if (typeof window !== 'undefined') {
          // Zmeň URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
          window.history.pushState(null, '', url);
          try {
            localStorage.setItem('activeModule', 'notifications');
          } catch {
            // ignore
          }
        }
      } else if (itemId === 'language') {
        setActiveModule('language');
        const url = '/dashboard/language';
        if (typeof window !== 'undefined') {
          // Zmeň URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
          window.history.pushState(null, '', url);
          try {
            localStorage.setItem('activeModule', 'language');
          } catch {
            // ignore
          }
        }
      } else if (itemId === 'account-type') {
        setActiveModule('account-type');
        const url = '/dashboard/account-type';
        if (typeof window !== 'undefined') {
          // Zmeň URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
          window.history.pushState(null, '', url);
          try {
            localStorage.setItem('activeModule', 'account-type');
          } catch {
            // ignore
          }
        }
      } else if (itemId === 'privacy') {
        setActiveModule('privacy');
        const url = '/dashboard/privacy';
        if (typeof window !== 'undefined') {
          // Zmeň URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
          window.history.pushState(null, '', url);
          try {
            localStorage.setItem('activeModule', 'privacy');
          } catch {
            // ignore
          }
        }
      }
    },
    [openOwnProfileEdit, user]
  );

  const handleUserUpdate = useCallback(
    (updatedUserOrUpdater: User | ((prev: User | null) => User | null)) => {
      const updatedUser =
        typeof updatedUserOrUpdater === 'function'
          ? updatedUserOrUpdater(userRef.current)
          : updatedUserOrUpdater;
      if (updatedUser == null) return;

      // Skontrolovať, či sa zmenil slug (porovnať so starým user objektom z ref)
      const oldUser = userRef.current;
      const slugChanged = oldUser && oldUser.slug !== updatedUser.slug;

      // Aktualizovať ref pred setUser, aby sme mali aktuálny stav
      userRef.current = updatedUser;
      setUser(updatedUser);
      updateAuthUser(updatedUser);
      // Refetch z /auth/me/, aby sme prepísali prípadné staré odpovede a mali čerstvé dáta po reload
      void refreshAuthUser({ force: true });
      
      // Aktualizovať cache s novým používateľom (vrátane nového slugu)
      if (updatedUser.id) {
        setUserProfileToCache(updatedUser.id, updatedUser);
        
        // Ak sa zmenil slug, invalidovať search cache, aby ostatní používatelia videli nový slug
        if (slugChanged) {
          invalidateSearchCacheForUser(updatedUser.id);
        }
      }
      
      // Zachovať aktuálny stav - ak sme už v edit móde, zostaneme v ňom
      setActiveModule((prevModule) => {
        const isPrivacy = prevModule === 'privacy';
        if (isPrivacy) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('activeModule', 'privacy');
            } catch {
              // ignore
            }
          }
          // Neotvárať sidebar v mobilnej verzii
          setIsRightSidebarOpen(false);
          return 'privacy';
        }
        
        // Ak už sme v profile móde, zachovať ho (vrátane edit módu)
        if (prevModule === 'profile') {
          // Necháme aktuálny stav - edit mód zostane otvorený
          return 'profile';
        }
        
        // Ak sme v inom móde, prepnúť na profile s edit módom
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('activeModule', 'profile');
          } catch {
            // ignore
          }
        }
        setIsRightSidebarOpen(true);
        return 'profile';
      });
      
      // Zachovať activeRightItem - ak už sme v edit móde, zostaneme v ňom
      setActiveRightItem((prev) => {
        // Ak už sme v edit-profile, zachovať to
        if (prev === 'edit-profile') {
          return prev;
        }
        // Ak sme v nastaveniach súkromia alebo iných, zachovať to
        if (prev === 'privacy' || prev === 'language' || prev === 'account-type' || prev === 'notifications') {
          return prev;
        }
        // Inak nastaviť edit-profile
        return prev;
      });
    },
    [updateAuthUser, refreshAuthUser]
  );

  const handleLogout = useCallback(async () => {
    try {
      authLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [authLogout]);

  const getDescribeMode = () => {
    if (typeof window === 'undefined') return null;
    const mode = localStorage.getItem('skillsDescribeMode');
    return mode === 'search' ? 'skills-search' : mode === 'offer' ? 'skills-offer' : null;
  };

  const handleMobileBack = useCallback((isInSubcategories: boolean = false) => {
    // Ak sme v edit profile móde, vráť sa na normálny profile view
    if (activeModule === 'profile' && activeRightItem === 'edit-profile') {
      closeOwnProfileEdit();
      return;
      // Aktualizovať URL - odstrániť /edit časť
    }

    // Ak sme na cudzom profile, vráť sa na predchádzajúcu stránku (Žiadosti, Vyhľadávanie, …)
    if (activeModule === 'user-profile') {
      router.back();
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      return;
    }

    const modeModule = getDescribeMode();
    if (activeModule === 'skills-describe') {
      const target = modeModule || 'skills-offer';
      setActiveModule(target);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activeModule', target);
        } catch {
          // ignore
        }
      }
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
    } else if (activeModule === 'skills-select-category') {
      // Ak je v podkategóriách, nepresmeruj - nechaj to na komponente SkillsCategoryScreen
      if (isInSubcategories) {
        return; // SkillsCategoryScreen si to vyrieši sám cez handleBack
      }
      // Ak nie je v podkategóriách, presmeruj podľa módu (default ponúkam)
      const target = modeModule || 'skills-offer';
      setActiveModule(target);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activeModule', target);
        } catch {
          // ignore
        }
      }
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
    } else if (activeModule === 'skills-offer' || activeModule === 'skills-search') {
      setActiveModule('skills');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activeModule', 'skills');
        } catch {
          // ignore
        }
      }
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
    } else if (activeModule === 'skills') {
      setActiveModule('profile');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activeModule', 'profile');
        } catch {
          // ignore
        }
      }
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
    } else if (activeModule === 'privacy') {
      setIsMobileMenuOpen(true);
      setActiveModule('');
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('activeModule');
        } catch {
          // ignore
        }
      }
    } else if (activeRightItem === 'language' || activeRightItem === 'account-type' || activeRightItem === 'privacy') {
      setIsMobileMenuOpen(true);
    } else if (activeModule === 'notifications') {
      setActiveModule('');
      setIsMobileMenuOpen(true);
    } else if (activeModule === 'offer-reviews') {
      // Vráť sa na predchádzajúcu stránku pomocou router.back()
      router.back();
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      return;
    }
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
  }, [activeModule, activeRightItem, closeOwnProfileEdit, router, user?.id, user?.slug]);

  return {
    user,
    setUser,
    isLoading,
    activeModule,
    setActiveModule,
    isRightSidebarOpen,
    setIsRightSidebarOpen,
    activeRightItem,
    setActiveRightItem,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    accountType,
    setAccountType,
    isAccountTypeModalOpen,
    setIsAccountTypeModalOpen,
    isPersonalAccountModalOpen,
    setIsPersonalAccountModalOpen,
    openOwnProfileEdit,
    closeOwnProfileEdit,
    handleModuleChange,
    handleRightSidebarToggle,
    handleRightItemClick,
    handleUserUpdate,
    handleLogout,
    handleMobileBack,
  };
}


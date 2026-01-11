'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import type { User } from '../../../types';
import { isAuthenticated, clearAuthTokens } from '../../../utils/auth';
import { api, endpoints } from '../../../lib/api';
import { setUserProfileToCache } from '../modules/profile/profileUserCache';
import { invalidateSearchCacheForUser } from '../modules/SearchModule';

type AccountType = 'personal' | 'business';

const getInitialAccountType = (): AccountType => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('accountType');
    if (saved === 'business' || saved === 'personal') {
      return saved;
    }
  }
  return 'personal';
};

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
  handleModuleChange: (moduleId: string) => void;
  handleRightSidebarToggle: () => void;
  handleRightItemClick: (itemId: string) => void;
  handleUserUpdate: (updatedUser: User) => void;
  handleLogout: () => Promise<void>;
  handleMobileBack: (isInSubcategories?: boolean) => void;
}

export function useDashboardState(initialUser?: User, initialModule?: string): UseDashboardStateResult {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const userRef = useRef<User | null>(initialUser || null); // Ref pre sledovanie zmien slugu
  const [isLoading, setIsLoading] = useState(!initialUser);
  const hasCheckedAuth = useRef(false);
  
  // Inicializácia modulu - používame initialModule ak je poskytnutý (rovnaký pre SSR aj CSR)
  // Ak nie, použijeme 'home' (hydration fix)
  const [activeModule, setActiveModule] = useState<string>(initialModule || 'home');
  
  // Inicializácia sidebaru - ak initialModule je sidebar sekcia, otvor sidebar hneď
  const rightSidebarItems = ['notifications', 'language', 'account-type', 'privacy'];
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => {
    return initialModule ? rightSidebarItems.includes(initialModule) : false;
  });
  
  const [activeRightItem, setActiveRightItem] = useState(() => {
    return initialModule && rightSidebarItems.includes(initialModule) ? initialModule : 'edit-profile';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(() => getInitialAccountType());
  const [isAccountTypeModalOpen, setIsAccountTypeModalOpen] = useState(false);
  const [isPersonalAccountModalOpen, setIsPersonalAccountModalOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('accountType', accountType);
      }
    } catch {
      // ignore
    }
  }, [accountType]);

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
    // Ak už bola auth kontrola vykonaná, nevykonávať znova
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const checkAuth = async () => {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }

      if (typeof window !== 'undefined' && sessionStorage.getItem('forceHome') === '1') {
        setActiveModule('home');
        setIsRightSidebarOpen(false);
        try {
          localStorage.setItem('activeModule', 'home');
          sessionStorage.removeItem('forceHome');
        } catch {
          // ignore
        }
      }

      if (!initialUser) {
        try {
          const response = await api.get(endpoints.auth.me);
          userRef.current = response.data;
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user data:', error);
          clearAuthTokens();
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Prázdny dependency array - auth kontrola sa vykoná len raz pri mounte

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
    setIsRightSidebarOpen((prev) => {
      const next = !prev;
      if (!next) {
        setActiveModule('profile');
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('activeModule', 'profile');
          } catch {
            // ignore
          }
        }
        setActiveRightItem('');
      } else {
        setActiveRightItem('edit-profile');
      }
      return next;
    });
  }, []);

  const handleRightItemClick = useCallback(
    (itemId: string) => {
      setActiveRightItem(itemId);
      if (itemId === 'notifications') {
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
    []
  );

  const handleUserUpdate = useCallback(
    (updatedUser: User) => {
      // Skontrolovať, či sa zmenil slug (porovnať so starým user objektom z ref)
      const oldUser = userRef.current;
      const slugChanged = oldUser && oldUser.slug !== updatedUser.slug;
      
      // Aktualizovať ref pred setUser, aby sme mali aktuálny stav
      userRef.current = updatedUser;
      setUser(updatedUser);
      
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
          return 'edit-profile';
        }
        // Ak sme v nastaveniach súkromia alebo iných, zachovať to
        if (prev === 'privacy' || prev === 'language' || prev === 'account-type' || prev === 'notifications') {
          return prev;
        }
        // Inak nastaviť edit-profile
        return 'edit-profile';
      });
    },
    []
  );

  const handleLogout = useCallback(async () => {
    try {
      await api.post(endpoints.auth.logout, {
        refresh: Cookies.get('refresh_token') ?? null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthTokens();
      router.push('/');
    }
  }, [router]);

  const getDescribeMode = () => {
    if (typeof window === 'undefined') return null;
    const mode = localStorage.getItem('skillsDescribeMode');
    return mode === 'search' ? 'skills-search' : mode === 'offer' ? 'skills-offer' : null;
  };

  const handleMobileBack = useCallback((isInSubcategories: boolean = false) => {
    // Ak sme na cudzom profile, vráť sa na vyhľadávanie
    if (activeModule === 'user-profile') {
      setActiveModule('search');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activeModule', 'search');
        } catch {
          // ignore
        }
      }
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
    }
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
  }, [activeModule, activeRightItem]);

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
    handleModuleChange,
    handleRightSidebarToggle,
    handleRightItemClick,
    handleUserUpdate,
    handleLogout,
    handleMobileBack,
  };
}


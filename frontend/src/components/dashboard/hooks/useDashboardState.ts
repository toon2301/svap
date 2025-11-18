'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import type { User } from '../../../types';
import { isAuthenticated, clearAuthTokens } from '../../../utils/auth';
import { api, endpoints } from '../../../lib/api';

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
  handleMobileBack: () => void;
}

export function useDashboardState(initialUser?: User): UseDashboardStateResult {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [activeModule, setActiveModule] = useState<string>(() => getInitialModule());
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [activeRightItem, setActiveRightItem] = useState('edit-profile');
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
  }, [router, initialUser]);

  const handleModuleChange = useCallback(
    (moduleId: string) => {
      const validModules = ['home', 'profile', 'search', 'favorites', 'settings', 'create', 'messages', 'notifications', 'language', 'account-type', 'skills', 'skills-offer', 'skills-search'];
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
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('activeModule', 'notifications');
          } catch {
            // ignore
          }
        }
      }
      if (itemId === 'language') {
        setActiveModule('language');
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('activeModule', 'language');
          } catch {
            // ignore
          }
        }
      }
      if (itemId === 'account-type') {
        setActiveModule('account-type');
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('activeModule', 'account-type');
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
      setUser(updatedUser);
      setActiveModule('profile');
      setIsRightSidebarOpen(true);
      setActiveRightItem('edit-profile');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activeModule', 'profile');
        } catch {
          // ignore
        }
      }
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

  const handleMobileBack = useCallback(() => {
    if (activeRightItem === 'language' || activeRightItem === 'account-type') {
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


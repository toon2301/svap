'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { clearAuthState } from '@/utils/auth';
import { fetchCsrfToken, hasCsrfToken } from '@/utils/csrf';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  avatar_url?: string;
  is_verified: boolean;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Auth stav určujeme výhradne cez `/api/auth/me/` (HttpOnly cookies).
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    try {
      if (!hasCsrfToken()) {
        await fetchCsrfToken();
      }
      const response = await api.post(endpoints.auth.login, { email, password });
      if (!(response?.status >= 200 && response?.status < 300)) {
        throw new Error('Prihlásenie zlyhalo');
      }
      // Overenie cez /me/ (cookie auth) – jediný zdroj pravdy pre auth stav
      await refreshUser();
      // Reset preferovaného modulu po prihlásení a nastav flag na vynútenie HOME
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'home');
        sessionStorage.setItem('forceHome', '1');
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      if (!hasCsrfToken()) {
        await fetchCsrfToken();
      }
      const response = await api.post(endpoints.auth.register, userData);
      if (!(response?.status >= 200 && response?.status < 300)) {
        throw new Error('Registrácia zlyhala');
      }

      // Po registrácii používateľ nie je prihlásený, musí overiť email
      router.push('/verify-email');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    // Vymazať posledné vyhľadávania aktuálneho používateľa
    if (user?.id) {
      localStorage.removeItem(`searchRecentResults_${user.id}`);
    }
    
    try {
      void api.post(endpoints.auth.logout, {});
    } catch {
      // ignore
    }
    localStorage.removeItem('activeModule');
    sessionStorage.removeItem('forceHome');
    clearAuthState();
    setUser(null);
    router.push('/');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  };

  const refreshUser = async () => {
    try {
      // Použi centrálne axios API s interceptormi (Authorization z cookies)
      const { api, endpoints } = await import('@/lib/api');
      const resp = await api.get(endpoints.auth.me);
      if (resp?.status === 200 && resp.data) {
        setUser(resp.data);
        return;
      }
      setUser(null);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, endpoints, setMayHaveRefreshCookie } from '@/lib/api';
import { clearAuthState } from '@/utils/auth';
import { fetchCsrfToken, hasCsrfToken } from '@/utils/csrf';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: (options?: { force?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Deterministic /me refresh:
  // - Each refreshUser call gets a requestId and sets latestRequestId.
  // - Only the latest request is allowed to update user state.
  // - Forced refresh aborts any previous pending request.
  const meAbortControllerRef = useRef<AbortController | null>(null);
  const mePromiseRef = useRef<Promise<void> | null>(null);
  const refreshSeqRef = useRef(0);
  const latestRequestIdRef = useRef(0);

  const refreshUser = useCallback(async (options?: { force?: boolean }) => {
    const force = Boolean(options?.force);

    const requestId = ++refreshSeqRef.current;
    latestRequestIdRef.current = requestId;

    // Abort previous pending /me request when forcing (and optionally when a new refresh becomes "latest").
    // This prevents wasted work and ensures older responses cannot arrive later and overwrite state.
    if (force && meAbortControllerRef.current) {
      try {
        meAbortControllerRef.current.abort();
      } catch {
        // ignore
      }
    } else if (!force && meAbortControllerRef.current && mePromiseRef.current) {
      // Coalesce concurrent refreshes into the newest one.
      try {
        meAbortControllerRef.current.abort();
      } catch {
        // ignore
      }
    }

    const controller = new AbortController();
    meAbortControllerRef.current = controller;

    const p: Promise<void> = (async () => {
      try {
        const resp = await api.get(endpoints.auth.me, { signal: controller.signal } as any);

        // Identity guard: ignore stale responses
        if (requestId !== latestRequestIdRef.current) return;

        if (resp?.status === 200 && resp.data) {
          setUser(resp.data);
          setMayHaveRefreshCookie(true);
          return;
        }

        setUser(null);
      } catch (error: any) {
        // Ignore stale errors
        if (requestId !== latestRequestIdRef.current) return;

        // Abort/cancel should be a no-op (a newer request is already in charge)
        if (
          error?.name === 'CanceledError' ||
          error?.code === 'ERR_CANCELED' ||
          error?.name === 'AbortError'
        ) {
          return;
        }

        const status = error?.response?.status;
        // Pri 401 iba nastav user=null (žiadne ďalšie refresh pokusy tu)
        if (status === 401) {
          setUser(null);
          setMayHaveRefreshCookie(false);
          return;
        }

        console.error('Error refreshing user:', error);
        setUser(null);
      } finally {
        // Clear refs only if this request is still the latest in charge.
        if (requestId === latestRequestIdRef.current) {
          mePromiseRef.current = null;
        }
        if (meAbortControllerRef.current === controller) meAbortControllerRef.current = null;
      }
    })();

    mePromiseRef.current = p;
    return p;
  }, []);

  // Cleanup: abort pending /me request on unmount
  useEffect(() => {
    return () => {
      try {
        meAbortControllerRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

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
      await refreshUser({ force: true });
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

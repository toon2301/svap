'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, endpoints, invalidateSession, isTransientAuthFailureError, setMayHaveRefreshCookie } from '@/lib/api';
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

type AuthBootstrapSnapshot = {
  initialized: boolean;
  user: User | null;
};

// Keep the resolved auth bootstrap in memory for the current browser runtime.
// This avoids repeating the dashboard loading flash when shared providers remount
// during internal App Router navigations.
const authBootstrapSnapshot: AuthBootstrapSnapshot = {
  initialized: false,
  user: null,
};

function syncAuthBootstrapSnapshot(user: User | null, initialized = true) {
  authBootstrapSnapshot.initialized = initialized;
  authBootstrapSnapshot.user = user;
}

export function __resetAuthBootstrapSnapshotForTests() {
  syncAuthBootstrapSnapshot(null, false);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() =>
    authBootstrapSnapshot.initialized ? authBootstrapSnapshot.user : null,
  );
  const [isLoading, setIsLoading] = useState(() => !authBootstrapSnapshot.initialized);
  const router = useRouter();
  const userRef = useRef<User | null>(authBootstrapSnapshot.initialized ? authBootstrapSnapshot.user : null);

  // Deterministic /me refresh:
  // - Each refreshUser call gets a requestId and sets latestRequestId.
  // - Only the latest request is allowed to update user state.
  // - Forced refresh aborts any previous pending request.
  const meAbortControllerRef = useRef<AbortController | null>(null);
  const mePromiseRef = useRef<Promise<void> | null>(null);
  const refreshSeqRef = useRef(0);
  const latestRequestIdRef = useRef(0);
  const logoutInProgressRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const applyResolvedUser = useCallback((nextUser: User | null) => {
    userRef.current = nextUser;
    setUser(nextUser);
    syncAuthBootstrapSnapshot(nextUser, true);
  }, []);

  const refreshUser = useCallback(async (options?: { force?: boolean }) => {
    // Explicit logout in progress => do not run /me requests.
    if (logoutInProgressRef.current) return;
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
        if (logoutInProgressRef.current) return;

        if (resp?.status === 200 && resp.data) {
          applyResolvedUser(resp.data);
          setMayHaveRefreshCookie(true);
          return;
        }

        applyResolvedUser(null);
      } catch (error: any) {
        // Ignore stale errors
        if (requestId !== latestRequestIdRef.current) return;
        if (logoutInProgressRef.current) return;

        // Abort/cancel should be a no-op (a newer request is already in charge)
        if (
          error?.name === 'CanceledError' ||
          error?.code === 'ERR_CANCELED' ||
          error?.name === 'AbortError'
        ) {
          return;
        }

        const status = error?.response?.status;
        if (isTransientAuthFailureError(error) || !status || status >= 500) {
          if (userRef.current) return;
          throw error;
        }

        // Pri 401 interceptor už skúsil refresh; ak zlyhal, markSessionInvalid() je zavolaný.
        // Iba nastav user=null – setMayHaveRefreshCookie nevoláme (interceptor to rieši).
        if (status === 401) {
          applyResolvedUser(null);
          return;
        }

        console.error('Error refreshing user:', error);
        if (userRef.current) return;
        applyResolvedUser(null);
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
  }, [applyResolvedUser]);

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

  // Hard-stop signal from axios interceptor (refresh 401)
  useEffect(() => {
    const handler = () => {
      if (logoutInProgressRef.current) return;
      // Abort any in-flight /me request and deterministically clear identity
      try {
        meAbortControllerRef.current?.abort();
      } catch {
        // ignore
      }
      meAbortControllerRef.current = null;
      mePromiseRef.current = null;

      setMayHaveRefreshCookie(false);
      applyResolvedUser(null);
      setIsLoading(false);

      // Presmerovať len ak sme na chránenej trase – na verejných (/register, /login, …) nepresmerovať
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/search');
      if (isProtectedRoute) {
        router.replace('/');
      }
    };
    window.addEventListener('auth:session-invalid', handler);
    return () => window.removeEventListener('auth:session-invalid', handler);
  }, [applyResolvedUser, router]);

  // Auth stav určujeme výhradne cez `/api/auth/me/` (HttpOnly cookies).
  useEffect(() => {
    if (authBootstrapSnapshot.initialized) {
      userRef.current = authBootstrapSnapshot.user;
      setUser(authBootstrapSnapshot.user);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const wait = async (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

    const bootstrap = async () => {
      let attempt = 0;
      try {
        while (!cancelled) {
          try {
            await refreshUser();
            return;
          } catch (error: any) {
            const status = error?.response?.status;
            const retryable = isTransientAuthFailureError(error) || !status || status >= 500;

            attempt += 1;
            if (!retryable || attempt >= 3) {
              if (!retryable) {
                console.error('Initial auth bootstrap failed:', error);
              }
              return;
            }

            await wait(500 * attempt);
          }
        }
      } finally {
        if (!cancelled) {
          authBootstrapSnapshot.initialized = true;
          setIsLoading(false);
        }
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
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
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;

    // Deterministic: never allow refresh attempts after explicit logout
    invalidateSession();
    try {
      meAbortControllerRef.current?.abort();
    } catch {
      // ignore
    }
    meAbortControllerRef.current = null;
    mePromiseRef.current = null;

    // Vymazať posledné vyhľadávania aktuálneho používateľa
    if (user?.id) {
      localStorage.removeItem(`searchRecentResults_${user.id}`);
    }

    localStorage.removeItem('activeModule');
    sessionStorage.removeItem('forceHome');

    void (async () => {
      try {
        if (!hasCsrfToken()) {
          await fetchCsrfToken();
        }
        await api.post(endpoints.auth.logout, {});
      } catch {
        try {
          // Google/cookie-only sessions may not have a readable CSRF token loaded yet.
          // Retry once after explicitly fetching a fresh token so backend cookies are
          // actually cleared and a hard reload cannot resurrect the old session.
          await fetchCsrfToken();
          await api.post(endpoints.auth.logout, {});
        } catch {
          // ignore - local logout state must still be applied
        }
      } finally {
        clearAuthState();
        applyResolvedUser(null);
        setIsLoading(false);
        logoutInProgressRef.current = false;
        router.replace('/');
      }
    })();
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      applyResolvedUser(updatedUser);
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

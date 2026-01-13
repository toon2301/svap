'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
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
  const isServer = typeof window === 'undefined';
  console.log('🔍 [HYDRATION DEBUG] AuthProvider render', {
    isServer,
    hasWindow: typeof window !== 'undefined',
    timestamp: new Date().toISOString(),
  });
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  console.log('🔍 [HYDRATION DEBUG] AuthProvider - useState initialized', {
    isServer,
    user: user ? { id: user.id, email: user.email } : null,
    isLoading,
  });

  // Načítanie používateľa z localStorage pri inicializácii
  useEffect(() => {
    console.log('🔍 [HYDRATION DEBUG] AuthProvider - useEffect started (client only)');
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedTokens = localStorage.getItem('tokens');
        console.log('🔍 [HYDRATION DEBUG] AuthProvider - localStorage values', {
          hasStoredUser: !!storedUser,
          hasStoredTokens: !!storedTokens,
        });
        
        if (storedUser && storedTokens) {
          const userData = JSON.parse(storedUser);
          console.log('🔍 [HYDRATION DEBUG] AuthProvider - setting user from localStorage', {
            userId: userData.id,
            email: userData.email,
          });
          setUser(userData);
        } else {
          console.log('🔍 [HYDRATION DEBUG] AuthProvider - no stored user/tokens');
        }
      } catch (error) {
        console.error('🔍 [HYDRATION DEBUG] AuthProvider - Error loading user from localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('tokens');
      } finally {
        console.log('🔍 [HYDRATION DEBUG] AuthProvider - setting isLoading to false');
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Prihlásenie zlyhalo');
      }

      const { user: userData, tokens } = data;
      
      // Uloženie do localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('tokens', JSON.stringify(tokens));
      
      setUser(userData);
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registrácia zlyhala');
      }

      // Po registrácii používateľ nie je prihlásený, musí overiť email
      router.push('/verify-email');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    localStorage.removeItem('activeModule');
    sessionStorage.removeItem('forceHome');
    setUser(null);
    router.push('/');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async () => {
    try {
      // Použi centrálne axios API s interceptormi (Authorization z cookies)
      const { api, endpoints } = await import('@/lib/api');
      const resp = await api.get(endpoints.auth.me);
      if (resp?.status === 200 && resp.data) {
        setUser(resp.data);
        localStorage.setItem('user', JSON.stringify(resp.data));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
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

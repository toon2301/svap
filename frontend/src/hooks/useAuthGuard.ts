'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requireVerification?: boolean;
  requireProfile?: boolean;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const {
    redirectTo = '/login',
    requireVerification = false,
    requireProfile = false
  } = options;

  useEffect(() => {
    if (isLoading) return; // Čakáme na načítanie auth stavu

    // Ak používateľ nie je prihlásený
    if (!user) {
      router.push(redirectTo);
      return;
    }

    // Ak je potrebná verifikácia emailu
    if (requireVerification && !user.is_verified) {
      router.push('/verify-email');
      return;
    }

    // Ak je potrebný kompletný profil
    if (requireProfile && (!user.first_name || !user.last_name)) {
      router.push('/profile/edit');
      return;
    }
  }, [user, isLoading, router, redirectTo, requireVerification, requireProfile]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isVerified: user?.is_verified || false,
    hasCompleteProfile: !!(user?.first_name && user?.last_name)
  };
}

// Hook pre ochranu stránok, ktoré vyžadujú prihlásenie
export function useRequireAuth(redirectTo?: string) {
  return useAuthGuard({ redirectTo });
}

// Hook pre ochranu stránok, ktoré vyžadujú verifikáciu
export function useRequireVerification(redirectTo?: string) {
  return useAuthGuard({ requireVerification: true, redirectTo });
}

// Hook pre ochranu stránok, ktoré vyžadujú kompletný profil
export function useRequireProfile(redirectTo?: string) {
  return useAuthGuard({ requireProfile: true, redirectTo });
}
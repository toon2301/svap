'use client';

import { useEffect } from 'react';
import { dashboardModuleFromPath } from '../components/dashboardMountRoute';
import { getDashboardUserIdentifierFromTarget } from '../components/dashboardTargetUrl';
import type { SearchUserResult } from '../modules/search/types';

type PopstateModuleSyncInput = {
  isMobile: boolean;
  setActiveModule: (module: string) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
  setActiveRightItem: (item: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setViewedUserId: (userId: number | null) => void;
  setViewedUserSlug: (slug: string | null) => void;
  setViewedUserSummary: (summary: SearchUserResult | null) => void;
};

/** Tlačidlo späť a dopredu v prehliadači: modul a zobrazený používateľ sa zosúladia s adresou. */
export function usePopstateModuleSync({
  isMobile,
  setActiveModule,
  setIsRightSidebarOpen,
  setActiveRightItem,
  setIsMobileMenuOpen,
  setViewedUserId,
  setViewedUserSlug,
  setViewedUserSummary,
}: PopstateModuleSyncInput) {
  useEffect(() => {
    const syncModuleFromPath = () => {
      if (typeof window === 'undefined') return;
      const p = window.location.pathname || '';
      // To iste mapovanie ako pri mounte (`useDashboardMountRoute`).
      const pathModule = dashboardModuleFromPath(p);
      // Na desktope adresa príspevku znamená Nástenku s oknom (otvára ho efekt priameho vstupu), nie celú stránku.
      const moduleId = pathModule === 'feed-post-detail' && !isMobile ? 'home' : pathModule;
      if (moduleId !== null) {
        setActiveModule(moduleId);
        try {
          localStorage.setItem('activeModule', moduleId);
        } catch {
          // ignore
        }
        if (moduleId === 'user-profile' || moduleId === 'portfolio-detail') {
          const identifier = getDashboardUserIdentifierFromTarget(p);
          setViewedUserSummary(null);
          if (identifier && /^\d+$/.test(identifier)) {
            setViewedUserId(Number(identifier));
            setViewedUserSlug(null);
          } else if (identifier) {
            setViewedUserId(null);
            setViewedUserSlug(identifier);
          }
        } else {
          setViewedUserId(null);
          setViewedUserSlug(null);
          setViewedUserSummary(null);
        }
        setIsRightSidebarOpen(false);
        setActiveRightItem('');
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('popstate', syncModuleFromPath);
    return () => window.removeEventListener('popstate', syncModuleFromPath);
  }, [setActiveModule, setIsRightSidebarOpen, setActiveRightItem, setIsMobileMenuOpen, setViewedUserId, setViewedUserSlug, setViewedUserSummary, isMobile]);
}

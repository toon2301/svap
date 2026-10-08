'use client';

import { useCallback } from 'react';
import type { User } from '@/types';
import type { ProfileTab } from '../modules/profile/profileTypes';
import {
  buildPortfolioCreatePath,
  navigateBackFromPortfolioDetail,
  portfolioDetailBackTarget,
  returnToPortfolioDetailOrigin,
  type PortfolioBackRouter,
} from '../modules/profile/portfolioRouting';
import type { SearchUserResult } from '../modules/search/types';

type PortfolioNavigationInput = {
  router: PortfolioBackRouter;
  user: Pick<User, 'id' | 'slug'> | null;
  effectivePortfolioOwnerIdentifier: string | null;
  setActiveModule: (module: string) => void;
  setActiveRightItem: (item: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsNotificationsPanelOpen: (open: boolean) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setOwnProfileTab: (tab: ProfileTab) => void;
  setViewedUserId: (userId: number | null) => void;
  setViewedUserSlug: (slug: string | null) => void;
  setViewedUserSummary: (summary: SearchUserResult | null) => void;
};

/** Navigácia okolo portfólia: šípka späť z detailu položky a tlačidlo „nová položka“. */
export function usePortfolioNavigation({
  router,
  user,
  effectivePortfolioOwnerIdentifier,
  setActiveModule,
  setActiveRightItem,
  setIsMobileMenuOpen,
  setIsNotificationsPanelOpen,
  setIsRightSidebarOpen,
  setIsSearchOpen,
  setOwnProfileTab,
  setViewedUserId,
  setViewedUserSlug,
  setViewedUserSummary,
}: PortfolioNavigationInput) {
  const handlePortfolioDetailBack = useCallback(() => {
    // Polozku otvorila appka (zalozka Portfolio, zdielana karta na Nastenke):
    // skutocny krok spat. Modul si podla adresy doladi `syncModuleFromPath`.
    // Bez znameho povodu (odkaz, F5) ostava replace na zoznam vlastnika.
    if (returnToPortfolioDetailOrigin()) return;

    const identifier = String(effectivePortfolioOwnerIdentifier || '').trim();
    const { target, module: targetModule } = portfolioDetailBackTarget(identifier);

    setActiveModule(targetModule);
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsNotificationsPanelOpen(false);
    setViewedUserSummary(null);

    if (identifier) {
      if (/^\d+$/.test(identifier)) {
        setViewedUserId(Number(identifier));
        setViewedUserSlug(null);
      } else {
        setViewedUserId(null);
        setViewedUserSlug(identifier);
      }
    } else {
      setViewedUserId(null);
      setViewedUserSlug(null);
      setOwnProfileTab('portfolio');
    }

    try {
      localStorage.setItem('activeModule', targetModule);
    } catch {
      // ignore
    }

    // `replace`, nie `push` – odôvodnenie voľby je pri samotnom helperi.
    navigateBackFromPortfolioDetail(router, target);
  }, [
    effectivePortfolioOwnerIdentifier,
    router,
    setActiveModule,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsNotificationsPanelOpen,
    setIsRightSidebarOpen,
    setIsSearchOpen,
    setOwnProfileTab,
    setViewedUserId,
    setViewedUserSlug,
    setViewedUserSummary,
  ]);

  const handleCreatePortfolio = useCallback(() => {
    const identifier = user?.slug || (user?.id ? String(user.id) : null);
    setOwnProfileTab('portfolio');
    setActiveModule('portfolio-create');
    try {
      localStorage.setItem('activeModule', 'portfolio-create');
    } catch {
      // ignore
    }
    if (identifier && typeof window !== 'undefined') {
      window.history.pushState(null, '', buildPortfolioCreatePath(identifier));
    }
  }, [user, setActiveModule, setOwnProfileTab]);

  return { handlePortfolioDetailBack, handleCreatePortfolio };
}

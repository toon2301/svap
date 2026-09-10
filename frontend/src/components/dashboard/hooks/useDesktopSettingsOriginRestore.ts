'use client';

import { useEffect } from 'react';
import { currentBrowserUrl } from '@/utils/currentBrowserUrl';
import {
  normalizeDashboardUrl,
  readDesktopSettingsOriginTarget,
} from './desktopSettingsNavigation';

type DesktopSettingsOriginRestoreActions = {
  setActiveModule: (moduleId: string) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
  setActiveRightItem: (itemId: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
};

/**
 * Obnoví presný desktopový modul po návrate z Nastavení.
 *
 * Marker žije na pôvodnom history zázname, takže funguje aj keď Next.js pri
 * prechode remountne Dashboard a pôvodný popstate listener už zanikol.
 */
export function useDesktopSettingsOriginRestore({
  setActiveModule,
  setIsRightSidebarOpen,
  setActiveRightItem,
  setIsMobileMenuOpen,
  setIsSearchOpen,
}: DesktopSettingsOriginRestoreActions): void {
  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRestore = () => {
      if (window.innerWidth < 1024) return;

      const returnTarget = readDesktopSettingsOriginTarget(window.history.state);
      if (!returnTarget) return;

      // Marker môže na history zázname zostať dlhodobo. Použi ho iba dovtedy,
      // kým naozaj patrí aktuálnej adrese; tým nevznikne stale návrat po inom
      // replaceState prechode, ktorý zachoval cudzie state položky.
      const currentUrl = normalizeDashboardUrl(currentBrowserUrl('/dashboard'));
      if (currentUrl !== returnTarget.url) return;

      if (restoreTimer !== null) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        restoreTimer = null;
        setActiveModule(returnTarget.moduleId);
        setIsRightSidebarOpen(false);
        setActiveRightItem('');
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
        try {
          window.localStorage.setItem('activeModule', returnTarget.moduleId);
        } catch {
          // UI je už obnovené; zlyhanie perzistencie nesmie pokaziť návrat.
        }
      }, 0);
    };

    // Mount-time kontrola je dôležitá pri remounte route: popstate vtedy mohol
    // obslúžiť už odchádzajúci Dashboard, ktorého timer sa pri unmount zrušil.
    scheduleRestore();
    window.addEventListener('popstate', scheduleRestore);

    return () => {
      window.removeEventListener('popstate', scheduleRestore);
      if (restoreTimer !== null) clearTimeout(restoreTimer);
    };
  }, [
    setActiveModule,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsRightSidebarOpen,
    setIsSearchOpen,
  ]);
}

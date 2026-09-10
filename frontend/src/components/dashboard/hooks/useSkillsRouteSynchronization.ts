'use client';

import { useEffect } from 'react';

export type SkillsRouteModule = 'skills' | 'skills-offer' | 'skills-search';

type SkillsRouteSynchronizationActions = {
  onModuleChange: (moduleId: SkillsRouteModule) => void;
  setIsSearchOpen: (open: boolean) => void;
  setViewedUserId: (userId: number | null) => void;
  setViewedUserSlug: (slug: string | null) => void;
  setViewedUserSummary: (summary: null) => void;
};

export function getSkillsModuleFromPath(pathname: string): SkillsRouteModule | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === '/dashboard/skills') return 'skills';
  if (normalizedPath === '/dashboard/skills/offer') return 'skills-offer';
  if (normalizedPath === '/dashboard/skills/search') return 'skills-search';
  return null;
}

/** Synchronizes the skills screen with browser Back/Forward history changes. */
export function useSkillsRouteSynchronization({
  onModuleChange,
  setIsSearchOpen,
  setViewedUserId,
  setViewedUserSlug,
  setViewedUserSummary,
}: SkillsRouteSynchronizationActions): void {
  useEffect(() => {
    const synchronizeSkillsRoute = () => {
      const moduleId = getSkillsModuleFromPath(window.location.pathname || '');
      if (!moduleId) return;

      onModuleChange(moduleId);
      setIsSearchOpen(false);
      setViewedUserId(null);
      setViewedUserSlug(null);
      setViewedUserSummary(null);
    };

    window.addEventListener('popstate', synchronizeSkillsRoute);
    return () => window.removeEventListener('popstate', synchronizeSkillsRoute);
  }, [
    onModuleChange,
    setIsSearchOpen,
    setViewedUserId,
    setViewedUserSlug,
    setViewedUserSummary,
  ]);
}

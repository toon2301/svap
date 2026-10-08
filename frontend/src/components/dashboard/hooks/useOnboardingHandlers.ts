'use client';

import { useCallback, useRef } from 'react';
import { dashboardSectionPath } from '../components/dashboardRoutes';
import type { ProfileTab } from '../modules/profile/profileTypes';
import type { SearchUserResult } from '../modules/search/types';
import type { DashboardHighlightingProps } from './useDashboardHighlighting';

type OnboardingHandlersInput = {
  activeModule: string;
  handleMainModuleChange: (moduleId: string) => void;
  highlighting: Pick<DashboardHighlightingProps, 'setHighlightedSkillId'>;
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

/** Obsluhy sprievodcov: otvorenie obrazoviek, ktoré sprievodca ukazuje, a oznam „prvá ponuka je vytvorená“. */
export function useOnboardingHandlers({
  activeModule,
  handleMainModuleChange,
  highlighting,
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
}: OnboardingHandlersInput) {
  const mobileOnboardingSkillCreatedHandlerRef = useRef<(() => void) | null>(null);
  const desktopOnboardingSkillCreatedHandlerRef = useRef<(() => void) | null>(null);

  const handleOnboardingSearchOpen = useCallback(() => {
    handleMainModuleChange('search');
  }, [handleMainModuleChange]);

  const handleDesktopOnboardingSearchOpen = useCallback(() => {
    setIsNotificationsPanelOpen(false);
    if (activeModule === 'search') {
      handleMainModuleChange('home');
    }
    setIsSearchOpen(true);
  }, [activeModule, handleMainModuleChange, setIsNotificationsPanelOpen, setIsSearchOpen]);

  const handleDesktopOnboardingSearchClose = useCallback(() => {
    setIsSearchOpen(false);
  }, [setIsSearchOpen]);

  const handleOnboardingRequestsOpen = useCallback(() => {
    handleMainModuleChange('requests');
  }, [handleMainModuleChange]);

  const handleDesktopOnboardingRequestsOpen = useCallback(() => {
    setIsSearchOpen(false);
    handleMainModuleChange('requests');
  }, [handleMainModuleChange, setIsSearchOpen]);

  const handleOnboardingMessagesOpen = useCallback(() => {
    handleMainModuleChange('messages');
  }, [handleMainModuleChange]);

  const handleOnboardingHomeOpen = useCallback(() => {
    handleMainModuleChange('home');
  }, [handleMainModuleChange]);

  const handleDesktopOnboardingProfileOpen = useCallback(() => {
    setOwnProfileTab('offers');
    setActiveModule('profile');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsNotificationsPanelOpen(false);
    setViewedUserId(null);
    setViewedUserSlug(null);
    setViewedUserSummary(null);
    highlighting.setHighlightedSkillId(null);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'profile');
      }
    } catch {
      // Navigation state is already updated; ignore storage failures.
    }

    const ownProfilePath = dashboardSectionPath('profile');
    if (typeof window !== 'undefined' && ownProfilePath) {
      window.history.pushState(null, '', ownProfilePath);
    }
  }, [
    highlighting,
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

  const handleOnboardingSkillCreated = useCallback(() => {
    mobileOnboardingSkillCreatedHandlerRef.current?.();
    desktopOnboardingSkillCreatedHandlerRef.current?.();
  }, []);

  const handleMobileOnboardingSkillCreatedHandlerSet = useCallback((handler: (() => void) | null) => {
    mobileOnboardingSkillCreatedHandlerRef.current = handler;
  }, []);

  const handleDesktopOnboardingSkillCreatedHandlerSet = useCallback((handler: (() => void) | null) => {
    desktopOnboardingSkillCreatedHandlerRef.current = handler;
  }, []);

  return {
    handleOnboardingSearchOpen,
    handleDesktopOnboardingSearchOpen,
    handleDesktopOnboardingSearchClose,
    handleOnboardingRequestsOpen,
    handleDesktopOnboardingRequestsOpen,
    handleOnboardingMessagesOpen,
    handleOnboardingHomeOpen,
    handleDesktopOnboardingProfileOpen,
    handleOnboardingSkillCreated,
    handleMobileOnboardingSkillCreatedHandlerSet,
    handleDesktopOnboardingSkillCreatedHandlerSet,
  };
}

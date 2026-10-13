'use client';

import React, { useCallback, useRef } from 'react';
import { navigateMessagesUrl } from '../modules/messages/messagesRouting';
import { returnToOfferReviewsOrigin } from '../modules/reviews/offerReviewsOrigin';
import { getSafeDashboardReturnTo } from '../modules/reviews/offerReviewsRouting';
import type { NotificationNavigateOptions } from './useNotificationNavigation';
import type { DashboardSkill } from './useSkillsModals';

type DashboardBackHandlersInput = {
  searchParams: Pick<URLSearchParams, 'get'> | null;
  handleMobileBack: (isInSubcategories?: boolean, skillsDescribeSkillId?: number | null) => void;
  handleNotificationNavigate: (targetUrl: string, options?: NotificationNavigateOptions) => void;
  selectedSkillsCategory: Pick<DashboardSkill, 'id'> | null;
  setActiveModule: (module: string) => void;
  setActiveRightItem: (item: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
};

/** Obsluhy šípky späť pre výber kategórie, popis zručnosti, recenzie ponuky a mobilnú konverzáciu. */
export function useDashboardBackHandlers({
  searchParams,
  handleMobileBack,
  handleNotificationNavigate,
  selectedSkillsCategory,
  setActiveModule,
  setActiveRightItem,
  setIsMobileMenuOpen,
  setIsRightSidebarOpen,
}: DashboardBackHandlersInput) {
  const skillsCategoryBackHandlerRef = useRef<(() => void) | null>(null);

  const offerReviewsReturnTo = React.useMemo(
    () => getSafeDashboardReturnTo(searchParams?.get('returnTo') ?? null),
    [searchParams],
  );

  const handleOfferReviewsBack = useCallback(() => {
    // Recenzie otvorila appka z karty ponuky: skutočný krok späť. Profil sa
    // neotvára znova – `push` by pridal záznam a Späť by viedlo do recenzií
    // (slučka). Modul si podľa adresy doladí `syncModuleFromPath`.
    if (returnToOfferReviewsOrigin()) return;

    // Bez známeho pôvodu (odkaz, F5, nová karta): návratová adresa, ale cez
    // `replace` – história nerastie, takže slučka nemá z čoho vzniknúť.
    if (offerReviewsReturnTo) {
      handleNotificationNavigate(offerReviewsReturnTo, { replace: true });
      return;
    }

    handleMobileBack();
  }, [handleMobileBack, handleNotificationNavigate, offerReviewsReturnTo]);

  const handleSkillsDescribeMobileBack = useCallback(() => {
    handleMobileBack(false, selectedSkillsCategory?.id ?? null);
  }, [handleMobileBack, selectedSkillsCategory?.id]);

  // Skills category back handler
  const handleSkillsCategoryBack = useCallback(() => {
    if (skillsCategoryBackHandlerRef.current) {
      skillsCategoryBackHandlerRef.current();
    } else {
      handleMobileBack();
    }
  }, [handleMobileBack]);

  const handleMobileMessagesBack = useCallback(() => {
    setActiveModule('messages');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsMobileMenuOpen(false);
    navigateMessagesUrl();
  }, [setActiveModule, setActiveRightItem, setIsMobileMenuOpen, setIsRightSidebarOpen]);

  return {
    skillsCategoryBackHandlerRef,
    handleOfferReviewsBack,
    handleSkillsDescribeMobileBack,
    handleSkillsCategoryBack,
    handleMobileMessagesBack,
  };
}

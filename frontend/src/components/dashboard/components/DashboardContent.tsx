"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '@/types';
import { api, endpoints } from '@/lib/api';
import type { ProfileTab } from '../modules/profile/profileTypes';
import DashboardLayout from '../DashboardLayout';
import ModuleRouter from '../ModuleRouter';
import DashboardModals from '../DashboardModals';
import SearchModule from '../modules/SearchModule';
import { useDashboardState } from '../hooks/useDashboardState';
import { useSkillsModals } from '../hooks/useSkillsModals';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { useDashboardHighlighting } from '../hooks/useDashboardHighlighting';
import { useDashboardUserProfile } from '../hooks/useDashboardUserProfile';
import { useDashboardKeyboard } from '../hooks/useDashboardKeyboard';
import { useSkillSaveHandler } from '../hooks/useSkillSaveHandler';
import { RequestsNotificationsProvider } from '../contexts/RequestsNotificationsContext';
import { getUserIdBySlug, setUserProfileToCache } from '../modules/profile/profileUserCache';

interface DashboardContentProps {
  initialUser?: User;
  initialRoute?: string;
  initialViewedUserId?: number | null;
  initialHighlightedSkillId?: number | null;
  initialProfileTab?: ProfileTab;
  initialProfileSlug?: string | null;
  initialRightItem?: string | null;
}

/**
 * Hlavný obsah Dashboard komponenta s všetkou logikou
 */
export default function DashboardContent({
  initialUser,
  initialRoute,
  initialViewedUserId,
  initialHighlightedSkillId,
  initialProfileTab,
  initialProfileSlug,
  initialRightItem,
}: DashboardContentProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Core Dashboard State
  const dashboardState = useDashboardState(initialUser, initialRoute);
  const skillsState = useSkillsModals();
  
  // Local component state
  const [isInSubcategories, setIsInSubcategories] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const skillsCategoryBackHandlerRef = useRef<(() => void) | null>(null);

  // Custom hooks pre rozdelenie logiky
  const highlighting = useDashboardHighlighting({
    activeModule: dashboardState.activeModule,
    initialHighlightedSkillId,
  });

  const userProfile = useDashboardUserProfile({
    user: dashboardState.user,
    activeModule: dashboardState.activeModule,
    dashboardState,
    initialViewedUserId,
    initialHighlightedSkillId,
    initialProfileSlug,
    initialRightItem,
    setHighlightedSkillId: highlighting.setHighlightedSkillId,
  });

  const navigation = useDashboardNavigation({
    user: dashboardState.user,
    dashboardState,
    isSearchOpen,
    setIsSearchOpen,
    setViewedUserId: userProfile.setViewedUserId,
    setViewedUserSlug: userProfile.setViewedUserSlug,
    setViewedUserSummary: userProfile.setViewedUserSummary,
    setHighlightedSkillId: highlighting.setHighlightedSkillId,
    highlightTimeoutRef: highlighting.highlightTimeoutRef,
  });

  // Keyboard shortcuts
  useDashboardKeyboard({
    isSearchOpen,
    setIsSearchOpen,
  });

  // Destructure states pre jednoduchšie použitie
  const {
    user,
    isLoading,
    activeModule,
    activeRightItem,
    isRightSidebarOpen,
    isMobileMenuOpen,
    accountType,
    handleModuleChange,
    handleRightSidebarToggle,
    handleRightItemClick,
    handleUserUpdate,
    handleLogout,
    handleMobileBack,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setAccountType,
    isAccountTypeModalOpen,
    setIsAccountTypeModalOpen,
    isPersonalAccountModalOpen,
    setIsPersonalAccountModalOpen,
  } = dashboardState;

  const {
    selectedSkillsCategory,
    setSelectedSkillsCategory,
    standardCategories,
    setStandardCategories,
    customCategories,
    setCustomCategories,
    isSkillsCategoryModalOpen,
    setIsSkillsCategoryModalOpen,
    isSkillDescriptionModalOpen,
    setIsSkillDescriptionModalOpen,
    isAddCustomCategoryModalOpen,
    setIsAddCustomCategoryModalOpen,
    editingCustomCategoryIndex,
    setEditingCustomCategoryIndex,
    editingStandardCategoryIndex,
    setEditingStandardCategoryIndex,
    toLocalSkill,
    applySkillUpdate,
    loadSkills,
    fetchSkillDetail,
    handleRemoveSkillImage,
    removeStandardCategory,
    removeCustomCategory,
  } = skillsState;

  // Funkcia na uloženie karty (presunutá do samostatného hooku pre prehľadnosť)
  const handleSkillSave = useSkillSaveHandler({
    selectedSkillsCategory,
    activeModule,
    setActiveModule,
    toLocalSkill,
    applySkillUpdate,
    loadSkills,
    t,
    ownerUserIdForOffersCache: initialUser?.id,
  });

  // Skills category back handler
  const handleSkillsCategoryBack = useCallback(() => {
    if (skillsCategoryBackHandlerRef.current) {
      skillsCategoryBackHandlerRef.current();
    } else {
      handleMobileBack();
    }
  }, [handleMobileBack]);

  // Načítať karty pri navigácii na skills-offer alebo skills-search
  useEffect(() => {
    if (activeModule === 'skills-offer' || activeModule === 'skills-search') {
      void loadSkills();
    }
  }, [activeModule, loadSkills]);

  // Globálna navigácia na cudzí profil (napr. zo Žiadostí).
  // Používame event, aby UI reagovalo okamžite aj v prípadoch, keď sa URL zmení bez
  // toho, aby Next router prerenderoval stránku (napr. window.history.pushState).
  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<{ identifier?: string; highlightId?: number | string | null }>).detail;
      const identifier = (detail?.identifier || '').trim();
      if (!identifier) return;

      const rawHighlight = detail?.highlightId;
      const parsedHighlight =
        typeof rawHighlight === 'number'
          ? rawHighlight
          : rawHighlight != null && String(rawHighlight).trim()
            ? Number(rawHighlight)
            : null;
      const highlightId = parsedHighlight != null && Number.isFinite(parsedHighlight) ? parsedHighlight : null;

      // Prepni modul a zavri vedľajšie UI
      setActiveModule('user-profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);

      // Nastav, aký profil sa má zobraziť
      if (/^\d+$/.test(identifier)) {
        userProfile.setViewedUserId(Number(identifier));
        userProfile.setViewedUserSlug(null);
      } else {
        userProfile.setViewedUserSlug(identifier);
        userProfile.setViewedUserId(null);

        // Pokús sa slug -> userId (cache -> API), aby ModuleRouter vedel vyrenderovať profil.
        const cachedId = getUserIdBySlug(identifier);
        if (cachedId) {
          userProfile.setViewedUserId(cachedId);
        } else {
          void (async () => {
            try {
              const { data } = await api.get(endpoints.dashboard.userProfileBySlug(identifier));
              userProfile.setViewedUserId(data.id);
              setUserProfileToCache(data.id, data);
            } catch {
              // necháme UI rozhodnúť (zobrazí not-found hlášku)
            }
          })();
        }
      }
      userProfile.setViewedUserSummary(null);

      // Highlight skill (ak je)
      if (highlightId != null) {
        highlighting.setHighlightedSkillId(highlightId);
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('highlightedSkillId', String(highlightId));
            sessionStorage.setItem('highlightedSkillTime', String(Date.now()));
          }
        } catch {
          // ignore
        }
      } else {
        highlighting.setHighlightedSkillId(null);
      }

      // Aktualizuj URL bez reloadu
      if (typeof window !== 'undefined') {
        const url = `/dashboard/users/${encodeURIComponent(identifier)}${
          highlightId != null ? `?highlight=${encodeURIComponent(String(highlightId))}` : ''
        }`;
        window.history.pushState(null, '', url);
      }
    };

    window.addEventListener('goToUserProfile', handler as EventListener);
    return () => {
      window.removeEventListener('goToUserProfile', handler as EventListener);
    };
  }, [
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsSearchOpen,
    userProfile,
    highlighting,
  ]);

  // Globálna navigácia na vlastný profil (napr. zo Žiadostí pri prijatej žiadosti).
  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<{ highlightId?: number | string | null }>).detail;
      const rawHighlight = detail?.highlightId;
      const parsedHighlight =
        typeof rawHighlight === 'number'
          ? rawHighlight
          : rawHighlight != null && String(rawHighlight).trim()
            ? Number(rawHighlight)
            : null;
      const highlightId = parsedHighlight != null && Number.isFinite(parsedHighlight) ? parsedHighlight : null;

      setActiveModule('profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);

      // vyčisti stav cudzích profilov, aby sa UI nemiešalo
      try {
        userProfile.setViewedUserId(null);
        userProfile.setViewedUserSlug(null);
        userProfile.setViewedUserSummary(null);
      } catch {
        // ignore
      }

      if (highlightId != null) {
        highlighting.setHighlightedSkillId(highlightId);
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('highlightedSkillId', String(highlightId));
            sessionStorage.setItem('highlightedSkillTime', String(Date.now()));
          }
        } catch {
          // ignore
        }
      } else {
        highlighting.setHighlightedSkillId(null);
      }

      if (typeof window !== 'undefined') {
        const url = `/dashboard/profile${
          highlightId != null ? `?highlight=${encodeURIComponent(String(highlightId))}` : ''
        }`;
        window.history.pushState(null, '', url);
      }
    };

    window.addEventListener('goToMyProfile', handler as EventListener);
    return () => {
      window.removeEventListener('goToMyProfile', handler as EventListener);
    };
  }, [
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsSearchOpen,
    userProfile,
    highlighting,
  ]);

  // Early returns pre loading a error states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">{t('dashboard.loadingDashboard', 'Načítavam dashboard...')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{t('dashboard.userNotFound', 'Používateľ nebol nájdený.')}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {t('dashboard.goHome', 'Prejsť na domovskú stránku')}
          </button>
        </div>
      </div>
    );
  }

  // Module content pre ModuleRouter
  const moduleContent = (
    <ModuleRouter
      user={user}
      activeModule={activeModule}
      activeRightItem={activeRightItem}
      isRightSidebarOpen={isRightSidebarOpen}
      accountType={accountType}
      onUserUpdate={handleUserUpdate}
      handleRightSidebarToggle={handleRightSidebarToggle}
      setActiveModule={setActiveModule}
      setIsSkillsCategoryModalOpen={setIsSkillsCategoryModalOpen}
      setSelectedSkillsCategory={setSelectedSkillsCategory}
      setIsSkillDescriptionModalOpen={setIsSkillDescriptionModalOpen}
      setIsAddCustomCategoryModalOpen={setIsAddCustomCategoryModalOpen}
      setEditingCustomCategoryIndex={setEditingCustomCategoryIndex}
      setEditingStandardCategoryIndex={setEditingStandardCategoryIndex}
      standardCategories={standardCategories}
      customCategories={customCategories}
      setAccountType={setAccountType}
      setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
      setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
      removeStandardCategory={removeStandardCategory}
      removeCustomCategory={removeCustomCategory}
      selectedSkillsCategory={selectedSkillsCategory}
      isInSubcategories={isInSubcategories}
      setIsInSubcategories={setIsInSubcategories}
      onSkillsCategoryBackHandlerSet={(handler) => {
        skillsCategoryBackHandlerRef.current = handler;
      }}
      viewedUserId={userProfile.viewedUserId}
      viewedUserSlug={userProfile.viewedUserSlug}
      viewedUserSummary={userProfile.viewedUserSummary}
      onEditProfileClick={navigation.handleEditProfileClick}
      onViewUserProfile={navigation.handleViewUserProfileFromSearch}
      highlightedSkillId={highlighting.highlightedSkillId}
      onViewUserSkillFromSearch={navigation.handleViewUserSkillFromSearch}
      initialProfileTab={initialProfileTab}
      onSkillsOfferClick={navigation.handleSkillsOfferClick}
      onSkillsSearchClick={navigation.handleSkillsSearchClick}
    />
  );

  return (
    <RequestsNotificationsProvider>
      <DashboardLayout
        activeModule={activeModule}
        activeRightItem={activeRightItem}
        isRightSidebarOpen={isRightSidebarOpen}
        isMobileMenuOpen={isMobileMenuOpen}
        onModuleChange={navigation.handleMainModuleChange}
        onLogout={handleLogout}
        onRightSidebarClose={navigation.handleRightSidebarClose}
        onRightItemClick={handleRightItemClick}
        onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
        onMobileBack={activeModule === 'skills-select-category' ? handleSkillsCategoryBack : handleMobileBack}
        onMobileProfileClick={navigation.handleMobileProfileClick}
        onSidebarLanguageClick={navigation.handleSidebarLanguageClick}
        onSidebarAccountTypeClick={navigation.handleSidebarAccountTypeClick}
        onSidebarPrivacyClick={navigation.handleSidebarPrivacyClick}
        isSearchOpen={isSearchOpen}
        onSidebarSearchClick={navigation.handleSidebarSearchClick}
        onSearchClose={navigation.handleSearchClose}
        searchOverlay={
          user ? (
            <SearchModule
              user={user}
              onUserClick={navigation.handleViewUserProfileFromSearch}
              onSkillClick={navigation.handleViewUserSkillFromSearch}
              isOverlay
            />
          ) : null
        }
        subcategory={activeModule === 'skills-describe' ? selectedSkillsCategory?.subcategory : null}
        onSkillSaveClick={activeModule === 'skills-describe' ? handleSkillSave : undefined}
      >
        {moduleContent}
      </DashboardLayout>

      <DashboardModals
        accountType={accountType}
        setAccountType={setAccountType}
        isAccountTypeModalOpen={isAccountTypeModalOpen}
        setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
        isPersonalAccountModalOpen={isPersonalAccountModalOpen}
        setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
        user={user}
        onUserUpdate={dashboardState.handleUserUpdate}
        skillsState={{
          selectedSkillsCategory,
          setSelectedSkillsCategory,
          standardCategories,
          setStandardCategories,
          customCategories,
          setCustomCategories,
          isSkillsCategoryModalOpen,
          setIsSkillsCategoryModalOpen,
          isSkillDescriptionModalOpen,
          setIsSkillDescriptionModalOpen,
          isAddCustomCategoryModalOpen,
          setIsAddCustomCategoryModalOpen,
          editingCustomCategoryIndex,
          setEditingCustomCategoryIndex,
          editingStandardCategoryIndex,
          setEditingStandardCategoryIndex,
          toLocalSkill,
          applySkillUpdate,
          loadSkills,
          fetchSkillDetail,
          handleRemoveSkillImage,
          removeStandardCategory,
          removeCustomCategory,
        }}
        activeModule={activeModule}
        t={t}
      />
    </RequestsNotificationsProvider>
  );
}

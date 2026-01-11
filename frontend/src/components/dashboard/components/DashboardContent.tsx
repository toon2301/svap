"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '@/types';
import type { ProfileTab } from '../modules/profile/profileTypes';
import type { SearchUserResult } from '../modules/search/types';
import DashboardLayout from '../DashboardLayout';
import ModuleRouter from '../ModuleRouter';
import DashboardModals from '../DashboardModals';
import SearchModule from '../modules/SearchModule';
import { useDashboardState } from '../hooks/useDashboardState';
import { useSkillsModals, type DashboardSkill } from '../hooks/useSkillsModals';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { useDashboardHighlighting } from '../hooks/useDashboardHighlighting';
import { useDashboardUserProfile } from '../hooks/useDashboardUserProfile';
import { useDashboardKeyboard } from '../hooks/useDashboardKeyboard';
import { api, endpoints } from '@/lib/api';

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

  // Funkcia na uloženie karty
  const handleSkillSave = useCallback(async () => {
    if (!selectedSkillsCategory) return;

    // Zistiť, či ide o "Ponúkam" alebo "Hľadám"
    let isSeeking =
      selectedSkillsCategory.is_seeking === true ||
      activeModule === 'skills-search';

    // Ak ešte nemáme is_seeking, skúsime skillsDescribeMode z localStorage
    if (!isSeeking && typeof window !== 'undefined') {
      try {
        const mode = localStorage.getItem('skillsDescribeMode');
        if (mode === 'search') {
          isSeeking = true;
        }
      } catch {
        // ignore storage errors
      }
    }

    const targetModule = isSeeking ? 'skills-search' : 'skills-offer';

    // UX: hneď po kliknutí na fajku presmeruj späť na obrazovku s výberom/pridaním kategórie.
    // Ukladanie prebehne na pozadí – po dokončení sa len aktualizuje zoznam kariet.
    setActiveModule(targetModule);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', targetModule);
      }
    } catch {
      // ignore storage errors
    }

    try {
      const skill = selectedSkillsCategory;
      
      // Pripraviť payload
      const trimmedDistrict = (skill.district || '').trim();
      const trimmedLocation = (skill.location || '').trim();
      const detailedText = (skill.detailed_description || '').trim();
      
      const payload: any = {
        category: skill.category,
        subcategory: skill.subcategory,
        description: skill.description || '',
        detailed_description: detailedText,
        tags: Array.isArray(skill.tags) ? skill.tags : [],
        district: trimmedDistrict,
        location: trimmedLocation,
        is_seeking: isSeeking,
        urgency: skill.urgency || 'low',
        duration_type: skill.duration_type || null,
      };
      
      if (skill.experience && typeof skill.experience.value === 'number' && skill.experience.unit) {
        payload.experience_value = skill.experience.value;
        payload.experience_unit = skill.experience.unit;
      } else {
        payload.experience_value = null;
        payload.experience_unit = '';
      }
      
      if (typeof skill.price_from === 'number' && !isNaN(skill.price_from)) {
        payload.price_from = skill.price_from;
        payload.price_currency = skill.price_currency || '€';
      } else {
        payload.price_from = null;
        payload.price_currency = '';
      }

      if (skill.opening_hours) {
        payload.opening_hours = skill.opening_hours;
      }

      let savedSkill: DashboardSkill;
      const newImages = (skill as any)._newImages || [];
      
      if (skill.id) {
        // Update existujúcej karty
        const { data } = await api.patch(endpoints.skills.detail(skill.id), payload);
        savedSkill = toLocalSkill(data);
        
        // Nahrať nové obrázky
        if (newImages.length > 0) {
          for (let i = 0; i < newImages.length; i++) {
            const file = newImages[i];
            try {
              const fd = new FormData();
              fd.append('image', file);
              await api.post(endpoints.skills.images(skill.id), fd);
            } catch (imgError: any) {
              const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
              alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
            }
          }
        }
      } else {
        // Vytvorenie novej karty
        const { data } = await api.post(endpoints.skills.list, payload);
        savedSkill = toLocalSkill(data);
        
        // Nahrať nové obrázky
        if (newImages.length > 0 && savedSkill.id) {
          for (let i = 0; i < newImages.length; i++) {
            const file = newImages[i];
            try {
              const fd = new FormData();
              fd.append('image', file);
              await api.post(endpoints.skills.images(savedSkill.id), fd);
            } catch (imgError: any) {
              const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
              alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
            }
          }
        }
      }
      
      // Úspešne uložené – aktualizuj zoznam kariet
      applySkillUpdate(savedSkill);

      // Po úspešnom uložení, refresh skills pre aktívnu kategóriu
      void loadSkills();
    } catch (error: any) {
      console.error('Chyba pri ukladaní zručnosti:', error);
      const message = error?.response?.data?.error || error?.response?.data?.detail || t('dashboard.skillSaveError', 'Nepodarilo sa uložiť zručnosť');
      alert(message);
    }
  }, [
    selectedSkillsCategory,
    activeModule,
    setActiveModule,
    toLocalSkill,
    applySkillUpdate,
    loadSkills,
    t
  ]);

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
    <>
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
        user={user}
        t={t}
      />
    </>
  );
}

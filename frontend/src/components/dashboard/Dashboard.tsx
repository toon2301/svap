'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '../../types';
import DashboardLayout from './DashboardLayout';
import ModuleRouter from './ModuleRouter';
import DashboardModals from './DashboardModals';
import { useDashboardState } from './hooks/useDashboardState';
import { useSkillsModals } from './hooks/useSkillsModals';

interface DashboardProps {
  initialUser?: User;
}

export default function Dashboard({ initialUser }: DashboardProps) {
  const { t } = useLanguage();
  const dashboardState = useDashboardState(initialUser);
  const skillsState = useSkillsModals();
  const [isInSubcategories, setIsInSubcategories] = useState(false);
  const skillsCategoryBackHandlerRef = React.useRef<(() => void) | null>(null);

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

  useEffect(() => {
    if (user) {
      loadSkills();
    }
  }, [user, loadSkills]);

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
    return null;
  }

  const handleRightSidebarClose = () => {
          setIsRightSidebarOpen(false);
          setActiveRightItem('');
  };

  const handleMobileProfileClick = () => {
          setActiveModule('profile');
          setIsRightSidebarOpen(false);
  };

  const handleSidebarLanguageClick = () => {
    setActiveModule('profile');
    setIsRightSidebarOpen(true);
    setActiveRightItem('language');
  };

  const handleSidebarAccountTypeClick = () => {
    setActiveModule('profile');
    setIsRightSidebarOpen(true);
    setActiveRightItem('account-type');
  };

  // Custom back handler for skills-select-category
  const handleSkillsCategoryBack = () => {
    // Ak máme handler z SkillsCategoryScreen a sme v podkategóriách, volaj ho
    if (skillsCategoryBackHandlerRef.current && isInSubcategories) {
      skillsCategoryBackHandlerRef.current();
    } else {
      // Inak použi štandardnú navigáciu
      handleMobileBack(isInSubcategories);
    }
  };

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
    />
  );

  return (
    <>
      <DashboardLayout
        activeModule={activeModule}
        activeRightItem={activeRightItem}
        isRightSidebarOpen={isRightSidebarOpen}
        isMobileMenuOpen={isMobileMenuOpen}
        onModuleChange={handleModuleChange}
        onLogout={handleLogout}
        onRightSidebarClose={handleRightSidebarClose}
        onRightItemClick={handleRightItemClick}
        onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
        onMobileBack={activeModule === 'skills-select-category' ? handleSkillsCategoryBack : handleMobileBack}
        onMobileProfileClick={handleMobileProfileClick}
        onSidebarLanguageClick={handleSidebarLanguageClick}
        onSidebarAccountTypeClick={handleSidebarAccountTypeClick}
        subcategory={activeModule === 'skills-describe' ? selectedSkillsCategory?.subcategory : null}
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
        t={t}
      />
    </>
  );
}


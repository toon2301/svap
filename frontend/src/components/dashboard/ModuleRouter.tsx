'use client';

import React from 'react';
import type { User } from '../../types';
import type { SearchUserResult } from './modules/search/types';
import ProfileModule from './modules/ProfileModule';
import NotificationsModule from './modules/NotificationsModule';
import LanguageModule from './modules/LanguageModule';
import AccountTypeModule from './modules/AccountTypeModule';
import PrivacySettingsModule from './modules/PrivacySettingsModule';
import PrivacySettingsMobileSection from './modules/PrivacySettingsMobileSection';
import SkillsModuleRouter from './modules/skills/SkillsModuleRouter';
import SearchModule from './modules/SearchModule';
import CreateModule from './modules/CreateModule';
import MessagesModule from './modules/MessagesModule';
import AccountTypeSection from './modules/accountType/AccountTypeSection';
import type { DashboardSkill } from './hooks/useSkillsModals';
import { useLanguage } from '@/contexts/LanguageContext';
import { SearchUserProfileModule } from './modules/search/SearchUserProfileModule';

interface ModuleRouterProps {
  user: User;
  activeModule: string;
  activeRightItem: string;
  isRightSidebarOpen: boolean;
  accountType: 'personal' | 'business';
  onUserUpdate: (updatedUser: User) => void;
  handleRightSidebarToggle: () => void;
  setActiveModule: (module: string) => void;
  setIsSkillsCategoryModalOpen: (value: boolean) => void;
  setSelectedSkillsCategory: (value: DashboardSkill | null) => void;
  setIsSkillDescriptionModalOpen: (value: boolean) => void;
  setIsAddCustomCategoryModalOpen: (value: boolean) => void;
  setEditingCustomCategoryIndex: (value: number | null) => void;
  setEditingStandardCategoryIndex: (value: number | null) => void;
  standardCategories: DashboardSkill[];
  customCategories: DashboardSkill[];
  setAccountType: (type: 'personal' | 'business') => void;
  setIsAccountTypeModalOpen: (value: boolean) => void;
  setIsPersonalAccountModalOpen: (value: boolean) => void;
  removeStandardCategory: (index: number) => Promise<void>;
  removeCustomCategory: (index: number) => Promise<void>;
  selectedSkillsCategory: DashboardSkill | null;
  isInSubcategories?: boolean;
  setIsInSubcategories?: (value: boolean) => void;
  onSkillsCategoryBackHandlerSet?: (handler: () => void) => void;
  viewedUserId?: number | null;
  viewedUserSummary?: SearchUserResult | null;
  onViewUserProfile?: (userId: number, slug?: string | null, summary?: SearchUserResult) => void;
  highlightedSkillId?: number | null;
  onViewUserSkillFromSearch?: (userId: number, skillId: number, slug?: string | null) => void;
  initialProfileTab?: import('./modules/profile/profileTypes').ProfileTab;
}

export default function ModuleRouter({
  user,
  activeModule,
  activeRightItem,
  isRightSidebarOpen,
  accountType,
  onUserUpdate,
  handleRightSidebarToggle,
  setActiveModule,
  setIsSkillsCategoryModalOpen,
  setSelectedSkillsCategory,
  setIsSkillDescriptionModalOpen,
  setIsAddCustomCategoryModalOpen,
  setEditingCustomCategoryIndex,
  setEditingStandardCategoryIndex,
  standardCategories,
  customCategories,
  setAccountType,
  setIsAccountTypeModalOpen,
  setIsPersonalAccountModalOpen,
  removeStandardCategory,
  removeCustomCategory,
  selectedSkillsCategory,
  isInSubcategories,
  setIsInSubcategories,
  onSkillsCategoryBackHandlerSet,
  viewedUserId,
  viewedUserSummary,
  onViewUserProfile,
  highlightedSkillId,
  onViewUserSkillFromSearch,
  initialProfileTab,
}: ModuleRouterProps) {
  const { t } = useLanguage();

  if (isRightSidebarOpen && activeRightItem === 'edit-profile') {
    return (
      <ProfileModule
        user={user}
        onUserUpdate={onUserUpdate}
        onEditProfileClick={handleRightSidebarToggle}
        onSkillsClick={() => {
          setActiveModule('skills');
          try {
            localStorage.setItem('activeModule', 'skills');
          } catch {
            // ignore
          }
        }}
        isEditMode={true}
        accountType={accountType}
      />
    );
  }

  if (isRightSidebarOpen && activeRightItem === 'notifications') {
    return <NotificationsModule />;
  }

  if (isRightSidebarOpen && activeRightItem === 'language') {
    return <LanguageModule />;
  }

  if (isRightSidebarOpen && activeRightItem === 'account-type') {
    return (
      <AccountTypeModule
        accountType={accountType}
        setAccountType={setAccountType}
        setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
        setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
      />
    );
  }

  if (isRightSidebarOpen && activeRightItem === 'privacy') {
    return <PrivacySettingsModule user={user} onUserUpdate={onUserUpdate} />;
  }

  switch (activeModule) {
    case 'home':
      return (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">
            {t('dashboard.welcomeToSwaply', 'Vitaj v Swaply!')}
          </h2>
          <p className="text-gray-500">
            {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
          </p>
        </div>
      );
    case 'user-profile':
      if (!viewedUserId) {
        return (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            {t('search.userProfileNotFound', 'Profil používateľa sa nepodarilo načítať.')}
          </div>
        );
      }
      return (
        <SearchUserProfileModule
          userId={viewedUserId}
          initialSummary={viewedUserSummary ?? undefined}
          initialTab={initialProfileTab}
          highlightedSkillId={highlightedSkillId ?? null}
          onBack={() => {
            setActiveModule('search');
            try {
              localStorage.setItem('activeModule', 'search');
            } catch {
              // ignore
            }
          }}
          onSendMessage={() => {
            setActiveModule('messages');
            try {
              localStorage.setItem('activeModule', 'messages');
            } catch {
              // ignore
            }
          }}
        />
      );
    case 'profile':
      return (
        <ProfileModule
          user={user}
          onUserUpdate={onUserUpdate}
          onEditProfileClick={handleRightSidebarToggle}
          onSkillsClick={() => {
            setActiveModule('skills');
            try {
              localStorage.setItem('activeModule', 'skills');
            } catch {
              // ignore
            }
          }}
          isEditMode={isRightSidebarOpen}
          accountType={accountType}
        />
      );
    case 'search':
      return (
        <SearchModule
          user={user}
          onUserClick={onViewUserProfile}
          onSkillClick={onViewUserSkillFromSearch}
        />
      );
    case 'favorites':
      return (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">
            {t('navigation.favorites', 'Obľúbené')}
          </h2>
          <p className="text-gray-500">
            {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
          </p>
        </div>
      );
    case 'settings':
      return (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">
            {t('navigation.settings', 'Nastavenia')}
          </h2>
          <p className="text-gray-500">
            {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
          </p>
        </div>
      );
    case 'create':
      return <CreateModule />;
    case 'messages':
      return <MessagesModule />;
    case 'notifications':
      return <NotificationsModule />;
    case 'language':
      return <LanguageModule />;
    case 'skills':
    case 'skills-offer':
    case 'skills-search':
    case 'skills-describe':
    case 'skills-select-category':
    case 'skills-add-custom-category':
      return (
        <SkillsModuleRouter
          activeModule={activeModule}
          accountType={accountType}
          standardCategories={standardCategories}
          customCategories={customCategories}
          selectedSkillsCategory={selectedSkillsCategory}
          setActiveModule={setActiveModule}
          setIsSkillsCategoryModalOpen={setIsSkillsCategoryModalOpen}
          setSelectedSkillsCategory={setSelectedSkillsCategory}
          setIsSkillDescriptionModalOpen={setIsSkillDescriptionModalOpen}
          setIsAddCustomCategoryModalOpen={setIsAddCustomCategoryModalOpen}
          setEditingCustomCategoryIndex={setEditingCustomCategoryIndex}
          setEditingStandardCategoryIndex={setEditingStandardCategoryIndex}
          removeStandardCategory={removeStandardCategory}
          removeCustomCategory={removeCustomCategory}
          setIsInSubcategories={setIsInSubcategories}
          onSkillsCategoryBackHandlerSet={onSkillsCategoryBackHandlerSet}
        />
      );
    case 'account-type':
      return (
        <AccountTypeSection
          accountType={accountType}
          setAccountType={setAccountType}
          setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
          setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
        />
      );
    case 'privacy':
      return (
        <PrivacySettingsMobileSection
          user={user}
          onUserUpdate={onUserUpdate}
        />
      );
    default:
      return (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">
            {t('dashboard.welcomeToSwaply', 'Vitaj v Swaply!')}
          </h2>
          <p className="text-gray-500">
            {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
          </p>
        </div>
      );
  }
}


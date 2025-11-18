'use client';

import React from 'react';
import type { User } from '../../types';
import ProfileModule from './modules/ProfileModule';
import NotificationsModule from './modules/NotificationsModule';
import LanguageModule from './modules/LanguageModule';
import AccountTypeModule from './modules/AccountTypeModule';
import SkillsHome from './modules/skills/SkillsHome';
import SkillsScreen from './modules/skills/SkillsScreen';
import SearchModule from './modules/SearchModule';
import CreateModule from './modules/CreateModule';
import MessagesModule from './modules/MessagesModule';
import AccountTypeSection from './modules/accountType/AccountTypeSection';
import type { DashboardSkill } from './hooks/useSkillsModals';
import { useLanguage } from '@/contexts/LanguageContext';

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
      return <SearchModule />;
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
      return (
        <SkillsHome
          onOffer={() => {
            setActiveModule('skills-offer');
            try {
              localStorage.setItem('activeModule', 'skills-offer');
            } catch {
              // ignore
            }
          }}
          onSearch={() => {
            setActiveModule('skills-search');
            try {
              localStorage.setItem('activeModule', 'skills-search');
            } catch {
              // ignore
            }
          }}
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
    case 'skills-offer':
      return (
        <SkillsScreen
          title={t('skills.offerSelectAreaTitle', 'Zvoľ oblasť, v ktorej vynikáš alebo ponúkaš svoje služby.')}
          firstOptionText={t('skills.selectCategoryTitle', 'Vyber kategóriu')}
          onFirstOptionClick={() => {
            if (standardCategories.length >= 5) {
              alert('Môžeš mať maximálne 5 výberov z kategórií.');
              return;
            }
            setIsSkillsCategoryModalOpen(true);
          }}
          standardCategories={standardCategories}
          onRemoveStandardCategory={async (index) => {
            await removeStandardCategory(index);
          }}
          onEditStandardCategoryDescription={(index) => {
            setEditingStandardCategoryIndex(index);
            setSelectedSkillsCategory(standardCategories[index]);
            setIsSkillDescriptionModalOpen(true);
          }}
          onAddCategory={() => {
            if (customCategories.length >= 5) {
              alert('Môžeš pridať maximálne 5 vlastných kategórií.');
              return;
            }
            setIsAddCustomCategoryModalOpen(true);
          }}
          customCategories={customCategories}
          onRemoveCustomCategory={async (index) => {
            await removeCustomCategory(index);
          }}
          onEditCustomCategoryDescription={(index) => {
            setEditingCustomCategoryIndex(index);
            setSelectedSkillsCategory(customCategories[index]);
            setIsSkillDescriptionModalOpen(true);
          }}
        />
      );
    case 'skills-search':
      return <SkillsScreen title="Hľadám" />;
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


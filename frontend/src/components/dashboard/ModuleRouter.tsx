'use client';

import React from 'react';
import type { User } from '../../types';
import type { SearchUserResult } from './modules/search/types';
import ProfileModule from './modules/ProfileModule';
import NotificationsModule from './modules/NotificationsModule';
import NotificationSettingsModule from './modules/NotificationSettingsModule';
import LanguageModule from './modules/LanguageModule';
import AccountTypeModule from './modules/AccountTypeModule';
import AccountSettingsModule, { type AccountSettingsMobileView } from './modules/AccountSettingsModule';
import PrivacySettingsModule from './modules/PrivacySettingsModule';
import PrivacySettingsMobileSection from './modules/PrivacySettingsMobileSection';
import BlockedUsersModule from './modules/BlockedUsersModule';
import SkillsModuleRouter from './modules/skills/SkillsModuleRouter';
import SearchModule from './modules/SearchModule';
import CreateModule from './modules/CreateModule';
import FavoritesModule from './modules/FavoritesModule';
import MessagesModule from './modules/MessagesModule';
import RequestsModule from './modules/RequestsModule';
import AccountTypeSection from './modules/accountType/AccountTypeSection';
import type { RequestsRouteIntent } from './modules/requests/requestsRouting';
import type { DashboardSkill } from './hooks/useSkillsModals';
import type { Offer } from './modules/profile/profileOffersTypes';
import { useLanguage } from '@/contexts/LanguageContext';
import { SearchUserProfileModule } from './modules/search/SearchUserProfileModule';
import OfferReviewsView from './modules/reviews/OfferReviewsView';
import PortfolioDetailModule from './modules/profile/PortfolioDetailModule';
import { PortfolioCreateScreen } from './modules/profile/PortfolioCreateScreen';

interface ModuleRouterProps {
  user: User;
  activeModule: string;
  activeRightItem: string;
  isRightSidebarOpen: boolean;
  accountType: 'personal' | 'business';
  onUserUpdate: (updatedUserOrUpdater: User | ((prev: User | null) => User | null)) => void;
  handleRightSidebarToggle: () => void;
  closeOwnProfileEdit: (targetUser?: Pick<User, 'id' | 'slug'> | null) => void;
  setActiveModule: (module: string) => void;
  setIsSkillsCategoryModalOpen: (value: boolean) => void;
  setSelectedSkillsCategory: React.Dispatch<React.SetStateAction<DashboardSkill | null>>;
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
  viewedUserSlug?: string | null;
  viewedUserNotFound?: boolean;
  viewedUserSummary?: SearchUserResult | null;
  onEditProfileClick?: () => void;
  onViewUserProfile?: (userId: number, slug?: string | null, summary?: SearchUserResult) => void;
  highlightedSkillId?: number | null;
  onViewUserSkillFromSearch?: (userId: number, skillId: number, slug?: string | null) => void;
  initialProfileTab?: import('./modules/profile/profileTypes').ProfileTab;
  ownProfileTab?: import('./modules/profile/profileTypes').ProfileTab;
  onOwnProfileTabChange?: (tab: import('./modules/profile/profileTypes').ProfileTab) => void;
  onSkillsClick?: () => void;
  onSkillsOfferClick?: () => void;
  onSkillsSearchClick?: () => void;
  onSkillsModeToggle?: () => void;
  /** ID karty (ponuky) pre view recenzií. */
  offerIdForReviews?: number | null;
  portfolioItemIdForDetail?: number | null;
  portfolioOwnerIdentifier?: string | null;
  portfolioCreateOwnerIdentifier?: string | null;
  onCreatePortfolio?: () => void;
  /** Conversation ID for messages detail view (from URL). */
  conversationIdForMessages?: number | null;
  /** Target user ID for draft compose flow (from URL). */
  targetUserIdForMessages?: number | null;
  onNotificationNavigate?: (targetUrl: string) => void;
  requestsRouteIntent?: RequestsRouteIntent | null;
  onEditOwnProfileOffer?: (offer: Offer) => void;
  onDeleteOwnProfileOffer?: (offer: Offer) => void;
  mobileAccountSettingsView?: AccountSettingsMobileView;
  onMobileAccountSettingsViewChange?: (view: AccountSettingsMobileView) => void;
}

export default function ModuleRouter({
  user,
  activeModule,
  activeRightItem,
  isRightSidebarOpen,
  accountType,
  onUserUpdate,
  handleRightSidebarToggle,
  closeOwnProfileEdit,
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
  setIsInSubcategories,
  onSkillsCategoryBackHandlerSet,
  viewedUserId,
  viewedUserSlug,
  viewedUserNotFound,
  viewedUserSummary,
  onEditProfileClick,
  onViewUserProfile,
  highlightedSkillId,
  onViewUserSkillFromSearch,
  initialProfileTab,
  ownProfileTab,
  onOwnProfileTabChange,
  onSkillsClick,
  onSkillsOfferClick,
  onSkillsSearchClick,
  onSkillsModeToggle,
  offerIdForReviews,
  portfolioItemIdForDetail,
  portfolioOwnerIdentifier,
  portfolioCreateOwnerIdentifier,
  onCreatePortfolio,
  conversationIdForMessages,
  targetUserIdForMessages,
  onNotificationNavigate,
  requestsRouteIntent,
  onEditOwnProfileOffer,
  onDeleteOwnProfileOffer,
  mobileAccountSettingsView,
  onMobileAccountSettingsViewChange,
}: ModuleRouterProps) {
  const { t } = useLanguage();

  if (isRightSidebarOpen && activeRightItem === 'notifications') {
    return <NotificationSettingsModule onBack={closeOwnProfileEdit} />;
  }

  if (isRightSidebarOpen && activeRightItem === 'language') {
    return <LanguageModule onBack={closeOwnProfileEdit} />;
  }

  if (isRightSidebarOpen && activeRightItem === 'account-type') {
    return (
      <AccountTypeModule
        accountType={accountType}
        setAccountType={setAccountType}
        setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
        setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
        onBack={closeOwnProfileEdit}
      />
    );
  }

  if (isRightSidebarOpen && activeRightItem === 'privacy') {
    return <PrivacySettingsModule user={user} onUserUpdate={onUserUpdate} onBack={closeOwnProfileEdit} />;
  }

  if (isRightSidebarOpen && activeRightItem === 'account-settings') {
    return (
      <AccountSettingsModule
        user={user}
        onBack={closeOwnProfileEdit}
        mobileView={mobileAccountSettingsView}
        onMobileViewChange={onMobileAccountSettingsViewChange}
      />
    );
  }

  if (isRightSidebarOpen && activeRightItem === 'blocked-users') {
    return <BlockedUsersModule onBack={closeOwnProfileEdit} />;
  }

  switch (activeModule) {
    case 'offer-reviews':
      return <OfferReviewsView offerId={offerIdForReviews ?? null} accountType={accountType} user={user} />;
    case 'portfolio-detail':
      return (
        <PortfolioDetailModule
          itemId={portfolioItemIdForDetail ?? null}
          ownerIdentifier={portfolioOwnerIdentifier}
        />
      );
    case 'portfolio-create':
      return (
        <PortfolioCreateScreen
          user={user}
          ownerIdentifier={portfolioCreateOwnerIdentifier ?? null}
        />
      );
    case 'home':
      return (
        <div className="text-center py-20" data-onboarding="home-content">
          <h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-4">
            {t('dashboard.welcomeToSwaply', 'Vitaj v Svaply!')}
          </h2>
          <p className="text-gray-500 dark:text-gray-500">
            {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
          </p>
        </div>
      );
    case 'user-profile':
      if (!viewedUserId) {
        // Zmazaný/neexistujúci profil (404) → hláška namiesto nekonečného loadingu.
        const showLoading = Boolean(viewedUserSlug) && !viewedUserNotFound;
        return (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            {showLoading
              ? t('search.loadingUserProfile', 'Načítavam profil...')
              : t('search.userProfileNotFound', 'Profil používateľa sa nepodarilo načítať.')}
          </div>
        );
      }
      return (
        <SearchUserProfileModule
          userId={viewedUserId}
          currentUserId={user.id}
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
          onEditProfileClick={onEditProfileClick ?? handleRightSidebarToggle}
          onEditCancel={closeOwnProfileEdit}
          onSkillsClick={onSkillsClick || (() => {
            setActiveModule('skills');
            try {
              localStorage.setItem('activeModule', 'skills');
            } catch {
              // ignore
            }
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/dashboard/skills');
            }
          })}
          isEditMode={isRightSidebarOpen && activeRightItem === 'edit-profile'}
          accountType={accountType}
          highlightedSkillId={highlightedSkillId ?? null}
          initialTab={ownProfileTab ?? initialProfileTab}
          onTabChange={onOwnProfileTabChange}
          onEditOffer={onEditOwnProfileOffer}
          onDeleteOffer={onDeleteOwnProfileOffer}
          onCreatePortfolio={onCreatePortfolio}
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
      return <FavoritesModule />;
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
      return (
        <MessagesModule
          conversationId={conversationIdForMessages ?? null}
          targetUserId={targetUserIdForMessages ?? null}
          currentUserId={user.id}
        />
      );
    case 'requests':
      return <RequestsModule routeIntent={requestsRouteIntent} />;
    case 'notifications':
      return <NotificationsModule onNavigate={onNotificationNavigate} />;
    case 'notification-settings':
      return <NotificationSettingsModule />;
    case 'account-settings':
      return (
        <AccountSettingsModule
          user={user}
          mobileView={mobileAccountSettingsView}
          onMobileViewChange={onMobileAccountSettingsViewChange}
        />
      );
    case 'blocked-users':
      return <BlockedUsersModule />;
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
          onSkillsOfferClick={onSkillsOfferClick}
          onSkillsSearchClick={onSkillsSearchClick}
          onSkillsModeToggle={onSkillsModeToggle}
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
            {t('dashboard.welcomeToSwaply', 'Vitaj v Svaply!')}
          </h2>
          <p className="text-gray-500">
            {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
          </p>
        </div>
      );
  }
}


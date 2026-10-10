'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { User } from '@/types';
import ModuleRouter from '../ModuleRouter';
import type { UseDashboardStateResult } from '../hooks/useDashboardState';
import type { DashboardHighlightingProps } from '../hooks/useDashboardHighlighting';
import type { DashboardNavigationProps } from '../hooks/useDashboardNavigation';
import type { DashboardUserProfileProps } from '../hooks/useDashboardUserProfile';
import type { UseSkillsModalsResult } from '../hooks/useSkillsModals';
import type { AccountSettingsMobileView } from '../modules/AccountSettingsModule';
import type { Offer } from '../modules/profile/profileOffersTypes';
import type { ProfileTab } from '../modules/profile/profileTypes';
import type { RequestsRouteIntent } from '../modules/requests/requestsRouting';

export type DashboardModuleContentProps = {
  user: User;
  activeModule: string;
  activeRightItem: string;
  isRightSidebarOpen: boolean;
  accountType: UseDashboardStateResult['accountType'];
  handleUserUpdate: UseDashboardStateResult['handleUserUpdate'];
  handleRightSidebarToggle: UseDashboardStateResult['handleRightSidebarToggle'];
  closeOwnProfileEdit: UseDashboardStateResult['closeOwnProfileEdit'];
  setActiveModule: UseDashboardStateResult['setActiveModule'];
  setIsSkillsCategoryModalOpen: UseSkillsModalsResult['setIsSkillsCategoryModalOpen'];
  setSelectedSkillsCategory: UseSkillsModalsResult['setSelectedSkillsCategory'];
  setIsSkillDescriptionModalOpen: UseSkillsModalsResult['setIsSkillDescriptionModalOpen'];
  setIsAddCustomCategoryModalOpen: UseSkillsModalsResult['setIsAddCustomCategoryModalOpen'];
  setEditingCustomCategoryIndex: UseSkillsModalsResult['setEditingCustomCategoryIndex'];
  setEditingStandardCategoryIndex: UseSkillsModalsResult['setEditingStandardCategoryIndex'];
  standardCategories: UseSkillsModalsResult['standardCategories'];
  customCategories: UseSkillsModalsResult['customCategories'];
  setAccountType: UseDashboardStateResult['setAccountType'];
  setIsAccountTypeModalOpen: UseDashboardStateResult['setIsAccountTypeModalOpen'];
  setIsPersonalAccountModalOpen: UseDashboardStateResult['setIsPersonalAccountModalOpen'];
  removeStandardCategory: UseSkillsModalsResult['removeStandardCategory'];
  removeCustomCategory: UseSkillsModalsResult['removeCustomCategory'];
  selectedSkillsCategory: UseSkillsModalsResult['selectedSkillsCategory'];
  isInSubcategories: boolean;
  setIsInSubcategories: Dispatch<SetStateAction<boolean>>;
  skillsCategoryBackHandlerRef: MutableRefObject<(() => void) | null>;
  userProfile: Pick<
    DashboardUserProfileProps,
    | 'viewedUserId'
    | 'viewedUserSlug'
    | 'viewedUserNotFound'
    | 'viewedUserLoadError'
    | 'retryViewedUserLoad'
    | 'viewedUserSummary'
  >;
  navigation: Pick<
    DashboardNavigationProps,
    | 'handleEditProfileClick'
    | 'handleViewUserProfileFromSearch'
    | 'handleViewUserSkillFromSearch'
    | 'handleSkillsOfferClick'
    | 'handleSkillsSearchClick'
  >;
  highlighting: Pick<DashboardHighlightingProps, 'highlightedSkillId'>;
  initialProfileTab: ProfileTab | undefined;
  ownProfileTab: ProfileTab;
  setOwnProfileTab: Dispatch<SetStateAction<ProfileTab>>;
  handleProfileSkillsClick: () => void;
  handleSkillsModeToggle: () => void;
  effectiveOfferIdForReviews: number | null;
  effectiveFeedPostId: number | null;
  effectivePortfolioItemId: number | null;
  effectivePortfolioOwnerIdentifier: string | null;
  effectivePortfolioCreateOwnerIdentifier: string | null;
  handleCreatePortfolio: () => void;
  selectedConversationId: number | null;
  targetUserIdFromMessagesQuery: number | null;
  handleNotificationNavigate: (targetUrl: string) => void;
  requestsRouteIntent: RequestsRouteIntent | null;
  handleEditOwnProfileOffer: (offer: Offer) => Promise<void>;
  handleDeleteOwnProfileOffer: (offer: Offer) => void;
  mobileAccountSettingsView: AccountSettingsMobileView;
  setMobileAccountSettingsView: Dispatch<SetStateAction<AccountSettingsMobileView>>;
  handleManageOfferWatches: () => void;
};

/** Obsah aktívneho modulu: ModuleRouter s hodnotami zo stavu dashboardu. */
export default function DashboardModuleContent({
  user,
  activeModule,
  activeRightItem,
  isRightSidebarOpen,
  accountType,
  handleUserUpdate,
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
  isInSubcategories,
  setIsInSubcategories,
  skillsCategoryBackHandlerRef,
  userProfile,
  navigation,
  highlighting,
  initialProfileTab,
  ownProfileTab,
  setOwnProfileTab,
  handleProfileSkillsClick,
  handleSkillsModeToggle,
  effectiveOfferIdForReviews,
  effectiveFeedPostId,
  effectivePortfolioItemId,
  effectivePortfolioOwnerIdentifier,
  effectivePortfolioCreateOwnerIdentifier,
  handleCreatePortfolio,
  selectedConversationId,
  targetUserIdFromMessagesQuery,
  handleNotificationNavigate,
  requestsRouteIntent,
  handleEditOwnProfileOffer,
  handleDeleteOwnProfileOffer,
  mobileAccountSettingsView,
  setMobileAccountSettingsView,
  handleManageOfferWatches,
}: DashboardModuleContentProps) {
  return (
    <ModuleRouter
      user={user}
      activeModule={activeModule}
      activeRightItem={activeRightItem}
      isRightSidebarOpen={isRightSidebarOpen}
      accountType={accountType}
      onUserUpdate={handleUserUpdate}
      handleRightSidebarToggle={handleRightSidebarToggle}
      closeOwnProfileEdit={closeOwnProfileEdit}
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
      viewedUserNotFound={userProfile.viewedUserNotFound}
      viewedUserLoadError={userProfile.viewedUserLoadError}
      onRetryViewedUserLoad={userProfile.retryViewedUserLoad}
      viewedUserSummary={userProfile.viewedUserSummary}
      onEditProfileClick={navigation.handleEditProfileClick}
      onViewUserProfile={navigation.handleViewUserProfileFromSearch}
      highlightedSkillId={highlighting.highlightedSkillId}
      onViewUserSkillFromSearch={navigation.handleViewUserSkillFromSearch}
      initialProfileTab={initialProfileTab}
      ownProfileTab={ownProfileTab}
      onOwnProfileTabChange={setOwnProfileTab}
      onSkillsClick={handleProfileSkillsClick}
      onSkillsOfferClick={navigation.handleSkillsOfferClick}
      onSkillsSearchClick={navigation.handleSkillsSearchClick}
      onSkillsModeToggle={handleSkillsModeToggle}
      offerIdForReviews={effectiveOfferIdForReviews}
      feedPostIdForDetail={effectiveFeedPostId}
      portfolioItemIdForDetail={
        effectivePortfolioItemId != null && Number.isFinite(effectivePortfolioItemId)
          ? effectivePortfolioItemId
          : null
      }
      portfolioOwnerIdentifier={effectivePortfolioOwnerIdentifier}
      portfolioCreateOwnerIdentifier={effectivePortfolioCreateOwnerIdentifier}
      onCreatePortfolio={handleCreatePortfolio}
      conversationIdForMessages={
        selectedConversationId != null && Number.isFinite(selectedConversationId) ? selectedConversationId : null
      }
      targetUserIdForMessages={
        targetUserIdFromMessagesQuery != null && Number.isFinite(targetUserIdFromMessagesQuery)
          ? targetUserIdFromMessagesQuery
          : null
      }
      onNotificationNavigate={handleNotificationNavigate}
      requestsRouteIntent={requestsRouteIntent}
      onEditOwnProfileOffer={handleEditOwnProfileOffer}
      onDeleteOwnProfileOffer={handleDeleteOwnProfileOffer}
      mobileAccountSettingsView={mobileAccountSettingsView}
      onMobileAccountSettingsViewChange={setMobileAccountSettingsView}
      onManageOfferWatches={handleManageOfferWatches}
    />
  );
}

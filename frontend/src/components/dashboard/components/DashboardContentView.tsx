'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { User } from '@/types';
import DashboardLayout from '../DashboardLayout';
import DashboardModals from '../DashboardModals';
import {
  FeedPostOverlayProvider,
  type FeedPostOverlayCloseOptions,
  type FeedPostOverlayTarget,
} from '../contexts/FeedPostOverlayContext';
import { RequestsNotificationsProvider } from '../contexts/RequestsNotificationsContext';
import type { UseDashboardStateResult } from '../hooks/useDashboardState';
import type { DashboardNavigationProps } from '../hooks/useDashboardNavigation';
import type { DashboardUserProfileProps } from '../hooks/useDashboardUserProfile';
import type { UseSkillsModalsResult } from '../hooks/useSkillsModals';
import type { AccountSettingsMobileView } from '../modules/AccountSettingsModule';
import FeedPostDetailOverlay from '../modules/feed/FeedPostDetailOverlay';
import { MessagesDesktopRail } from '../modules/messages/MessagesDesktopRail';
import type { MessagingUserBrief } from '../modules/messages/types';
import NotificationsFeed from '../modules/notifications/NotificationsFeed';
import type { Offer } from '../modules/profile/profileOffersTypes';
import SearchModule from '../modules/SearchModule';
import { DeleteSkillConfirmModal } from '../modules/skills/DeleteSkillConfirmModal';
import { DesktopOnboardingProvider } from '../onboarding/DesktopOnboardingContext';
import DesktopOnboardingOverlay from '../onboarding/DesktopOnboardingOverlay';
import { MobileOnboardingProvider } from '../onboarding/MobileOnboardingContext';
import MobileOnboardingOverlay from '../onboarding/MobileOnboardingOverlay';
import OnboardingScrollLock from '../onboarding/OnboardingScrollLock';

export type DashboardContentViewProps = {
  activeModule: string;
  isNotificationsPanelOpen: boolean;
  handleFeedOverlayTargetChange: (target: FeedPostOverlayTarget | null, options?: FeedPostOverlayCloseOptions) => void;
  isSearchOpen: boolean;
  isProfileEditMode: boolean;
  isRightSidebarOpen: boolean;
  showMobileSettingsList: boolean;
  handleOnboardingHomeOpen: () => void;
  handleDesktopOnboardingProfileOpen: () => void;
  navigation: Pick<
    DashboardNavigationProps,
    | 'handleEditProfileClick'
    | 'handleRightSidebarClose'
    | 'handleSidebarLanguageClick'
    | 'handleSidebarAccountTypeClick'
    | 'handleSidebarAccountSettingsClick'
    | 'handleSidebarPrivacyClick'
    | 'handleSearchClose'
    | 'handleViewUserProfileFromSearch'
    | 'handleViewUserSkillFromSearch'
  >;
  handleDesktopOnboardingSearchOpen: () => void;
  handleDesktopOnboardingSearchClose: () => void;
  handleDesktopOnboardingRequestsOpen: () => void;
  handleOnboardingMessagesOpen: () => void;
  handleDesktopOnboardingSkillCreatedHandlerSet: (handler: (() => void) | null) => void;
  user: User;
  isMobileOnboardingBlocked: boolean;
  handleMobileProfileOpen: () => void;
  handleOnboardingSearchOpen: () => void;
  handleOnboardingRequestsOpen: () => void;
  handleMobileOnboardingSkillCreatedHandlerSet: (handler: (() => void) | null) => void;
  activeRightItem: string;
  userProfile: Pick<DashboardUserProfileProps, 'viewedUserNotFound' | 'viewedUserLoadError'>;
  handleDashboardModuleChange: (moduleId: string) => void;
  handleLogout: UseDashboardStateResult['handleLogout'];
  handleRightItemClick: UseDashboardStateResult['handleRightItemClick'];
  handleMobileSettingsOpen: () => void;
  handleMobileSettingsClose: () => void;
  handleSkillsCategoryBack: () => void;
  handleSkillsDescribeMobileBack: () => void;
  handleOfferReviewsBack: () => void;
  handlePortfolioDetailBack: () => void;
  handleAccountSettingsMobileBack: () => void;
  handleMobileBack: UseDashboardStateResult['handleMobileBack'];
  handleSkillsModeToggle: () => void;
  handleSidebarSearchClick: () => void;
  handleSidebarNotificationsClick: () => void;
  handleNotificationsPanelClose: () => void;
  handleNotificationNavigate: (targetUrl: string) => void;
  selectedConversationId: number | null;
  selectedSkillsCategory: UseSkillsModalsResult['selectedSkillsCategory'];
  handleSkillSave: () => Promise<void>;
  mobileAccountName: string;
  mobileMessageTitle: string | undefined;
  mobileMessageAvatarUrl: string | null;
  mobileMessageGroup: { name: string; avatarMembers: MessagingUserBrief[] } | null;
  mobileMessagePeerIdentifier: string | null;
  isMobileMessageConversationOpen: boolean;
  handleMobileMessagesBack: () => void;
  showMobileOfferDetailTopBar: boolean;
  mobileAccountSettingsView: AccountSettingsMobileView;
  moduleContent: ReactNode;
  accountType: UseDashboardStateResult['accountType'];
  setAccountType: UseDashboardStateResult['setAccountType'];
  isAccountTypeModalOpen: boolean;
  setIsAccountTypeModalOpen: UseDashboardStateResult['setIsAccountTypeModalOpen'];
  isPersonalAccountModalOpen: boolean;
  setIsPersonalAccountModalOpen: UseDashboardStateResult['setIsPersonalAccountModalOpen'];
  dashboardState: Pick<UseDashboardStateResult, 'handleUserUpdate'>;
  setSelectedSkillsCategory: UseSkillsModalsResult['setSelectedSkillsCategory'];
  standardCategories: UseSkillsModalsResult['standardCategories'];
  setStandardCategories: UseSkillsModalsResult['setStandardCategories'];
  customCategories: UseSkillsModalsResult['customCategories'];
  setCustomCategories: UseSkillsModalsResult['setCustomCategories'];
  isSkillsCategoryModalOpen: UseSkillsModalsResult['isSkillsCategoryModalOpen'];
  setIsSkillsCategoryModalOpen: UseSkillsModalsResult['setIsSkillsCategoryModalOpen'];
  isSkillDescriptionModalOpen: UseSkillsModalsResult['isSkillDescriptionModalOpen'];
  setIsSkillDescriptionModalOpen: UseSkillsModalsResult['setIsSkillDescriptionModalOpen'];
  isAddCustomCategoryModalOpen: UseSkillsModalsResult['isAddCustomCategoryModalOpen'];
  setIsAddCustomCategoryModalOpen: UseSkillsModalsResult['setIsAddCustomCategoryModalOpen'];
  editingCustomCategoryIndex: UseSkillsModalsResult['editingCustomCategoryIndex'];
  setEditingCustomCategoryIndex: UseSkillsModalsResult['setEditingCustomCategoryIndex'];
  editingStandardCategoryIndex: UseSkillsModalsResult['editingStandardCategoryIndex'];
  setEditingStandardCategoryIndex: UseSkillsModalsResult['setEditingStandardCategoryIndex'];
  toLocalSkill: UseSkillsModalsResult['toLocalSkill'];
  applySkillUpdate: UseSkillsModalsResult['applySkillUpdate'];
  loadSkills: UseSkillsModalsResult['loadSkills'];
  fetchSkillDetail: UseSkillsModalsResult['fetchSkillDetail'];
  handleRemoveSkillImage: UseSkillsModalsResult['handleRemoveSkillImage'];
  removeStandardCategory: UseSkillsModalsResult['removeStandardCategory'];
  removeCustomCategory: UseSkillsModalsResult['removeCustomCategory'];
  t: (key: string, fallback?: string) => string;
  handleOnboardingSkillCreated: () => void;
  pendingDeleteOffer: Offer | null;
  isDeletingOwnProfileOffer: boolean;
  setPendingDeleteOffer: Dispatch<SetStateAction<Offer | null>>;
  handleConfirmDeleteOwnProfileOffer: () => Promise<void>;
  feedOverlayTarget: FeedPostOverlayTarget | null;
};

/** Vykreslenie dashboardu: providery, rozloženie, modály a okno príspevku nad celou appkou. */
export default function DashboardContentView({
  activeModule,
  isNotificationsPanelOpen,
  handleFeedOverlayTargetChange,
  isSearchOpen,
  isProfileEditMode,
  isRightSidebarOpen,
  showMobileSettingsList,
  handleOnboardingHomeOpen,
  handleDesktopOnboardingProfileOpen,
  navigation,
  handleDesktopOnboardingSearchOpen,
  handleDesktopOnboardingSearchClose,
  handleDesktopOnboardingRequestsOpen,
  handleOnboardingMessagesOpen,
  handleDesktopOnboardingSkillCreatedHandlerSet,
  user,
  isMobileOnboardingBlocked,
  handleMobileProfileOpen,
  handleOnboardingSearchOpen,
  handleOnboardingRequestsOpen,
  handleMobileOnboardingSkillCreatedHandlerSet,
  activeRightItem,
  userProfile,
  handleDashboardModuleChange,
  handleLogout,
  handleRightItemClick,
  handleMobileSettingsOpen,
  handleMobileSettingsClose,
  handleSkillsCategoryBack,
  handleSkillsDescribeMobileBack,
  handleOfferReviewsBack,
  handlePortfolioDetailBack,
  handleAccountSettingsMobileBack,
  handleMobileBack,
  handleSkillsModeToggle,
  handleSidebarSearchClick,
  handleSidebarNotificationsClick,
  handleNotificationsPanelClose,
  handleNotificationNavigate,
  selectedConversationId,
  selectedSkillsCategory,
  handleSkillSave,
  mobileAccountName,
  mobileMessageTitle,
  mobileMessageAvatarUrl,
  mobileMessageGroup,
  mobileMessagePeerIdentifier,
  isMobileMessageConversationOpen,
  handleMobileMessagesBack,
  showMobileOfferDetailTopBar,
  mobileAccountSettingsView,
  moduleContent,
  accountType,
  setAccountType,
  isAccountTypeModalOpen,
  setIsAccountTypeModalOpen,
  isPersonalAccountModalOpen,
  setIsPersonalAccountModalOpen,
  dashboardState,
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
  t,
  handleOnboardingSkillCreated,
  pendingDeleteOffer,
  isDeletingOwnProfileOffer,
  setPendingDeleteOffer,
  handleConfirmDeleteOwnProfileOffer,
  feedOverlayTarget,
}: DashboardContentViewProps) {
  return (
    <RequestsNotificationsProvider
      acknowledgeNotificationsBadge={activeModule === 'notifications' || isNotificationsPanelOpen}
      acknowledgeMessagesBadge={activeModule === 'messages'}
    >
      <FeedPostOverlayProvider onTargetChange={handleFeedOverlayTargetChange}>
      <DesktopOnboardingProvider
        activeModule={activeModule}
        isSearchOpen={isSearchOpen}
        isProfileEditMode={isProfileEditMode}
        isRightSidebarOpen={isRightSidebarOpen}
        isNotificationsPanelOpen={isNotificationsPanelOpen}
        isMobileMenuOpen={showMobileSettingsList}
        onOpenHome={handleOnboardingHomeOpen}
        onOpenProfile={handleDesktopOnboardingProfileOpen}
        onOpenEditProfile={navigation.handleEditProfileClick}
        onOpenSearch={handleDesktopOnboardingSearchOpen}
        onCloseSearch={handleDesktopOnboardingSearchClose}
        onOpenRequests={handleDesktopOnboardingRequestsOpen}
        onOpenMessages={handleOnboardingMessagesOpen}
        onSkillCreatedHandlerSet={handleDesktopOnboardingSkillCreatedHandlerSet}
        serverState={user?.desktop_onboarding ?? null}
      >
        <MobileOnboardingProvider
          activeModule={activeModule}
          isProfileEditMode={isProfileEditMode}
          isBlockedByUi={isMobileOnboardingBlocked}
          onOpenHome={handleOnboardingHomeOpen}
          onOpenProfile={handleMobileProfileOpen}
          onOpenEditProfile={navigation.handleEditProfileClick}
          onOpenSearch={handleOnboardingSearchOpen}
          onOpenRequests={handleOnboardingRequestsOpen}
          onOpenMessages={handleOnboardingMessagesOpen}
          onSkillCreatedHandlerSet={handleMobileOnboardingSkillCreatedHandlerSet}
          serverState={user?.mobile_onboarding ?? null}
          userId={user?.id ?? null}
        >
          <DashboardLayout
            activeModule={activeModule}
            activeRightItem={activeRightItem}
            // Aj profil, ktorý sa nepodarilo načítať, je nedostupný (hamburger bez možností).
            viewedUserNotFound={userProfile.viewedUserNotFound || userProfile.viewedUserLoadError}
            isRightSidebarOpen={isRightSidebarOpen}
            isMobileMenuOpen={showMobileSettingsList}
            onModuleChange={handleDashboardModuleChange}
            onLogout={handleLogout}
            onRightSidebarClose={navigation.handleRightSidebarClose}
            onRightItemClick={handleRightItemClick}
            onMobileMenuOpen={handleMobileSettingsOpen}
            onMobileMenuClose={handleMobileSettingsClose}
            onMobileBack={
              activeModule === 'skills-select-category'
                ? handleSkillsCategoryBack
                : activeModule === 'skills-describe'
                  ? handleSkillsDescribeMobileBack
                  : activeModule === 'offer-reviews'
                    ? handleOfferReviewsBack
                    : activeModule === 'portfolio-detail'
                      ? handlePortfolioDetailBack
                      : activeModule === 'account-settings' || activeRightItem === 'account-settings'
                        ? handleAccountSettingsMobileBack
                        : handleMobileBack
            }
            onMobileProfileClick={handleMobileProfileOpen}
            onSkillsModeToggle={handleSkillsModeToggle}
            onSidebarLanguageClick={navigation.handleSidebarLanguageClick}
            onSidebarAccountTypeClick={navigation.handleSidebarAccountTypeClick}
            onSidebarAccountSettingsClick={navigation.handleSidebarAccountSettingsClick}
            onSidebarPrivacyClick={navigation.handleSidebarPrivacyClick}
            isSearchOpen={isSearchOpen}
            isNotificationsPanelOpen={isNotificationsPanelOpen}
            onSidebarSearchClick={handleSidebarSearchClick}
            onSidebarNotificationsClick={handleSidebarNotificationsClick}
            onSearchClose={navigation.handleSearchClose}
            onNotificationsPanelClose={handleNotificationsPanelClose}
            searchOverlay={
              user ? (
                <div className="h-full" data-desktop-onboarding="search-panel">
                  <SearchModule
                    user={user}
                    onUserClick={navigation.handleViewUserProfileFromSearch}
                    onSkillClick={navigation.handleViewUserSkillFromSearch}
                    isOverlay
                    isActive={isSearchOpen}
                    onClose={navigation.handleSearchClose}
                  />
                </div>
              ) : null
            }
            notificationsOverlay={
              <NotificationsFeed
                variant="panel"
                onNavigate={handleNotificationNavigate}
              />
            }
            desktopRightRail={
              activeModule === 'messages' ? (
                <MessagesDesktopRail
                  currentUserId={user.id}
                  selectedConversationId={
                    selectedConversationId != null && Number.isFinite(selectedConversationId)
                      ? selectedConversationId
                      : null
                  }
                />
              ) : null
            }
            subcategory={activeModule === 'skills-describe' ? selectedSkillsCategory?.subcategory : null}
            onSkillSaveClick={activeModule === 'skills-describe' ? handleSkillSave : undefined}
            mobileAccountName={mobileAccountName}
            mobileMessagePeerName={mobileMessageTitle}
            mobileMessagePeerAvatarUrl={mobileMessageAvatarUrl}
            mobileMessagePeerAvatarMembers={mobileMessageGroup?.avatarMembers ?? []}
            mobileMessagePeerIsGroup={Boolean(mobileMessageGroup)}
            mobileMessagePeerIdentifier={mobileMessageGroup ? null : mobileMessagePeerIdentifier}
            isMobileMessageConversationOpen={isMobileMessageConversationOpen}
            onMobileMessagesBack={handleMobileMessagesBack}
            isMobileOfferDetailOpen={showMobileOfferDetailTopBar}
            currentUser={user}
            mobileAccountSettingsView={mobileAccountSettingsView}
          >
            {moduleContent}
          </DashboardLayout>
          <OnboardingScrollLock />
          <MobileOnboardingOverlay />
          <DesktopOnboardingOverlay />
        </MobileOnboardingProvider>
      </DesktopOnboardingProvider>

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
        onCreatedSkillSaved={handleOnboardingSkillCreated}
      />
      <DeleteSkillConfirmModal
        open={Boolean(pendingDeleteOffer)}
        onClose={() => {
          if (!isDeletingOwnProfileOffer) {
            setPendingDeleteOffer(null);
          }
        }}
        onConfirm={handleConfirmDeleteOwnProfileOffer}
        isDeleting={isDeletingOwnProfileOffer}
      />
      {/* Okno lezi NAD celou appkou a mountuje sa az pri otvoreni, takze
          zavretim sa vrati presne povodny stav pod nim. */}
      {feedOverlayTarget ? (
        <FeedPostDetailOverlay
          postId={feedOverlayTarget.postId}
          highlightCommentId={feedOverlayTarget.highlightCommentId ?? null}
          onClose={() => handleFeedOverlayTargetChange(null)}
        />
      ) : null}
      </FeedPostOverlayProvider>
    </RequestsNotificationsProvider>
  );
}

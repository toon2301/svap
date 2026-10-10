"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobileState } from '@/hooks';
import type { User } from '@/types';
import type { ProfileTab } from '../modules/profile/profileTypes';
import { clearSkillsDescribeReturnModule } from '../modules/skills/skillsDescribeReturnSession';
import type { RequestsRouteIntent } from '../modules/requests/requestsRouting';
import { useDashboardState } from '../hooks/useDashboardState';
import { useSkillsModals } from '../hooks/useSkillsModals';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { useDashboardHighlighting } from '../hooks/useDashboardHighlighting';
import { useDashboardUserProfile } from '../hooks/useDashboardUserProfile';
import { useDashboardKeyboard } from '../hooks/useDashboardKeyboard';
import { useSkillSaveHandler } from '../hooks/useSkillSaveHandler';
import { useDashboardRouteParams } from '../hooks/useDashboardRouteParams';
import { useOwnProfileTabFromRoute } from '../hooks/useOwnProfileTabFromRoute';
import { useMobileMessagePeer } from '../hooks/useMobileMessagePeer';
import { useOwnProfileOfferActions } from '../hooks/useOwnProfileOfferActions';
import { useFeedOverlayTarget } from '../hooks/useFeedOverlayTarget';
import { useNotificationNavigation } from '../hooks/useNotificationNavigation';
import { useMobileSettings } from '../hooks/useMobileSettings';
import { useOnboardingHandlers } from '../hooks/useOnboardingHandlers';
import { useDashboardBackHandlers } from '../hooks/useDashboardBackHandlers';
import { usePortfolioNavigation } from '../hooks/usePortfolioNavigation';
import { usePathModuleEffects } from '../hooks/usePathModuleEffects';
import { usePopstateModuleSync } from '../hooks/usePopstateModuleSync';
import { useProfileWindowEvents } from '../hooks/useProfileWindowEvents';
import { useDashboardMountRoute } from './dashboardMountRoute';
import { resolveInitialOwnProfileTab } from './ownProfileTab';
import { getDashboardRenderValues } from './dashboardRenderValues';
import DashboardModuleContent from './DashboardModuleContent';
import DashboardContentView from './DashboardContentView';
import { useSettingsScrollReset } from '../hooks/useSettingsScrollReset';
import { useOfferWatchResultsNavigation } from '../modules/offer-watch/results/offerWatchResultsNavigation';

interface DashboardContentProps {
  initialUser?: User;
  initialRoute?: string;
  initialViewedUserId?: number | null;
  initialHighlightedSkillId?: number | null;
  initialProfileTab?: ProfileTab;
  initialProfileSlug?: string | null;
  initialRightItem?: string | null;
  /** ID karty (ponuky) pre view recenziÃ­ (/dashboard/offers/[offerId]/reviews). */
  initialOfferId?: number | null;
  initialPortfolioItemId?: number | null;
  initialFeedPostId?: number | null;
}

/**
 * HlavnÃ½ obsah Dashboard komponenta s vÅ¡etkou logikou
 */
export default function DashboardContent({
  initialUser,
  ...pageRouteProps
}: DashboardContentProps) {
  const router = useRouter();
  const { t } = useLanguage();
  // `isResolved` je pri priamom vstupe podstatné: okno je desktopová vec a
  // pred vyhodnotením media query hlási hook „nie je mobil".
  const { isMobile, isResolved: isViewportResolved } = useIsMobileState();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Krok spat cez hranicu Next stranky obnovi stranku, ktorej props nesedia s
  // adresou (zaznam z pushState nesie strom stranky, na ktorej vznikol). Pri
  // mounte sa preto props zosuladia s adresou – pri tvrdom nacitani a bezne
  // navigacii sa nemeni nic. Detaily vo `dashboardMountRoute`.
  const {
    initialRoute,
    initialViewedUserId,
    initialHighlightedSkillId,
    initialProfileTab,
    initialProfileSlug,
    initialRightItem,
    initialOfferId,
    initialPortfolioItemId,
    initialFeedPostId,
  } = useDashboardMountRoute(pageRouteProps, pathname, searchParams?.toString() ?? '');

  const {
    offerIdFromReviewsPath,
    feedPostIdFromPath,
    portfolioOwnerIdentifierFromPath,
    portfolioItemIdFromPath,
    portfolioCreateMatch,
    portfolioCreateOwnerIdentifierFromPath,
    targetUserIdFromMessagesQuery,
    selectedConversationId,
  } = useDashboardRouteParams(pathname, searchParams);

  // Core Dashboard State
  const dashboardState = useDashboardState(initialUser, initialRoute);
  // Prihlásený používateľ priamo z AuthContextu (kanonický zdroj pravdy).
  // dashboardState.user je len jeho mirror; pre zobrazenie mena (napr. v hlavičke
  // mobilného messagingu) čítame z authUser, aby sa po zmene mena vždy prejavila
  // aktuálna hodnota – rovnako ako inde v appke.
  const { user: authUser } = useAuth();
  const skillsState = useSkillsModals();
  
  // Local component state
  const [isInSubcategories, setIsInSubcategories] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [requestsRouteIntent, setRequestsRouteIntent] = useState<RequestsRouteIntent | null>(null);
  const [isMobileOfferDetailOpen, setIsMobileOfferDetailOpen] = useState(false);
  const [ownProfileTab, setOwnProfileTab] = useState<ProfileTab>(() =>
    resolveInitialOwnProfileTab(
      initialRoute,
      initialProfileTab,
      dashboardState.user,
      initialProfileSlug,
      initialViewedUserId,
    ),
  );

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

  useOwnProfileTabFromRoute({
    user: dashboardState.user,
    initialRoute,
    initialProfileTab,
    initialProfileSlug,
    initialViewedUserId,
    setOwnProfileTab,
  });
  const setViewedUserId = userProfile.setViewedUserId;
  const setViewedUserSlug = userProfile.setViewedUserSlug;
  const setViewedUserSummary = userProfile.setViewedUserSummary;

  const navigation = useDashboardNavigation({
    user: dashboardState.user,
    dashboardState,
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

  // Destructure states pre jednoduchÅ¡ie pouÅ¾itie
  const {
    user,
    isLoading,
    activeModule,
    activeRightItem,
    isRightSidebarOpen,
    isMobileMenuOpen,
    accountType,
    handleRightSidebarToggle,
    closeOwnProfileEdit,
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

  const handleManageOfferWatches = useOfferWatchResultsNavigation({
    activeModule,
    openDesktopSettings: dashboardState.openDesktopSettings,
    setActiveRightItem,
  });

  // Zoznam Nastavení sa na mobile riadi ADRESOU, nie vlastným boolean stavom:
  // je to obrazovka ako každá iná, takže krok späť ho zobrazí aj zatvorí.
  const showMobileSettingsList = isMobile && activeModule === 'settings';

  // Nastavenia sa otvárajú od vrchu – bez tohto si nesú scroll obrazovky,
  // z ktorej sa do nich vošlo, a držia ho aj medzi sekciami.
  useSettingsScrollReset(activeModule, activeRightItem, isRightSidebarOpen);

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

  const handleMainModuleChange = useCallback(
    (moduleId: string) => {
      setRequestsRouteIntent(null);
      setIsNotificationsPanelOpen(false);
      if (moduleId === 'profile' || activeModule === 'profile') {
        setOwnProfileTab('offers');
      }
      navigation.handleMainModuleChange(moduleId);
    },
    [activeModule, navigation],
  );

  // Zoznam Nastavení je na mobile skutočná obrazovka s vlastnou adresou, takže
  // sekcia sa otvára bežnou navigáciou a návrat naň obstará krok späť.
  const handleDashboardModuleChange = handleMainModuleChange;

  const {
    mobileAccountSettingsView,
    setMobileAccountSettingsView,
    handleAccountSettingsMobileBack,
    handleMobileSettingsOpen,
    handleMobileSettingsClose,
  } = useMobileSettings({
    activeModule,
    activeRightItem,
    handleMobileBack,
    handleMainModuleChange,
    setActiveModule,
  });

  const handleMobileProfileOpen = useCallback(() => {
    setOwnProfileTab('offers');
    navigation.handleMobileProfileClick();
  }, [navigation]);

  const handleProfileSkillsClick = useCallback(() => {
    setOwnProfileTab('offers');
    navigation.handleSkillsClick();
  }, [navigation]);

  useEffect(() => {
    if (activeModule !== 'requests' && requestsRouteIntent) {
      setRequestsRouteIntent(null);
    }
  }, [activeModule, requestsRouteIntent]);

  useEffect(() => {
    if (activeModule !== 'skills-describe') {
      clearSkillsDescribeReturnModule();
    }
  }, [activeModule]);

  const handleSidebarSearchClick = useCallback(() => {
    setIsNotificationsPanelOpen(false);
    navigation.handleSidebarSearchClick();
  }, [navigation]);

  const handleSidebarNotificationsClick = useCallback(() => {
    setIsSearchOpen(false);
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsNotificationsPanelOpen((current) => !current);
  }, [setActiveRightItem, setIsRightSidebarOpen]);

  const handleSkillsModeToggle = useCallback(() => {
    if (activeModule === 'skills-offer') {
      handleMainModuleChange('skills-search');
      return;
    }

    if (activeModule === 'skills-search') {
      handleMainModuleChange('skills-offer');
    }
  }, [activeModule, handleMainModuleChange]);

  const {
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
  } = useOnboardingHandlers({
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
  });

  const {
    feedOverlayTarget,
    setFeedOverlayTarget,
    handleFeedOverlayTargetChange,
  } = useFeedOverlayTarget();

  const handleNotificationsPanelClose = useCallback(() => {
    setIsNotificationsPanelOpen(false);
  }, []);

  const { handleNotificationNavigate } = useNotificationNavigation({
    router,
    isMobile,
    highlighting,
    handleFeedOverlayTargetChange,
    setActiveModule,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsNotificationsPanelOpen,
    setIsRightSidebarOpen,
    setIsSearchOpen,
    setViewedUserId,
    setViewedUserSlug,
    setViewedUserSummary,
    setRequestsRouteIntent,
  });

  const {
    skillsCategoryBackHandlerRef,
    handleOfferReviewsBack,
    handleSkillsDescribeMobileBack,
    handleSkillsCategoryBack,
    handleMobileMessagesBack,
  } = useDashboardBackHandlers({
    searchParams,
    handleMobileBack,
    handleNotificationNavigate,
    selectedSkillsCategory,
    setActiveModule,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsRightSidebarOpen,
  });

  // Funkcia na uloÅ¾enie karty (presunutÃ¡ do samostatnÃ©ho hooku pre prehÄ¾adnosÅ¥)
  const handleSkillSave = useSkillSaveHandler({
    selectedSkillsCategory,
    activeModule,
    setActiveModule,
    toLocalSkill,
    applySkillUpdate,
    loadSkills,
    fetchSkillDetail,
    t,
    ownerUserIdForOffersCache: user?.id,
    onCreatedSkillSaved: handleOnboardingSkillCreated,
    setSelectedSkillsCategory,
  });

  const {
    pendingDeleteOffer,
    setPendingDeleteOffer,
    isDeletingOwnProfileOffer,
    handleEditOwnProfileOffer,
    handleDeleteOwnProfileOffer,
    handleConfirmDeleteOwnProfileOffer,
  } = useOwnProfileOfferActions({
    isMobile,
    t,
    user,
    selectedSkillsCategory,
    fetchSkillDetail,
    loadSkills,
    setStandardCategories,
    setCustomCategories,
    setSelectedSkillsCategory,
    setIsSkillDescriptionModalOpen,
    setEditingCustomCategoryIndex,
    setEditingStandardCategoryIndex,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsSearchOpen,
    setIsNotificationsPanelOpen,
    setOwnProfileTab,
  });

  // NaÄÃ­taÅ¥ karty pri navigÃ¡cii na skills-offer alebo skills-search
  useEffect(() => {
    if (activeModule === 'skills-offer' || activeModule === 'skills-search') {
      void loadSkills();
    }
  }, [activeModule, loadSkills]);

  // Sync modulu a offerId pri URL /dashboard/offers/[id]/reviews (client-side navigÃ¡cia bez reloadu)
  const effectiveOfferIdForReviews = initialOfferId ?? offerIdFromReviewsPath ?? null;
  const effectiveFeedPostId = initialFeedPostId ?? feedPostIdFromPath ?? null;
  const effectivePortfolioItemId =
    initialPortfolioItemId ?? portfolioItemIdFromPath ?? null;
  const effectivePortfolioOwnerIdentifier =
    portfolioOwnerIdentifierFromPath ??
    initialProfileSlug ??
    (typeof initialViewedUserId === 'number' ? String(initialViewedUserId) : null);
  const effectivePortfolioCreateOwnerIdentifier = portfolioCreateOwnerIdentifierFromPath ?? null;

  const { handlePortfolioDetailBack, handleCreatePortfolio } = usePortfolioNavigation({
    router,
    user,
    effectivePortfolioOwnerIdentifier,
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
  });

  usePathModuleEffects({
    offerIdFromReviewsPath,
    portfolioItemIdFromPath,
    portfolioCreateMatch,
    feedPostIdFromPath,
    feedOverlayTarget,
    setFeedOverlayTarget,
    setActiveModule,
    isMobile,
    isViewportResolved,
  });

  const { mobileMessagePeer, mobileMessageGroup } = useMobileMessagePeer({
    activeModule,
    selectedConversationId,
    targetUserIdFromMessagesQuery,
    t,
  });

  // Po stlaÄenÃ­ spÃ¤Å¥ z cudzieho profilu (user-profile) URL skoÄÃ­ sprÃ¡vne, ale activeModule ostÃ¡va
  // user-profile â€“ synchronizujeme modul podÄ¾a aktuÃ¡lnej URL pri popstate
  usePopstateModuleSync({
    isMobile,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setViewedUserId,
    setViewedUserSlug,
    setViewedUserSummary,
  });

  useProfileWindowEvents({
    user,
    userProfile,
    highlighting,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsSearchOpen,
    setIsNotificationsPanelOpen,
    setIsMobileOfferDetailOpen,
  });

  const dashboardLoadingScreen = (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">
          {t('dashboard.loadingDashboard', 'Načítavam dashboard...')}
        </p>
      </div>
    </div>
  );

  // Early returns pre loading a error states
  if (isLoading) {
    return dashboardLoadingScreen;
  }

  if (!user) {
    return <div className="min-h-screen bg-[var(--background)]" aria-hidden="true" />;
  }

  // Module content pre ModuleRouter
  const moduleContent = (
    <DashboardModuleContent
      user={user}
      activeModule={activeModule}
      activeRightItem={activeRightItem}
      isRightSidebarOpen={isRightSidebarOpen}
      accountType={accountType}
      handleUserUpdate={handleUserUpdate}
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
      skillsCategoryBackHandlerRef={skillsCategoryBackHandlerRef}
      userProfile={userProfile}
      navigation={navigation}
      highlighting={highlighting}
      initialProfileTab={initialProfileTab}
      ownProfileTab={ownProfileTab}
      setOwnProfileTab={setOwnProfileTab}
      handleProfileSkillsClick={handleProfileSkillsClick}
      handleSkillsModeToggle={handleSkillsModeToggle}
      effectiveOfferIdForReviews={effectiveOfferIdForReviews}
      effectiveFeedPostId={effectiveFeedPostId}
      effectivePortfolioItemId={effectivePortfolioItemId}
      effectivePortfolioOwnerIdentifier={effectivePortfolioOwnerIdentifier}
      effectivePortfolioCreateOwnerIdentifier={effectivePortfolioCreateOwnerIdentifier}
      handleCreatePortfolio={handleCreatePortfolio}
      selectedConversationId={selectedConversationId}
      targetUserIdFromMessagesQuery={targetUserIdFromMessagesQuery}
      handleNotificationNavigate={handleNotificationNavigate}
      requestsRouteIntent={requestsRouteIntent}
      handleEditOwnProfileOffer={handleEditOwnProfileOffer}
      handleDeleteOwnProfileOffer={handleDeleteOwnProfileOffer}
      mobileAccountSettingsView={mobileAccountSettingsView}
      setMobileAccountSettingsView={setMobileAccountSettingsView}
      handleManageOfferWatches={handleManageOfferWatches}
    />
  );

  const {
    mobileAccountName,
    mobileMessagePeerIdentifier,
    mobileMessageTitle,
    mobileMessageAvatarUrl,
    isProfileEditMode,
    isMobileMessageConversationOpen,
    showMobileOfferDetailTopBar,
    isMobileOnboardingBlocked,
  } = getDashboardRenderValues({
    authUser,
    user,
    t,
    mobileMessagePeer,
    mobileMessageGroup,
    activeModule,
    activeRightItem,
    isRightSidebarOpen,
    isMobileMenuOpen,
    isNotificationsPanelOpen,
    isMobileOfferDetailOpen,
    selectedConversationId,
    targetUserIdFromMessagesQuery,
  });
  return (
    <DashboardContentView
      activeModule={activeModule}
      isNotificationsPanelOpen={isNotificationsPanelOpen}
      handleFeedOverlayTargetChange={handleFeedOverlayTargetChange}
      isSearchOpen={isSearchOpen}
      isProfileEditMode={isProfileEditMode}
      isRightSidebarOpen={isRightSidebarOpen}
      showMobileSettingsList={showMobileSettingsList}
      handleOnboardingHomeOpen={handleOnboardingHomeOpen}
      handleDesktopOnboardingProfileOpen={handleDesktopOnboardingProfileOpen}
      navigation={navigation}
      handleDesktopOnboardingSearchOpen={handleDesktopOnboardingSearchOpen}
      handleDesktopOnboardingSearchClose={handleDesktopOnboardingSearchClose}
      handleDesktopOnboardingRequestsOpen={handleDesktopOnboardingRequestsOpen}
      handleOnboardingMessagesOpen={handleOnboardingMessagesOpen}
      handleDesktopOnboardingSkillCreatedHandlerSet={handleDesktopOnboardingSkillCreatedHandlerSet}
      user={user}
      isMobileOnboardingBlocked={isMobileOnboardingBlocked}
      handleMobileProfileOpen={handleMobileProfileOpen}
      handleOnboardingSearchOpen={handleOnboardingSearchOpen}
      handleOnboardingRequestsOpen={handleOnboardingRequestsOpen}
      handleMobileOnboardingSkillCreatedHandlerSet={handleMobileOnboardingSkillCreatedHandlerSet}
      activeRightItem={activeRightItem}
      userProfile={userProfile}
      handleDashboardModuleChange={handleDashboardModuleChange}
      handleLogout={handleLogout}
      handleRightItemClick={handleRightItemClick}
      handleMobileSettingsOpen={handleMobileSettingsOpen}
      handleMobileSettingsClose={handleMobileSettingsClose}
      handleSkillsCategoryBack={handleSkillsCategoryBack}
      handleSkillsDescribeMobileBack={handleSkillsDescribeMobileBack}
      handleOfferReviewsBack={handleOfferReviewsBack}
      handlePortfolioDetailBack={handlePortfolioDetailBack}
      handleAccountSettingsMobileBack={handleAccountSettingsMobileBack}
      handleMobileBack={handleMobileBack}
      handleSkillsModeToggle={handleSkillsModeToggle}
      handleSidebarSearchClick={handleSidebarSearchClick}
      handleSidebarNotificationsClick={handleSidebarNotificationsClick}
      handleNotificationsPanelClose={handleNotificationsPanelClose}
      handleNotificationNavigate={handleNotificationNavigate}
      selectedConversationId={selectedConversationId}
      selectedSkillsCategory={selectedSkillsCategory}
      handleSkillSave={handleSkillSave}
      mobileAccountName={mobileAccountName}
      mobileMessageTitle={mobileMessageTitle}
      mobileMessageAvatarUrl={mobileMessageAvatarUrl}
      mobileMessageGroup={mobileMessageGroup}
      mobileMessagePeerIdentifier={mobileMessagePeerIdentifier}
      isMobileMessageConversationOpen={isMobileMessageConversationOpen}
      handleMobileMessagesBack={handleMobileMessagesBack}
      showMobileOfferDetailTopBar={showMobileOfferDetailTopBar}
      mobileAccountSettingsView={mobileAccountSettingsView}
      moduleContent={moduleContent}
      accountType={accountType}
      setAccountType={setAccountType}
      isAccountTypeModalOpen={isAccountTypeModalOpen}
      setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
      isPersonalAccountModalOpen={isPersonalAccountModalOpen}
      setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
      dashboardState={dashboardState}
      setSelectedSkillsCategory={setSelectedSkillsCategory}
      standardCategories={standardCategories}
      setStandardCategories={setStandardCategories}
      customCategories={customCategories}
      setCustomCategories={setCustomCategories}
      isSkillsCategoryModalOpen={isSkillsCategoryModalOpen}
      setIsSkillsCategoryModalOpen={setIsSkillsCategoryModalOpen}
      isSkillDescriptionModalOpen={isSkillDescriptionModalOpen}
      setIsSkillDescriptionModalOpen={setIsSkillDescriptionModalOpen}
      isAddCustomCategoryModalOpen={isAddCustomCategoryModalOpen}
      setIsAddCustomCategoryModalOpen={setIsAddCustomCategoryModalOpen}
      editingCustomCategoryIndex={editingCustomCategoryIndex}
      setEditingCustomCategoryIndex={setEditingCustomCategoryIndex}
      editingStandardCategoryIndex={editingStandardCategoryIndex}
      setEditingStandardCategoryIndex={setEditingStandardCategoryIndex}
      toLocalSkill={toLocalSkill}
      applySkillUpdate={applySkillUpdate}
      loadSkills={loadSkills}
      fetchSkillDetail={fetchSkillDetail}
      handleRemoveSkillImage={handleRemoveSkillImage}
      removeStandardCategory={removeStandardCategory}
      removeCustomCategory={removeCustomCategory}
      t={t}
      handleOnboardingSkillCreated={handleOnboardingSkillCreated}
      pendingDeleteOffer={pendingDeleteOffer}
      isDeletingOwnProfileOffer={isDeletingOwnProfileOffer}
      setPendingDeleteOffer={setPendingDeleteOffer}
      handleConfirmDeleteOwnProfileOffer={handleConfirmDeleteOwnProfileOffer}
      feedOverlayTarget={feedOverlayTarget}
    />
  );
}


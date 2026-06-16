"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '@/types';
import { api, endpoints } from '@/lib/api';
import type { ProfileTab } from '../modules/profile/profileTypes';
import DashboardLayout from '../DashboardLayout';
import ModuleRouter from '../ModuleRouter';
import DashboardModals from '../DashboardModals';
import { DesktopOnboardingProvider } from '../onboarding/DesktopOnboardingContext';
import DesktopOnboardingOverlay from '../onboarding/DesktopOnboardingOverlay';
import { MobileOnboardingProvider } from '../onboarding/MobileOnboardingContext';
import MobileOnboardingOverlay from '../onboarding/MobileOnboardingOverlay';
import { isMobileOnboardingBlockedByUi } from '../onboarding/mobileOnboardingScene';
import SearchModule from '../modules/SearchModule';
import { MessagesDesktopRail } from '../modules/messages/MessagesDesktopRail';
import NotificationsFeed from '../modules/notifications/NotificationsFeed';
import {
  navigateMessagesUrl,
  parseConversationId,
  parseTargetUserId,
} from '../modules/messages/messagesRouting';
import {
  parseRequestsTargetUrl,
  type RequestsRouteIntent,
} from '../modules/requests/requestsRouting';
import { getSafeDashboardReturnTo } from '../modules/reviews/offerReviewsRouting';
import { listConversations, listMessageRequests, openConversation } from '../modules/messages/messagingApi';
import type { MessagingUserBrief } from '../modules/messages/types';
import {
  PROFILE_OFFER_DETAIL_CLOSE_EVENT,
  PROFILE_OFFER_DETAIL_OPEN_EVENT,
} from '../modules/profile/profileOfferDetailEvents';
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
  /** ID karty (ponuky) pre view recenziÃ­ (/dashboard/offers/[offerId]/reviews). */
  initialOfferId?: number | null;
  initialPortfolioItemId?: number | null;
}

function getDashboardModuleFromTarget(targetUrl: string): string | null {
  if (targetUrl !== '/dashboard' && !targetUrl.startsWith('/dashboard/')) {
    return null;
  }

  try {
    const path = new URL(targetUrl, 'https://swaply.local').pathname;
    if (path === '/dashboard' || path === '/dashboard/') return 'home';
    if (/^\/dashboard\/requests\/?$/.test(path)) return 'requests';
    if (/^\/dashboard\/messages(?:\/\d+)?\/?$/.test(path)) return 'messages';
    if (/^\/dashboard\/offers\/\d+\/reviews\/?$/.test(path)) return 'offer-reviews';
    if (/^\/dashboard\/settings\/notifications\/?$/.test(path)) return 'notification-settings';
    if (/^\/dashboard\/notifications\/?$/.test(path)) return 'notifications';
    if (/^\/dashboard\/favorites\/?$/.test(path)) return 'favorites';
    if (/^\/dashboard\/search\/?$/.test(path)) return 'search';
    if (/^\/dashboard\/settings\/?$/.test(path)) return 'settings';
    if (/^\/dashboard\/language\/?$/.test(path)) return 'language';
    if (/^\/dashboard\/account-type\/?$/.test(path)) return 'account-type';
    if (/^\/dashboard\/privacy\/?$/.test(path)) return 'privacy';
    if (/^\/dashboard\/skills\/offer\/?$/.test(path)) return 'skills-offer';
    if (/^\/dashboard\/skills\/search\/?$/.test(path)) return 'skills-search';
    if (/^\/dashboard\/skills\/?$/.test(path)) return 'skills';
    if (/^\/dashboard\/profile\/?$/.test(path)) return 'profile';
    if (/^\/dashboard\/users\/[^/]+\/portfolio\/\d+\/?$/.test(path)) return 'portfolio-detail';
    if (/^\/dashboard\/users\/[^/]+\/portfolio\/?$/.test(path)) return 'user-profile';
    if (/^\/dashboard\/users\/[^/]+\/?$/.test(path)) return 'user-profile';
  } catch {
    return null;
  }

  return null;
}

function getDashboardUserIdentifierFromTarget(targetUrl: string): string | null {
  try {
    const path = new URL(targetUrl, 'https://swaply.local').pathname;
    const match = path.match(/^\/dashboard\/users\/([^/]+)(?:\/portfolio(?:\/\d+)?)?\/?$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function parseDashboardHighlightId(value: number | string | null | undefined): number | null {
  const id =
    typeof value === 'number'
      ? value
      : value != null && String(value).trim()
        ? Number(value)
        : null;
  return id != null && Number.isFinite(id) && Number.isInteger(id) && id >= 1 ? id : null;
}

function getDashboardHighlightIdFromTarget(targetUrl: string): number | null {
  try {
    const searchParams = new URL(targetUrl, 'https://swaply.local').searchParams;
    const raw = searchParams.get('offer') ?? searchParams.get('highlight');
    return parseDashboardHighlightId(raw);
  } catch {
    return null;
  }
}

/**
 * HlavnÃ½ obsah Dashboard komponenta s vÅ¡etkou logikou
 */
export default function DashboardContent({
  initialUser,
  initialRoute,
  initialViewedUserId,
  initialHighlightedSkillId,
  initialProfileTab,
  initialProfileSlug,
  initialRightItem,
  initialOfferId,
  initialPortfolioItemId,
}: DashboardContentProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // OdvodiÅ¥ offerId pre recenzie z URL (fix: client-side navigÃ¡cia bez full reloadu)
  const offerIdFromReviewsPath = React.useMemo(() => {
    const m = pathname?.match(/^\/dashboard\/offers\/(\d+)\/reviews\/?$/);
    return m ? Number(m[1]) : null;
  }, [pathname]);

  const conversationIdFromMessagesPath = React.useMemo(() => {
    const m = pathname?.match(/^\/dashboard\/messages\/(\d+)\/?$/);
    return m ? Number(m[1]) : null;
  }, [pathname]);

  const portfolioDetailMatch = React.useMemo(
    () => pathname?.match(/^\/dashboard\/users\/([^/]+)\/portfolio\/(\d+)\/?$/) ?? null,
    [pathname],
  );

  const portfolioOwnerIdentifierFromPath = React.useMemo(
    () => (portfolioDetailMatch?.[1] ? decodeURIComponent(portfolioDetailMatch[1]) : null),
    [portfolioDetailMatch],
  );

  const portfolioItemIdFromPath = React.useMemo(
    () => (portfolioDetailMatch?.[2] ? Number(portfolioDetailMatch[2]) : null),
    [portfolioDetailMatch],
  );

  const conversationIdFromMessagesQuery = React.useMemo(
    () => parseConversationId(searchParams?.get('conversationId')),
    [searchParams],
  );
  const targetUserIdFromMessagesQuery = React.useMemo(
    () => parseTargetUserId(searchParams?.get('targetUserId')),
    [searchParams],
  );

  const selectedConversationId = conversationIdFromMessagesQuery ?? conversationIdFromMessagesPath ?? null;

  // Core Dashboard State
  const dashboardState = useDashboardState(initialUser, initialRoute);
  const skillsState = useSkillsModals();
  
  // Local component state
  const [isInSubcategories, setIsInSubcategories] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [requestsRouteIntent, setRequestsRouteIntent] = useState<RequestsRouteIntent | null>(null);
  const [mobileMessagePeer, setMobileMessagePeer] = useState<MessagingUserBrief | null>(null);
  const [mobileMessageGroup, setMobileMessageGroup] = useState<{
    name: string;
    avatarMembers: MessagingUserBrief[];
  } | null>(null);
  const [isMobileOfferDetailOpen, setIsMobileOfferDetailOpen] = useState(false);
  const skillsCategoryBackHandlerRef = useRef<(() => void) | null>(null);
  const mobileOnboardingSkillCreatedHandlerRef = useRef<(() => void) | null>(null);
  const desktopOnboardingSkillCreatedHandlerRef = useRef<(() => void) | null>(null);

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
  const setViewedUserId = userProfile.setViewedUserId;
  const setViewedUserSlug = userProfile.setViewedUserSlug;
  const setViewedUserSummary = userProfile.setViewedUserSummary;

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
      navigation.handleMainModuleChange(moduleId);
    },
    [navigation],
  );

  useEffect(() => {
    if (activeModule !== 'requests' && requestsRouteIntent) {
      setRequestsRouteIntent(null);
    }
  }, [activeModule, requestsRouteIntent]);

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

  const handleOnboardingSearchOpen = useCallback(() => {
    handleMainModuleChange('search');
  }, [handleMainModuleChange]);

  const handleDesktopOnboardingSearchOpen = useCallback(() => {
    setIsNotificationsPanelOpen(false);
    if (activeModule === 'search') {
      handleMainModuleChange('home');
    }
    setIsSearchOpen(true);
  }, [activeModule, handleMainModuleChange]);

  const handleDesktopOnboardingSearchClose = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleOnboardingRequestsOpen = useCallback(() => {
    handleMainModuleChange('requests');
  }, [handleMainModuleChange]);

  const handleDesktopOnboardingRequestsOpen = useCallback(() => {
    setIsSearchOpen(false);
    handleMainModuleChange('requests');
  }, [handleMainModuleChange]);

  const handleOnboardingMessagesOpen = useCallback(() => {
    handleMainModuleChange('messages');
  }, [handleMainModuleChange]);

  const handleOnboardingHomeOpen = useCallback(() => {
    handleMainModuleChange('home');
  }, [handleMainModuleChange]);

  const handleDesktopOnboardingProfileOpen = useCallback(() => {
    setActiveModule('profile');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsNotificationsPanelOpen(false);
    setViewedUserId(null);
    setViewedUserSlug(null);
    setViewedUserSummary(null);
    highlighting.setHighlightedSkillId(null);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'profile');
      }
    } catch {
      // Navigation state is already updated; ignore storage failures.
    }

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/dashboard/profile');
    }
  }, [
    highlighting,
    setActiveModule,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setIsNotificationsPanelOpen,
    setIsRightSidebarOpen,
    setIsSearchOpen,
    setViewedUserId,
    setViewedUserSlug,
    setViewedUserSummary,
  ]);

  const handleOnboardingSkillCreated = useCallback(() => {
    mobileOnboardingSkillCreatedHandlerRef.current?.();
    desktopOnboardingSkillCreatedHandlerRef.current?.();
  }, []);

  const handleMobileOnboardingSkillCreatedHandlerSet = useCallback((handler: (() => void) | null) => {
    mobileOnboardingSkillCreatedHandlerRef.current = handler;
  }, []);

  const handleDesktopOnboardingSkillCreatedHandlerSet = useCallback((handler: (() => void) | null) => {
    desktopOnboardingSkillCreatedHandlerRef.current = handler;
  }, []);

  const handleNotificationsPanelClose = useCallback(() => {
    setIsNotificationsPanelOpen(false);
  }, []);

  const handleNotificationNavigate = useCallback(
    (targetUrl: string) => {
      if (targetUrl !== '/dashboard' && !targetUrl.startsWith('/dashboard/')) {
        return;
      }

      const moduleId = getDashboardModuleFromTarget(targetUrl);
      if (moduleId) {
        setActiveModule(moduleId);
        try {
          localStorage.setItem('activeModule', moduleId);
        } catch {
          // ignore
        }
      }

      if (moduleId === 'requests') {
        const requestsTarget = parseRequestsTargetUrl(targetUrl);
        if (requestsTarget) {
          setRequestsRouteIntent((current) => ({
            ...requestsTarget,
            key: (current?.key ?? 0) + 1,
          }));
        }
      } else {
        setRequestsRouteIntent(null);
      }

      if (moduleId === 'user-profile' || moduleId === 'portfolio-detail') {
        const identifier = getDashboardUserIdentifierFromTarget(targetUrl);
        setViewedUserSummary(null);
        if (identifier && /^\d+$/.test(identifier)) {
          setViewedUserId(Number(identifier));
          setViewedUserSlug(null);
        } else if (identifier) {
          setViewedUserId(null);
          setViewedUserSlug(identifier);
        }
      } else if (moduleId) {
        setViewedUserId(null);
        setViewedUserSlug(null);
        setViewedUserSummary(null);
      }

      if (moduleId === 'profile' || moduleId === 'user-profile') {
        const highlightId = getDashboardHighlightIdFromTarget(targetUrl);
        if (highlightId != null) {
          highlighting.setHighlightedSkillId(highlightId);
          try {
            sessionStorage.setItem('highlightedSkillId', String(highlightId));
            sessionStorage.setItem('highlightedSkillTime', String(Date.now()));
          } catch {
            // ignore
          }
        }
      }

      setIsNotificationsPanelOpen(false);
      setIsSearchOpen(false);
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      router.push(targetUrl);
    },
    [
      router,
      setActiveModule,
      setActiveRightItem,
      setIsMobileMenuOpen,
      setIsNotificationsPanelOpen,
      setIsRightSidebarOpen,
      setIsSearchOpen,
      setViewedUserId,
      setViewedUserSlug,
      setViewedUserSummary,
      highlighting,
    ],
  );

  const offerReviewsReturnTo = React.useMemo(
    () => getSafeDashboardReturnTo(searchParams?.get('returnTo') ?? null),
    [searchParams],
  );

  const handleOfferReviewsBack = useCallback(() => {
    if (offerReviewsReturnTo) {
      handleNotificationNavigate(offerReviewsReturnTo);
      return;
    }

    handleMobileBack();
  }, [handleMobileBack, handleNotificationNavigate, offerReviewsReturnTo]);

  // Funkcia na uloÅ¾enie karty (presunutÃ¡ do samostatnÃ©ho hooku pre prehÄ¾adnosÅ¥)
  const handleSkillSave = useSkillSaveHandler({
    selectedSkillsCategory,
    activeModule,
    setActiveModule,
    toLocalSkill,
    applySkillUpdate,
    loadSkills,
    t,
    ownerUserIdForOffersCache: user?.id,
    onCreatedSkillSaved: handleOnboardingSkillCreated,
  });

  // Skills category back handler
  const handleSkillsCategoryBack = useCallback(() => {
    if (skillsCategoryBackHandlerRef.current) {
      skillsCategoryBackHandlerRef.current();
    } else {
      handleMobileBack();
    }
  }, [handleMobileBack]);

  // NaÄÃ­taÅ¥ karty pri navigÃ¡cii na skills-offer alebo skills-search
  useEffect(() => {
    if (activeModule === 'skills-offer' || activeModule === 'skills-search') {
      void loadSkills();
    }
  }, [activeModule, loadSkills]);

  // Sync modulu a offerId pri URL /dashboard/offers/[id]/reviews (client-side navigÃ¡cia bez reloadu)
  const effectiveOfferIdForReviews = initialOfferId ?? offerIdFromReviewsPath ?? null;
  const effectivePortfolioItemId =
    initialPortfolioItemId ?? portfolioItemIdFromPath ?? null;
  const effectivePortfolioOwnerIdentifier =
    portfolioOwnerIdentifierFromPath ??
    initialProfileSlug ??
    (typeof initialViewedUserId === 'number' ? String(initialViewedUserId) : null);
  useEffect(() => {
    if (offerIdFromReviewsPath != null) {
      setActiveModule('offer-reviews');
    }
  }, [offerIdFromReviewsPath, setActiveModule]);

  useEffect(() => {
    if (portfolioItemIdFromPath != null && Number.isFinite(portfolioItemIdFromPath)) {
      setActiveModule('portfolio-detail');
    }
  }, [portfolioItemIdFromPath, setActiveModule]);

  // Po stlaÄenÃ­ spÃ¤Å¥ z cudzieho profilu (user-profile) URL skoÄÃ­ sprÃ¡vne, ale activeModule ostÃ¡va
  // user-profile â€“ synchronizujeme modul podÄ¾a aktuÃ¡lnej URL pri popstate
  useEffect(() => {
    let cancelled = false;

    if (activeModule !== 'messages') {
      setMobileMessagePeer(null);
      setMobileMessageGroup(null);
      return () => {
        cancelled = true;
      };
    }

    const targetUserId =
      targetUserIdFromMessagesQuery != null && Number.isFinite(targetUserIdFromMessagesQuery)
        ? targetUserIdFromMessagesQuery
        : null;

    if (targetUserId != null) {
      void (async () => {
        try {
          const result = await openConversation(targetUserId);
          if (cancelled) return;
          setMobileMessagePeer(result.other_user ?? null);
          setMobileMessageGroup(null);
        } catch {
          if (!cancelled) {
            setMobileMessagePeer(null);
            setMobileMessageGroup(null);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    const conversationId =
      selectedConversationId != null && Number.isFinite(selectedConversationId)
        ? selectedConversationId
        : null;

    if (conversationId == null) {
      setMobileMessagePeer(null);
      setMobileMessageGroup(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const conversations = await listConversations();
        if (cancelled) return;
        let match = conversations.find((item) => item.id === conversationId) ?? null;
        if (!match) {
          const requests = await listMessageRequests();
          if (cancelled) return;
          match = requests.find((item) => item.id === conversationId) ?? null;
        }
        if (match?.is_group) {
          setMobileMessagePeer(null);
          setMobileMessageGroup({
            name: (match.name || '').trim() || t('messages.unknownGroup', 'Skupina'),
            avatarMembers: match.avatar_members ?? [],
          });
        } else {
          setMobileMessagePeer(match?.other_user ?? null);
          setMobileMessageGroup(null);
        }
      } catch {
        if (!cancelled) {
          setMobileMessagePeer(null);
          setMobileMessageGroup(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeModule, selectedConversationId, targetUserIdFromMessagesQuery, t]);
  useEffect(() => {
    const syncModuleFromPath = () => {
      if (typeof window === 'undefined') return;
      const p = window.location.pathname || '';
      let moduleId: string | null = null;
      if (p.match(/^\/dashboard\/requests\/?$/)) {
        moduleId = 'requests';
      } else if (p.match(/^\/dashboard\/search\/?$/)) {
        moduleId = 'search';
      } else if (p.match(/^\/dashboard\/messages\/?$/) || p.match(/^\/dashboard\/messages\/\d+\/?$/)) {
        moduleId = 'messages';
      } else if (p.match(/^\/dashboard\/settings\/notifications\/?$/)) {
        moduleId = 'notification-settings';
      } else if (p === '/dashboard' || p === '/dashboard/') {
        moduleId = 'home';
      } else if (p.match(/^\/dashboard\/profile\/?$/)) {
        moduleId = 'profile';
      } else if (p.match(/^\/dashboard\/users\/[^/]+\/portfolio\/\d+\/?$/)) {
        moduleId = 'portfolio-detail';
      } else if (p.match(/^\/dashboard\/users\/[^/]+\/portfolio\/?$/)) {
        moduleId = 'user-profile';
      } else if (p.match(/^\/dashboard\/users\/[^/]+\/?$/)) {
        moduleId = 'user-profile';
      }
      if (moduleId !== null) {
        setActiveModule(moduleId);
        try {
          localStorage.setItem('activeModule', moduleId);
        } catch {
          // ignore
        }
        if (moduleId === 'user-profile' || moduleId === 'portfolio-detail') {
          const identifier = getDashboardUserIdentifierFromTarget(p);
          setViewedUserSummary(null);
          if (identifier && /^\d+$/.test(identifier)) {
            setViewedUserId(Number(identifier));
            setViewedUserSlug(null);
          } else if (identifier) {
            setViewedUserId(null);
            setViewedUserSlug(identifier);
          }
        } else {
          setViewedUserId(null);
          setViewedUserSlug(null);
          setViewedUserSummary(null);
        }
        setIsRightSidebarOpen(false);
        setActiveRightItem('');
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('popstate', syncModuleFromPath);
    return () => window.removeEventListener('popstate', syncModuleFromPath);
  }, [setActiveModule, setIsRightSidebarOpen, setActiveRightItem, setIsMobileMenuOpen, setViewedUserId, setViewedUserSlug, setViewedUserSummary]);

  // GlobÃ¡lna navigÃ¡cia na cudzÃ­ profil (napr. zo Å½iadostÃ­).
  // PouÅ¾Ã­vame event, aby UI reagovalo okamÅ¾ite aj v prÃ­padoch, keÄ sa URL zmenÃ­ bez
  // toho, aby Next router prerenderoval strÃ¡nku (napr. window.history.pushState).
  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<{
        identifier?: string;
        highlightId?: number | string | null;
        offerId?: number | string | null;
      }>).detail;
      const identifier = (detail?.identifier || '').trim();
      if (!identifier) return;

      const rawHighlight = detail?.offerId ?? detail?.highlightId;
      const useOfferParam = detail?.offerId != null;
      const highlightId = parseDashboardHighlightId(rawHighlight);

      // Prepni modul a zavri vedÄ¾ajÅ¡ie UI
      setActiveModule('user-profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      setIsNotificationsPanelOpen(false);

      // Nastav, akÃ½ profil sa mÃ¡ zobraziÅ¥
      if (/^\d+$/.test(identifier)) {
        userProfile.setViewedUserId(Number(identifier));
        userProfile.setViewedUserSlug(null);
      } else {
        userProfile.setViewedUserSlug(identifier);
        userProfile.setViewedUserId(null);

        // PokÃºs sa slug -> userId (cache -> API), aby ModuleRouter vedel vyrenderovaÅ¥ profil.
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
              // nechÃ¡me UI rozhodnÃºÅ¥ (zobrazÃ­ not-found hlÃ¡Å¡ku)
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
          highlightId != null
            ? `?${useOfferParam ? 'offer' : 'highlight'}=${encodeURIComponent(String(highlightId))}`
            : ''
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
    setIsNotificationsPanelOpen,
    userProfile,
    highlighting,
  ]);

  // GlobÃ¡lna navigÃ¡cia na vlastnÃ½ profil (napr. zo Å½iadostÃ­ pri prijatej Å¾iadosti).
  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<{ highlightId?: number | string | null }>).detail;
      const highlightId = parseDashboardHighlightId(detail?.highlightId);

      setActiveModule('profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      setIsNotificationsPanelOpen(false);

      // vyÄisti stav cudzÃ­ch profilov, aby sa UI nemieÅ¡alo
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
    setIsNotificationsPanelOpen,
    userProfile,
    highlighting,
  ]);

  const handleMobileMessagesBack = useCallback(() => {
    setActiveModule('messages');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsMobileMenuOpen(false);
    navigateMessagesUrl();
  }, [setActiveModule, setActiveRightItem, setIsMobileMenuOpen, setIsRightSidebarOpen]);

  useEffect(() => {
    const onOpen = () => setIsMobileOfferDetailOpen(true);
    const onClose = () => setIsMobileOfferDetailOpen(false);

    window.addEventListener(PROFILE_OFFER_DETAIL_OPEN_EVENT, onOpen);
    window.addEventListener(PROFILE_OFFER_DETAIL_CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener(PROFILE_OFFER_DETAIL_OPEN_EVENT, onOpen);
      window.removeEventListener(PROFILE_OFFER_DETAIL_CLOSE_EVENT, onClose);
    };
  }, []);

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
      viewedUserSummary={userProfile.viewedUserSummary}
      onEditProfileClick={navigation.handleEditProfileClick}
      onViewUserProfile={navigation.handleViewUserProfileFromSearch}
      highlightedSkillId={highlighting.highlightedSkillId}
      onViewUserSkillFromSearch={navigation.handleViewUserSkillFromSearch}
      initialProfileTab={initialProfileTab}
      onSkillsClick={navigation.handleSkillsClick}
      onSkillsOfferClick={navigation.handleSkillsOfferClick}
      onSkillsSearchClick={navigation.handleSkillsSearchClick}
      onSkillsModeToggle={handleSkillsModeToggle}
      offerIdForReviews={effectiveOfferIdForReviews}
      portfolioItemIdForDetail={
        effectivePortfolioItemId != null && Number.isFinite(effectivePortfolioItemId)
          ? effectivePortfolioItemId
          : null
      }
      portfolioOwnerIdentifier={effectivePortfolioOwnerIdentifier}
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
    />
  );

  const mobileAccountName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    (user?.company_name || '').trim() ||
    (user?.username || '').trim() ||
    t('navigation.profile', 'Profil');
  const mobileMessagePeerIdentifier =
    (mobileMessagePeer?.slug || '').trim() ||
    (typeof mobileMessagePeer?.id === 'number' ? String(mobileMessagePeer.id) : null);
  const mobileMessageTitle = mobileMessageGroup?.name || (mobileMessagePeer?.display_name || '').trim() || undefined;
  const mobileMessageAvatarUrl = mobileMessageGroup ? null : mobileMessagePeer?.avatar_url ?? null;
  const isProfileEditMode =
    activeModule === 'profile' &&
    activeRightItem === 'edit-profile' &&
    isRightSidebarOpen;
  const isMobileMessageConversationOpen = Boolean(
    activeModule === 'messages' &&
      (selectedConversationId != null || targetUserIdFromMessagesQuery != null),
  );
  const showMobileOfferDetailTopBar =
    isMobileOfferDetailOpen &&
    (activeModule === 'profile' || activeModule === 'user-profile');
  const isMobileOnboardingBlocked = isMobileOnboardingBlockedByUi({
    activeModule,
    activeRightItem,
    isRightSidebarOpen,
    isMobileMenuOpen,
    isSearchOpen,
    isNotificationsPanelOpen,
    isMessageConversationOpen: isMobileMessageConversationOpen,
  });
  return (
    <RequestsNotificationsProvider
      acknowledgeNotificationsBadge={activeModule === 'notifications' || isNotificationsPanelOpen}
    >
      <DesktopOnboardingProvider
        activeModule={activeModule}
        isSearchOpen={isSearchOpen}
        isProfileEditMode={isProfileEditMode}
        isRightSidebarOpen={isRightSidebarOpen}
        isNotificationsPanelOpen={isNotificationsPanelOpen}
        isMobileMenuOpen={isMobileMenuOpen}
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
          onOpenProfile={navigation.handleMobileProfileClick}
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
            isRightSidebarOpen={isRightSidebarOpen}
            isMobileMenuOpen={isMobileMenuOpen}
            onModuleChange={handleMainModuleChange}
            onLogout={handleLogout}
            onRightSidebarClose={navigation.handleRightSidebarClose}
            onRightItemClick={handleRightItemClick}
            onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
            onMobileMenuClose={() => setIsMobileMenuOpen(false)}
            onMobileBack={
              activeModule === 'skills-select-category'
                ? handleSkillsCategoryBack
                : activeModule === 'offer-reviews'
                  ? handleOfferReviewsBack
                  : handleMobileBack
            }
            onMobileProfileClick={navigation.handleMobileProfileClick}
            onSkillsModeToggle={handleSkillsModeToggle}
            onSidebarLanguageClick={navigation.handleSidebarLanguageClick}
            onSidebarAccountTypeClick={navigation.handleSidebarAccountTypeClick}
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
          >
            {moduleContent}
          </DashboardLayout>
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
    </RequestsNotificationsProvider>
  );
}


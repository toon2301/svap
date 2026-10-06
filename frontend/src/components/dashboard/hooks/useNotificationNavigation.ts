'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { FeedPostOverlayTarget } from '../contexts/FeedPostOverlayContext';
import { parseFeedPostTargetUrl } from '../modules/feed/feedPostRouting';
import {
  parseRequestsTargetUrl,
  type RequestsRouteIntent,
} from '../modules/requests/requestsRouting';
import type { SearchUserResult } from '../modules/search/types';
import {
  getDashboardHighlightIdFromTarget,
  getDashboardModuleFromTarget,
  getDashboardUserIdentifierFromTarget,
} from '../components/dashboardTargetUrl';
import type { DashboardHighlightingProps } from './useDashboardHighlighting';

type NotificationNavigationInput = {
  router: { push: (href: string) => void };
  isMobile: boolean;
  highlighting: Pick<DashboardHighlightingProps, 'setHighlightedSkillId'>;
  handleFeedOverlayTargetChange: (target: FeedPostOverlayTarget) => void;
  setActiveModule: (module: string) => void;
  setActiveRightItem: (item: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsNotificationsPanelOpen: (open: boolean) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setViewedUserId: (userId: number | null) => void;
  setViewedUserSlug: (slug: string | null) => void;
  setViewedUserSummary: (summary: SearchUserResult | null) => void;
  setRequestsRouteIntent: Dispatch<SetStateAction<RequestsRouteIntent | null>>;
};

/** Prechod na cieľovú adresu z notifikácie (modul, profil, zvýraznenie, panely, router). */
export function useNotificationNavigation({
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
}: NotificationNavigationInput) {
  const handleNotificationNavigate = useCallback(
    (targetUrl: string) => {
      if (targetUrl !== '/dashboard' && !targetUrl.startsWith('/dashboard/')) {
        return;
      }

      // Feedove notifikacie (lajk, komentar, odpoved, oznacenie, zdielanie)
      // vedu na `/dashboard/feed/<id>`. Na DESKTOPE ich otvori okno nad
      // appkou - pouzivatel tak nepride o to, kde prave bol. Mobil ostava
      // pri celoobrazovkovej stranke.
      const feedTarget = parseFeedPostTargetUrl(targetUrl);
      if (feedTarget && !isMobile) {
        setIsNotificationsPanelOpen(false);
        setIsSearchOpen(false);
        setIsMobileMenuOpen(false);
        handleFeedOverlayTargetChange(feedTarget);
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
      setRequestsRouteIntent,
      setViewedUserId,
      setViewedUserSlug,
      setViewedUserSummary,
      highlighting,
      handleFeedOverlayTargetChange,
      isMobile,
    ],
  );

  return { handleNotificationNavigate };
}

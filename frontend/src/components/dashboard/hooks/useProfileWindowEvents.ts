'use client';

import { useEffect } from 'react';
import type { User } from '@/types';
import { dashboardProfilePath, dashboardSectionPath } from '../components/dashboardRoutes';
import { parseDashboardHighlightId } from '../components/dashboardTargetUrl';
import {
  markProfileFreshEntry,
  profileEntryTargetFromIdentifier,
} from '../modules/profile/profileFreshEntry';
import {
  PROFILE_OFFER_DETAIL_CLOSE_EVENT,
  PROFILE_OFFER_DETAIL_OPEN_EVENT,
} from '../modules/profile/profileOfferDetailEvents';
import { withProfileOriginEntry } from '../modules/profile/profileOriginHistory';
import { getUserIdBySlug } from '../modules/profile/profileUserCache';
import type { DashboardHighlightingProps } from './useDashboardHighlighting';
import type { DashboardUserProfileProps } from './useDashboardUserProfile';

type ProfileWindowEventsInput = {
  user: Pick<User, 'id' | 'slug'> | null;
  userProfile: Pick<
    DashboardUserProfileProps,
    'setViewedUserId' | 'setViewedUserSlug' | 'setViewedUserSummary'
  >;
  highlighting: Pick<DashboardHighlightingProps, 'setHighlightedSkillId'>;
  setActiveModule: (module: string) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
  setActiveRightItem: (item: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsNotificationsPanelOpen: (open: boolean) => void;
  setIsMobileOfferDetailOpen: (open: boolean) => void;
};

/** Globálne udalosti okna: prechod na cudzí a vlastný profil a stav lišty detailu ponuky na mobile. */
export function useProfileWindowEvents({
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
}: ProfileWindowEventsInput) {
  // Globálna navigácia na cudzí profil (napr. zo Žiadostí).
  // Používame event, aby UI reagovalo okamžite aj v prípadoch, keď sa URL zmení bez
  // toho, aby Next router prerenderoval stránku (napr. window.history.pushState).
  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<{
        identifier?: string;
        highlightId?: number | string | null;
        offerId?: number | string | null;
      }>).detail;
      const identifier = (detail?.identifier || '').trim();
      if (!identifier) return;

      // Programovy vstup do profilu = novy vstup (od vrchu, na Ponukach) pre
      // VSETKYCH, co tento event posielaju. Traversal historie ho nenastavuje.
      markProfileFreshEntry(profileEntryTargetFromIdentifier(identifier));

      const rawHighlight = detail?.offerId ?? detail?.highlightId;
      const useOfferParam = detail?.offerId != null;
      const highlightId = parseDashboardHighlightId(rawHighlight);

      // Prepni modul a zavri vedľajšie UI
      setActiveModule('user-profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      setIsNotificationsPanelOpen(false);

      // Nastav, aký profil sa má zobraziť
      if (/^\d+$/.test(identifier)) {
        userProfile.setViewedUserId(Number(identifier));
        userProfile.setViewedUserSlug(null);
      } else {
        userProfile.setViewedUserSlug(identifier);
        userProfile.setViewedUserId(null);

        // Známe ID z cache sa použije hneď (bez siete). Inak slug -> ID prekladá
        // JEDINE efekt v useDashboardUserProfile – so zrušením aj ošetrením chýb.
        // Vlastný fetch tu posielal druhý súbežný request bez zrušenia.
        const cachedId = getUserIdBySlug(identifier);
        if (cachedId) {
          userProfile.setViewedUserId(cachedId);
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
      const profilePath = dashboardProfilePath(identifier);
      if (typeof window !== 'undefined' && profilePath) {
        const url = `${profilePath}${
          highlightId != null
            ? `?${useOfferParam ? 'offer' : 'highlight'}=${encodeURIComponent(String(highlightId))}`
            : ''
        }`;
        window.history.pushState(withProfileOriginEntry(null), '', url);
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

  // Globálna navigácia na vlastný profil (napr. zo Žiadostí pri prijatej žiadosti).
  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<{ highlightId?: number | string | null }>).detail;
      const highlightId = parseDashboardHighlightId(detail?.highlightId);

      // Novy vstup do vlastneho profilu – rovnako ako `goToUserProfile`.
      markProfileFreshEntry({ id: user?.id, slug: user?.slug });

      setActiveModule('profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      setIsNotificationsPanelOpen(false);

      // vyčisti stav cudzích profilov, aby sa UI nemiešalo
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

      const ownProfilePath = dashboardSectionPath('profile');
      if (typeof window !== 'undefined' && ownProfilePath) {
        const url = `${ownProfilePath}${
          highlightId != null ? `?highlight=${encodeURIComponent(String(highlightId))}` : ''
        }`;
        window.history.pushState(withProfileOriginEntry(null), '', url);
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
    user?.id,
    user?.slug,
  ]);

  useEffect(() => {
    const onOpen = () => setIsMobileOfferDetailOpen(true);
    const onClose = () => setIsMobileOfferDetailOpen(false);

    window.addEventListener(PROFILE_OFFER_DETAIL_OPEN_EVENT, onOpen);
    window.addEventListener(PROFILE_OFFER_DETAIL_CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener(PROFILE_OFFER_DETAIL_OPEN_EVENT, onOpen);
      window.removeEventListener(PROFILE_OFFER_DETAIL_CLOSE_EVENT, onClose);
    };
  }, [setIsMobileOfferDetailOpen]);
}

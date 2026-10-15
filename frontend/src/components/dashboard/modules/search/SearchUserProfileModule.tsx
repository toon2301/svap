"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks";
import type { SearchUserResult } from "./types";
import ProfileMobileView from "../profile/ProfileMobileView";
import ProfileDesktopView from "../profile/ProfileDesktopView";
import ProfileWebsitesModal from "../profile/ProfileWebsitesModal";
import OfferImageGalleryLightbox from "../shared/OfferImageGalleryLightbox";
import type { ProfileTab } from "../profile/profileTypes";
import { useProfileTabQuery } from "../profile/profileTabQuery";
import { useProfileFreshEntry } from "../profile/useProfileFreshEntry";

import { BlockUserConfirmDialog } from '../profile/BlockUserConfirmDialog';
import { useBlockUserAction } from '../profile/useBlockUserAction';
import { DASHBOARD_HOME_PATH } from '../../components/dashboardRoutes';
import { adoptProfileOrigin } from '../profile/profileOriginHistory';
import { getProfileAvatarUrl } from './foreignProfileHelpers';
import { useForeignProfileActions } from './useForeignProfileActions';
import { useForeignProfileData } from './useForeignProfileData';

interface SearchUserProfileModuleProps {
  userId: number;
  currentUserId: number;
  onBack?: () => void;
  onSendMessage?: () => void;
  highlightedSkillId?: number | null;
  initialSummary?: SearchUserResult;
  initialTab?: ProfileTab;
}

export function SearchUserProfileModule({
  userId,
  currentUserId,
  // onBack is still accepted for API compatibility but no longer consumed:
  // the block redirect and the unreachable-profile fallback both go to
  // /dashboard rather than back to search.
  highlightedSkillId = null,
  initialTab,
}: SearchUserProfileModuleProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  // Rovnaké naviazanie na adresu ako pri vlastnom profile – bez neho záložku
  // cudzieho profilu zhodilo F5 aj krok späť a pri návrate na profil ostávala
  // visieť tá, ktorú si používateľ pozeral naposledy.
  const [activeTab, setActiveTab] = useProfileTabQuery(initialTab ?? "offers", userId);

  // Záznam tohto profilu už existuje – ak ho otvorila appka cez router
  // (vyhľadávanie), dostane pôvod pre appkovú šípku. `router.push` ho pripnúť
  // dopredu nevie, preto sa preberá až tu.
  useEffect(() => {
    adoptProfileOrigin();
  }, [userId]);

  // Nový vstup cez preklik: od vrchu a na Ponukách – rovnako ako na vlastnom
  // profile. F5 ani krok späť/dopredu to nespúšťa.
  const isFreshEntry = useProfileFreshEntry(userId);
  useEffect(() => {
    if (!isFreshEntry) return;
    setActiveTab("offers", { replace: true });
  }, [isFreshEntry, setActiveTab]);

  // Preklik na KONKRÉTNU ponuku musí skončiť na záložke ponúk.
  //
  // Adresu mení `goToUserProfile` cez `history.pushState`, čo nevyvolá
  // `popstate` ani zmenu `usePathname` – modul teda nemá z čoho spoznať, že
  // sa cieľ zmenil, a ostala by svietiť záložka z predošlej návštevy
  // (typicky portfólio). `highlightedSkillId` je jediný signál, ktorý sem
  // o tomto preklike dorazí. Vlastný profil to takto rieši v `ProfileModule`
  // od začiatku; cudzí profil na to vetvu nemal.
  useEffect(() => {
    // `replace`: zalozku prepina appka podla ciela prekliku, nie pouzivatel –
    // rovnako ako v ProfileModule. Krok spat teda nema viest do zalozky, ktoru
    // si nevybral.
    if (highlightedSkillId != null) setActiveTab("offers", { replace: true });
  }, [highlightedSkillId, setActiveTab]);

  const { profileUser, setProfileUser, isLoading, error, removeTargetFromClientState } =
    useForeignProfileData(userId, currentUserId);
  const [isAllWebsitesModalOpen, setIsAllWebsitesModalOpen] = useState(false);
  const [isAvatarLightboxOpen, setIsAvatarLightboxOpen] = useState(false);
  const {
    isOpeningConversation,
    isFavoritePending,
    isProfileLikePending,
    handleSendMessage,
    handleToggleFavorite,
    handleToggleProfileLike,
  } = useForeignProfileActions({ profileUser, setProfileUser });

  // Zmena profilu zatvorí otvorené zväčšenie avatara. Závislosti sú rovnaké ako pri načítaní
  // profilu, takže ho zatvorí aj zmena prihláseného používateľa.
  useEffect(() => {
    setIsAvatarLightboxOpen(false);
  }, [removeTargetFromClientState, userId]);

  const handleBlocked = React.useCallback(() => {
    // Navigate to the main dashboard (same route as the sidebar logo/home
    // link), not back to search — the blocked profile is no longer relevant
    // to return to. This is a real route change (see app/dashboard/page.tsx),
    // so the old module state does not need to be reset here.
    removeTargetFromClientState();
    router.replace(DASHBOARD_HOME_PATH);
  }, [removeTargetFromClientState, router]);

  const blockAction = useBlockUserAction({
    targetUserId: userId,
    onBlocked: handleBlocked,
  });

  const handleTabsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const order: ProfileTab[] = ["offers", "portfolio", "posts", "tagged"];
    const currentIndex = order.indexOf(activeTab);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = (currentIndex + 1) % order.length;
      setActiveTab(order[next]);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = (currentIndex - 1 + order.length) % order.length;
      setActiveTab(order[prev]);
    }
  };

  if (isLoading && !profileUser) {
    return (
      <div className="w-full flex items-center justify-center py-16 text-gray-600 dark:text-gray-300">
        {t("search.userProfileLoading", "Načítavam profil používateľa...")}
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 text-center text-red-600 dark:text-red-400 px-4">
        <p className="text-sm mb-2">{error}</p>
        {/* An unreachable profile (e.g. blocked) has no search context to return
            to, so go to the main dashboard instead of the search results. */}
        <button
          type="button"
          onClick={() => router.replace(DASHBOARD_HOME_PATH)}
          className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <span>{t("search.backToDashboard", "Späť na nástenku")}</span>
        </button>
      </div>
    );
  }

  if (!profileUser) {
    return null;
  }

  // Určiť accountType na základe user_type používateľa.
  const accountType = profileUser.user_type === 'company' ? 'business' : 'personal';
  const profileAvatarUrl = getProfileAvatarUrl(profileUser);
  const profileDisplayName =
    `${profileUser.first_name || ''} ${profileUser.last_name || ''}`.trim() ||
    profileUser.username ||
    t('skills.photos', 'Fotky');
  const profileAvatarImages = profileAvatarUrl ? [{ image_url: profileAvatarUrl }] : [];
  const canBlockUser = profileUser.id !== currentUserId;
  const handleAvatarClick = () => {
    if (!profileAvatarUrl) return;
    setIsAvatarLightboxOpen(true);
  };

  // Mobilné aj desktopové zobrazenie dostávajú rovnaké vlastnosti.
  const profileViewProps: React.ComponentProps<typeof ProfileDesktopView> = {
    user: profileUser,
    displayUser: profileUser,
    isEditMode: false,
    accountType,
    isUploading: false,
    onUserUpdate: undefined,
    onEditProfileClick: undefined,
    onPhotoUpload: () => {},
    onAvatarClick: handleAvatarClick,
    onSkillsClick: undefined,
    activeTab,
    onChangeTab: setActiveTab,
    onTabsKeyDown: handleTabsKeyDown,
    onOpenAllWebsitesModal: () => setIsAllWebsitesModalOpen(true),
    offersOwnerId: profileUser.id,
    ownerSlug: profileUser.slug,
    isOtherUserProfile: true,
    highlightedSkillId,
    onSendMessage: handleSendMessage,
    isOpeningConversation,
    onToggleFavorite: handleToggleFavorite,
    isFavorited: Boolean(profileUser.is_favorited),
    isFavoritePending,
    onToggleProfileLike: handleToggleProfileLike,
    isProfileLikePending,
    onBlockClick: canBlockUser ? blockAction.openConfirm : undefined,
  };

  return (
    <>
      <div className="max-w-2xl lg:max-w-full mx-auto lg:mx-0 text-[var(--foreground)] w-full">
        {isMobile ? (
          <ProfileMobileView {...profileViewProps} />
        ) : (
          <ProfileDesktopView {...profileViewProps} />
        )}
      </div>

      <ProfileWebsitesModal
        open={isAllWebsitesModalOpen}
        user={profileUser}
        onClose={() => setIsAllWebsitesModalOpen(false)}
      />

      <OfferImageGalleryLightbox
        open={isAvatarLightboxOpen}
        images={profileAvatarImages}
        alt={profileDisplayName}
        onClose={() => setIsAvatarLightboxOpen(false)}
        reportTarget={{ type: 'user_avatar', userId: profileUser.id }}
      />

      <BlockUserConfirmDialog
        open={blockAction.isConfirmOpen}
        isBlocking={blockAction.isBlocking}
        onClose={blockAction.closeConfirm}
        onConfirm={() => {
          void blockAction.confirmBlock();
        }}
      />
    </>
  );
}

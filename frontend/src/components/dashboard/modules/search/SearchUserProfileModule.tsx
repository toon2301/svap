"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks";
import { api, endpoints } from "@/lib/api";
import type { User } from "@/types";
import type { SearchUserResult } from "./types";
import { setFavoriteUserState } from "../favoritesApi";
import {
  getUserProfileFromCache,
  invalidateUserProfileCache,
  patchUserProfileInCache,
  setUserProfileToCache,
} from "../profile/profileUserCache";
import ProfileMobileView from "../profile/ProfileMobileView";
import ProfileDesktopView from "../profile/ProfileDesktopView";
import ProfileWebsitesModal from "../profile/ProfileWebsitesModal";
import { setProfileLikeState, type ProfileLikeResponse } from "../profile/profileLikesApi";
import OfferImageGalleryLightbox from "../shared/OfferImageGalleryLightbox";
import type { ProfileTab } from "../profile/profileTypes";
import { getMessagingErrorMessage } from "../messages/messagingApi";
import { buildMessagesUrl } from "../messages/messagesRouting";

import { invalidateOffersCache } from '../profile/profileOffersCache';
import { BlockUserConfirmDialog } from '../profile/BlockUserConfirmDialog';
import { useBlockUserAction } from '../profile/useBlockUserAction';
import { invalidateSearchCacheForUser } from './hooks/useSearchApi';
import { removeUserFromRecentSearches } from './recentSearchStorage';

type SearchProfileApiError = {
  response?: {
    status?: number;
    data?: {
      error?: string;
      detail?: string;
    };
  };
  message?: string;
};

interface SearchUserProfileModuleProps {
  userId: number;
  currentUserId: number;
  onBack?: () => void;
  onSendMessage?: () => void;
  highlightedSkillId?: number | null;
  initialSummary?: SearchUserResult;
  initialTab?: ProfileTab;
}

function withStableAvatarVersion(url: string, version?: string | null): string {
  const cleanVersion = String(version || '').trim();
  if (!cleanVersion) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(cleanVersion)}`;
}

function getProfileAvatarUrl(user: User): string | null {
  const rawUrl = user.avatar_url || user.avatar || '';
  const cleanUrl = rawUrl.trim();
  return cleanUrl ? withStableAvatarVersion(cleanUrl, user.updated_at) : null;
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
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab ?? "offers");
  const [isAllWebsitesModalOpen, setIsAllWebsitesModalOpen] = useState(false);
  const [isAvatarLightboxOpen, setIsAvatarLightboxOpen] = useState(false);
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isProfileLikePending, setIsProfileLikePending] = useState(false);

  const removeTargetFromClientState = React.useCallback(() => {
    invalidateUserProfileCache(userId);
    invalidateOffersCache(userId);
    invalidateSearchCacheForUser(userId);
    removeUserFromRecentSearches(currentUserId, userId);
  }, [currentUserId, userId]);

  const handleBlocked = React.useCallback(() => {
    // Navigate to the main dashboard (same route as the sidebar logo/home
    // link), not back to search — the blocked profile is no longer relevant
    // to return to. This is a real route change (see app/dashboard/page.tsx),
    // so the old module state does not need to be reset here.
    removeTargetFromClientState();
    router.replace('/dashboard');
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

  useEffect(() => {
    let cancelled = false;
    setIsAvatarLightboxOpen(false);

    const load = async () => {
      setIsLoading(true);
      setError(null);

      // Invalidovať cache ponúk pre cudzí profil, aby sa načítali čerstvé dáta
      // vrátane filtrovania skrytých kariet.
      // Toto zabezpečí, že skryté karty sa nezobrazia v profile iného používateľa.
      invalidateOffersCache(userId);

      // Najprv skús cache profilu pre rýchle zobrazenie, ale vždy dotiahni
      // čerstvé dáta z API. Inak sa po zmene súkromia (napr.
      // contact_email_visible) môže profil javiť "zaseknutý" až do vypršania TTL.
      const cached = getUserProfileFromCache(userId);
      if (cached && !cancelled) {
        setProfileUser(cached);
        setIsLoading(false);
      }

      try {
        const { data } = await api.get<User>(endpoints.dashboard.userProfile(userId));

        if (cancelled) return;

        setProfileUser(data);
        setUserProfileToCache(userId, data);
        
        // Ak má používateľ slug a URL má ID namiesto slugu, aktualizovať URL.
        if (data.slug) {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          if (currentPath.startsWith('/dashboard/users/')) {
            const currentIdentifier = currentPath.replace('/dashboard/users/', '').split('/')[0];
            // Ak je aktuálny identifikátor číslo (ID) a máme slug, aktualizovať URL.
            if (/^\d+$/.test(currentIdentifier) && currentIdentifier !== data.slug) {
              const newUrl = `/dashboard/users/${data.slug}`;
              
              // Okamžitá aktualizácia URL bez reloadu.
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', newUrl);
              }
              
              // Aktualizovať aj cez Next.js router.
              router.push(newUrl);
            }
          }
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const apiError = error as SearchProfileApiError;
        const status = apiError.response?.status;
        if (status === 404) {
          removeTargetFromClientState();
          setProfileUser(null);
        }
        const msg =
          status === 404
            ? t('search.userProfileNotFound', 'Profil používateľa sa nepodarilo načítať.')
            : status === 429
            ? t(
                "search.userProfileRateLimited",
                "Príliš veľa požiadaviek pri načítavaní profilu, skúste to o chvíľu.",
              )
            : apiError.response?.data?.error ||
              apiError.response?.data?.detail ||
              apiError.message ||
              t("search.userProfileLoadError", "Nepodarilo sa načítať profil používateľa.");
        setError(msg);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // Zámerne neuvádzame t v závislostiach, aby sa pri zmene jazyka nespúšťal
    // nový network request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeTargetFromClientState, userId]);

  const handleSendMessage = () => {
    const targetId = profileUser?.id;
    if (!targetId || isOpeningConversation) return;
    void (async () => {
      setIsOpeningConversation(true);
      try {
        router.push(buildMessagesUrl(null, { targetUserId: targetId }));
      } catch (error) {
        toast.error(
          getMessagingErrorMessage(error, {
            fallback: t('messages.openFailed', 'Nepodarilo sa otvoriť konverzáciu. Skúste to znova.'),
            rateLimitFallback: t(
              'messages.openRateLimited',
              'Konverzácie otvárate príliš rýchlo. Skúste chvíľu počkať.',
            ),
            unavailableFallback: t(
              'messages.openUnavailable',
              'Používateľovi momentálne nie je možné napísať.',
            ),
          }),
        );
      } finally {
        setIsOpeningConversation(false);
      }
    })();
  };

  const handleToggleFavorite = async () => {
    if (!profileUser || isFavoritePending) return;
    if (!Number.isInteger(profileUser.id) || profileUser.id <= 0) return;

    const nextIsFavorited = !Boolean(profileUser.is_favorited);
    setIsFavoritePending(true);

    try {
      await setFavoriteUserState(profileUser.id, nextIsFavorited);

      setProfileUser((current) => {
        if (!current) return current;
        return {
          ...current,
          is_favorited: nextIsFavorited,
        };
      });
      patchUserProfileInCache(profileUser.id, {
        is_favorited: nextIsFavorited,
      });
    } catch (error: unknown) {
      const apiError = error as SearchProfileApiError;
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.detail ||
        apiError.message ||
        (nextIsFavorited
          ? t('search.addToFavoritesError', 'Nepodarilo sa pridať k obľúbeným.')
          : t('search.removeFromFavoritesError', 'Nepodarilo sa odobrať z obľúbených.'));
      toast.error(message);
    } finally {
      setIsFavoritePending(false);
    }
  };


  const applyProfileLikeState = (data: ProfileLikeResponse) => {
    const nextLiked = data.is_profile_liked_by_me === true;
    const nextCount = Math.max(0, Number(data.profile_likes_count ?? 0));
    setProfileUser((current) => {
      if (!current) return current;
      return {
        ...current,
        is_profile_liked_by_me: nextLiked,
        profile_likes_count: nextCount,
      };
    });
    patchUserProfileInCache(data.profile_user_id, {
      is_profile_liked_by_me: nextLiked,
      profile_likes_count: nextCount,
    });
  };

  const handleToggleProfileLike = async () => {
    if (!profileUser || isProfileLikePending) return;
    if (!Number.isInteger(profileUser.id) || profileUser.id <= 0) return;

    const previousLiked = profileUser.is_profile_liked_by_me === true;
    const previousCount = Math.max(0, Number(profileUser.profile_likes_count ?? 0));
    const nextLiked = !previousLiked;
    const optimisticCount = nextLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

    setIsProfileLikePending(true);
    setProfileUser((current) =>
      current
        ? {
            ...current,
            is_profile_liked_by_me: nextLiked,
            profile_likes_count: optimisticCount,
          }
        : current,
    );
    patchUserProfileInCache(profileUser.id, {
      is_profile_liked_by_me: nextLiked,
      profile_likes_count: optimisticCount,
    });

    try {
      const data = await setProfileLikeState(profileUser.id, nextLiked);
      applyProfileLikeState(data);
    } catch (error: unknown) {
      const apiError = error as SearchProfileApiError;
      setProfileUser((current) =>
        current
          ? {
              ...current,
              is_profile_liked_by_me: previousLiked,
              profile_likes_count: previousCount,
            }
          : current,
      );
      patchUserProfileInCache(profileUser.id, {
        is_profile_liked_by_me: previousLiked,
        profile_likes_count: previousCount,
      });
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.detail ||
        apiError.message ||
        t('profile.profileLikeUpdateFailed', 'Nepodarilo sa aktualizovat paci sa mi.');
      toast.error(message);
    } finally {
      setIsProfileLikePending(false);
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
          onClick={() => router.replace('/dashboard')}
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

  return (
    <>
      <div className="max-w-2xl lg:max-w-full mx-auto lg:mx-0 text-[var(--foreground)] w-full">
        {isMobile ? (
          <ProfileMobileView
            user={profileUser}
            displayUser={profileUser}
            isEditMode={false}
            accountType={accountType}
            isUploading={false}
            onUserUpdate={undefined}
            onEditProfileClick={undefined}
            onPhotoUpload={() => {}}
            onAvatarClick={handleAvatarClick}
            onSkillsClick={undefined}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onTabsKeyDown={handleTabsKeyDown}
            onOpenAllWebsitesModal={() => setIsAllWebsitesModalOpen(true)}
            offersOwnerId={profileUser.id}
            ownerSlug={profileUser.slug}
            isOtherUserProfile={true}
            highlightedSkillId={highlightedSkillId}
            onSendMessage={handleSendMessage}
            isOpeningConversation={isOpeningConversation}
            onToggleFavorite={handleToggleFavorite}
            isFavorited={Boolean(profileUser.is_favorited)}
            isFavoritePending={isFavoritePending}
            onToggleProfileLike={handleToggleProfileLike}
            isProfileLikePending={isProfileLikePending}
            onBlockClick={canBlockUser ? blockAction.openConfirm : undefined}
          />
        ) : (
          <ProfileDesktopView
            user={profileUser}
            displayUser={profileUser}
            isEditMode={false}
            accountType={accountType}
            isUploading={false}
            onUserUpdate={undefined}
            onEditProfileClick={undefined}
            onPhotoUpload={() => {}}
            onAvatarClick={handleAvatarClick}
            onSkillsClick={undefined}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onTabsKeyDown={handleTabsKeyDown}
            onOpenAllWebsitesModal={() => setIsAllWebsitesModalOpen(true)}
            offersOwnerId={profileUser.id}
            ownerSlug={profileUser.slug}
            isOtherUserProfile={true}
            highlightedSkillId={highlightedSkillId}
            onSendMessage={handleSendMessage}
            isOpeningConversation={isOpeningConversation}
            onToggleFavorite={handleToggleFavorite}
            isFavorited={Boolean(profileUser.is_favorited)}
            isFavoritePending={isFavoritePending}
            onToggleProfileLike={handleToggleProfileLike}
            isProfileLikePending={isProfileLikePending}
            onBlockClick={canBlockUser ? blockAction.openConfirm : undefined}
          />
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




"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks";
import { api, endpoints } from "@/lib/api";
import type { User } from "@/types";
import type { SearchUserResult } from "./types";
import {
  getUserProfileFromCache,
  setUserProfileToCache,
} from "../profile/profileUserCache";
import ProfileMobileView from "../profile/ProfileMobileView";
import ProfileDesktopView from "../profile/ProfileDesktopView";
import ProfileWebsitesModal from "../profile/ProfileWebsitesModal";
import type { ProfileTab } from "../profile/profileTypes";
import { getMessagingErrorMessage } from "../messages/messagingApi";
import { buildMessagesUrl } from "../messages/messagesRouting";

interface SearchUserProfileModuleProps {
  userId: number;
  onBack?: () => void;
  onSendMessage?: () => void;
  highlightedSkillId?: number | null;
  initialSummary?: SearchUserResult;
  initialTab?: ProfileTab;
}

export function SearchUserProfileModule({
  userId,
  onBack,
  onSendMessage,
  highlightedSkillId = null,
  initialSummary,
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
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);

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

    const load = async () => {
      setIsLoading(true);
      setError(null);

      // InvalidovaÅ¥ cache ponÃºk pre cudzÃ­ profil, aby sa naÄÃ­tali ÄerstvÃ© dÃ¡ta (vrÃ¡tane filtrovania skrytÃ½ch kariet)
      // Toto zabezpeÄÃ­, Å¾e skrytÃ© karty sa nezobrazia v profile inÃ©ho pouÅ¾Ã­vateÄ¾a
      const { invalidateOffersCache } = await import('../profile/profileOffersCache');
      invalidateOffersCache(userId);

      // Najprv skÃºs cache profilu (pre rÃ½chle zobrazenie), ale vÅ¾dy dotiahni ÄerstvÃ© dÃ¡ta z API.
      // Inak sa po zmene sÃºkromia (napr. contact_email_visible) mÃ´Å¾e profil javiÅ¥ "zaseknutÃ½" aÅ¾ do vyprÅ¡ania TTL.
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
        
        // Ak mÃ¡ pouÅ¾Ã­vateÄ¾ slug a URL mÃ¡ ID namiesto slugu, aktualizovaÅ¥ URL
        if (data.slug) {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          if (currentPath.startsWith('/dashboard/users/')) {
            const currentIdentifier = currentPath.replace('/dashboard/users/', '').split('/')[0];
            // Ak je aktuÃ¡lny identifikÃ¡tor ÄÃ­slo (ID) a mÃ¡me slug, aktualizovaÅ¥ URL
            if (/^\d+$/.test(currentIdentifier) && currentIdentifier !== data.slug) {
              const newUrl = `/dashboard/users/${data.slug}`;
              
              // OkamÅ¾itÃ¡ aktualizÃ¡cia URL (bez reloadu)
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', newUrl);
              }
              
              // AktualizovaÅ¥ cez Next.js router
              router.push(newUrl);
            }
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        const status = e?.response?.status;
        const msg =
          status === 429
            ? t(
                "search.userProfileRateLimited",
                "PrÃ­liÅ¡ veÄ¾a poÅ¾iadaviek pri naÄÃ­tavanÃ­ profilu, skÃºste to o chvÃ­Ä¾u.",
              )
            : e?.response?.data?.error ||
              e?.response?.data?.detail ||
              e?.message ||
              t("search.userProfileLoadError", "Nepodarilo sa naÄÃ­taÅ¥ profil pouÅ¾Ã­vateÄ¾a.");
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
    // zÃ¡merne neuvÃ¡dzame t v zÃ¡vislostiach, aby sa pri zmene jazyka nespÃºÅ¡Å¥al novÃ½ network request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  const handleAddToFavorites = async () => {
    if (!profileUser) return;

    try {
      await api.post(endpoints.dashboard.favorites, {
        type: 'user',
        id: profileUser.id,
      });
      // Show success message (could use toast notification)
      // eslint-disable-next-line no-console
      console.log('PouÅ¾Ã­vateÄ¾ bol pridanÃ½ k obÄ¾ÃºbenÃ½m');
    } catch (error: any) {
      // Show error message (could use toast notification)
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        t('search.addToFavoritesError', 'Nepodarilo sa pridaÅ¥ k obÄ¾ÃºbenÃ½m.');
      // eslint-disable-next-line no-console
      console.error(message);
    }
  };

  if (isLoading && !profileUser) {
    return (
      <div className="w-full flex items-center justify-center py-16 text-gray-600 dark:text-gray-300">
        {t("search.userProfileLoading", "NaÄÃ­tavam profil pouÅ¾Ã­vateÄ¾a...")}
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 text-center text-red-600 dark:text-red-400 px-4">
        <p className="text-sm mb-2">{error}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span>{t("search.backToResults", "SpÃ¤Å¥ na vyhÄ¾adÃ¡vanie")}</span>
          </button>
        )}
      </div>
    );
  }

  if (!profileUser) {
    return null;
  }

  // UrÄiÅ¥ accountType na zÃ¡klade user_type pouÅ¾Ã­vateÄ¾a
  const accountType = profileUser.user_type === 'company' ? 'business' : 'personal';

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
            onAvatarClick={() => {}}
            onSkillsClick={undefined}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onTabsKeyDown={handleTabsKeyDown}
            onOpenAllWebsitesModal={() => setIsAllWebsitesModalOpen(true)}
            offersOwnerId={profileUser.id}
            isOtherUserProfile={true}
            highlightedSkillId={highlightedSkillId}
            onSendMessage={handleSendMessage}
            isOpeningConversation={isOpeningConversation}
            onAddToFavorites={handleAddToFavorites}
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
            onAvatarClick={() => {}}
            onSkillsClick={undefined}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onTabsKeyDown={handleTabsKeyDown}
            onOpenAllWebsitesModal={() => setIsAllWebsitesModalOpen(true)}
            offersOwnerId={profileUser.id}
            isOtherUserProfile={true}
            highlightedSkillId={highlightedSkillId}
            onSendMessage={handleSendMessage}
            isOpeningConversation={isOpeningConversation}
            onAddToFavorites={handleAddToFavorites}
          />
        )}
      </div>

      <ProfileWebsitesModal
        open={isAllWebsitesModalOpen}
        user={profileUser}
        onClose={() => setIsAllWebsitesModalOpen(false)}
      />
    </>
  );
}




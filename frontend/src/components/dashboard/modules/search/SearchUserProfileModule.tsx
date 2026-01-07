"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { api, endpoints } from "@/lib/api";
import type { User } from "@/types";
import ProfileMobileView from "../profile/ProfileMobileView";
import ProfileDesktopView from "../profile/ProfileDesktopView";
import ProfileWebsitesModal from "../profile/ProfileWebsitesModal";
import type { ProfileTab } from "../profile/profileTypes";

interface SearchUserProfileModuleProps {
  userId: number;
  onBack?: () => void;
  onSendMessage?: () => void;
  highlightedSkillId?: number | null;
}

export function SearchUserProfileModule({ userId, onBack, onSendMessage, highlightedSkillId = null }: SearchUserProfileModuleProps) {
  const { t } = useLanguage();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("offers");
  const [isAllWebsitesModalOpen, setIsAllWebsitesModalOpen] = useState(false);

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
      try {
        setIsLoading(true);
        setError(null);

        const { data } = await api.get<User>(endpoints.dashboard.userProfile(userId));

        if (cancelled) return;

        setProfileUser(data);
      } catch (e: any) {
        if (cancelled) return;
        const msg =
          e?.response?.data?.error ||
          e?.response?.data?.detail ||
          e?.message ||
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
  }, [userId, t]);

  const handleSendMessage = () => {
    if (onSendMessage) {
      onSendMessage();
    } else {
      // Fallback: dispatch custom event to navigate to messages
      window.dispatchEvent(new CustomEvent('goToMessages', { detail: { userId: profileUser?.id } }));
    }
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
      console.log('Používateľ bol pridaný k obľúbeným');
    } catch (error: any) {
      // Show error message (could use toast notification)
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        t('search.addToFavoritesError', 'Nepodarilo sa pridať k obľúbeným.');
      // eslint-disable-next-line no-console
      console.error(message);
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
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span>{t("search.backToResults", "Späť na vyhľadávanie")}</span>
          </button>
        )}
      </div>
    );
  }

  if (!profileUser) {
    return null;
  }

  return (
    <>
      <div className="max-w-2xl lg:max-w-full mx-auto lg:mx-0 text-[var(--foreground)] w-full">
        <ProfileMobileView
          user={profileUser}
          displayUser={profileUser}
          isEditMode={false}
          accountType="personal"
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
          onAddToFavorites={handleAddToFavorites}
        />

        <ProfileDesktopView
          user={profileUser}
          displayUser={profileUser}
          isEditMode={false}
          accountType="personal"
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
          onAddToFavorites={handleAddToFavorites}
        />
      </div>

      <ProfileWebsitesModal
        open={isAllWebsitesModalOpen}
        user={profileUser}
        onClose={() => setIsAllWebsitesModalOpen(false)}
      />
    </>
  );
}



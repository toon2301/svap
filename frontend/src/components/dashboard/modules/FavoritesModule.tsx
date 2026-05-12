'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { HeartIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useLanguage } from '@/contexts/LanguageContext';
import type { DashboardFavoriteUser } from './favoritesApi';
import { fetchFavoriteUsers, setFavoriteUserState } from './favoritesApi';
import { buildMessagesUrl } from './messages/messagesRouting';
import { patchUserProfileInCache } from './profile/profileUserCache';
import BlurredContainImage from './shared/BlurredContainImage';

type ApiErrorLike = {
  response?: {
    data?: {
      error?: string;
      detail?: string;
    };
  };
  message?: string;
};

function buildProfileUrl(user: Pick<DashboardFavoriteUser, 'id' | 'slug'>): string {
  const identifier = user.slug && user.slug.trim() ? user.slug.trim() : String(user.id);
  return `/dashboard/users/${encodeURIComponent(identifier)}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;
  return apiError.response?.data?.error || apiError.response?.data?.detail || apiError.message || fallback;
}

function initialsFromName(name: string): string {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  const first = (parts[0] || '').slice(0, 1);
  const second = (parts[1] || '').slice(0, 1);
  return `${first}${second}`.toUpperCase() || 'U';
}

export default function FavoritesModule() {
  const router = useRouter();
  const { t } = useLanguage();
  const [favoriteUsers, setFavoriteUsers] = useState<DashboardFavoriteUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

  const handleOpenMessages = (favoriteUser: DashboardFavoriteUser) => {
    if (!Number.isInteger(favoriteUser.id) || favoriteUser.id <= 0) return;
    router.push(buildMessagesUrl(null, { targetUserId: favoriteUser.id }));
  };

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const users = await fetchFavoriteUsers();
        if (!cancelled) {
          setFavoriteUsers(users);
        }
      } catch (loadError: unknown) {
        if (cancelled) return;
        const message = getErrorMessage(
          loadError,
          t('favorites.loadError', 'Nepodarilo sa nacitat oblubenych pouzivatelov.'),
        );
        setError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFavorites();

    return () => {
      cancelled = true;
    };
    // Zamerne neuvadzame t v zavislostiach, aby sa pri zmene jazyka
    // zbytocne nespustal novy request na tie iste data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveFavorite = async (favoriteUser: DashboardFavoriteUser) => {
    if (pendingRemoveId === favoriteUser.id) return;

    setPendingRemoveId(favoriteUser.id);
    try {
      await setFavoriteUserState(favoriteUser.id, false);
      setFavoriteUsers((current) => current.filter((item) => item.id !== favoriteUser.id));
      patchUserProfileInCache(favoriteUser.id, { is_favorited: false });
    } catch (removeError: unknown) {
      const message = getErrorMessage(
        removeError,
        t('favorites.removeError', 'Nepodarilo sa odobrat pouzivatela z oblubenych.'),
      );
      toast.error(message);
    } finally {
      setPendingRemoveId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="mx-auto hidden w-full max-w-4xl space-y-1 lg:block">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          {t('navigation.favorites', 'Obľúbené')}
        </h1>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('favorites.description', 'Zoznam používateľov, ktorých si chcete mať rýchlo po ruke.')}
        </p>
        <div className="h-px w-full bg-gray-200 dark:bg-gray-800" />
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-[#0f0f10] dark:text-gray-400">
          {t('favorites.loading', 'Nacitavam oblubenych pouzivatelov...')}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-white p-12 text-center shadow-sm dark:border-red-900/40 dark:bg-[#0f0f10]">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : favoriteUsers.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-[#0f0f10]">
          <HeartIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {t('favorites.emptyTitle', 'Zatial nemate ziadnych oblubenych pouzivatelov')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t(
              'favorites.emptyHint',
              'Ked si niekoho pridate k oblubenym v profile, zobrazi sa tu.',
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {favoriteUsers.map((favoriteUser) => {
            const displayName = favoriteUser.display_name || t('favorites.unknownUser', 'Pouzivatel');
            const initials = initialsFromName(displayName);
            const isRemoving = pendingRemoveId === favoriteUser.id;

            return (
              <motion.div
                key={favoriteUser.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-[#202223]"
              >
                <button
                  type="button"
                  onClick={() => router.push(buildProfileUrl(favoriteUser))}
                  className="block w-full text-left"
                  aria-label={displayName}
                >
                  <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-purple-100 dark:bg-purple-950/40">
                    {favoriteUser.avatar_url ? (
                      <BlurredContainImage
                        src={favoriteUser.avatar_url}
                        alt={displayName}
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-purple-700 dark:text-purple-200">
                        {initials || <UserIcon className="h-14 w-14" />}
                      </span>
                    )}
                  </div>
                </button>

                <div className="space-y-3 p-3">
                  <button
                    type="button"
                    onClick={() => router.push(buildProfileUrl(favoriteUser))}
                    className="block w-full text-left"
                  >
                    <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                      {displayName}
                    </h2>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMessages(favoriteUser)}
                    className="w-full rounded-lg border border-purple-200 bg-purple-100 px-4 py-2.5 text-sm font-semibold text-purple-800 transition-colors hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-800/60 dark:bg-purple-900/40 dark:text-purple-100 dark:hover:bg-purple-900/60 dark:focus-visible:ring-purple-500/40"
                  >
                    {t('skills.message', 'Sprava')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleRemoveFavorite(favoriteUser);
                    }}
                    disabled={isRemoving}
                    className="w-full rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#3a3c3d] dark:text-white dark:hover:bg-[#454748]"
                  >
                    {t('favorites.removeAction', 'Odobrat')}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

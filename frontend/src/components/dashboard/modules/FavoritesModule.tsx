'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { HeartIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useLanguage } from '@/contexts/LanguageContext';
import type { DashboardFavoriteUser } from './favoritesApi';
import { fetchFavoriteUsers, setFavoriteUserState } from './favoritesApi';
import { patchUserProfileInCache } from './profile/profileUserCache';

function buildProfileUrl(user: Pick<DashboardFavoriteUser, 'id' | 'slug'>): string {
  const identifier = user.slug && user.slug.trim() ? user.slug.trim() : String(user.id);
  return `/dashboard/users/${encodeURIComponent(identifier)}`;
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
      } catch (loadError: any) {
        if (cancelled) return;
        const message =
          loadError?.response?.data?.error ||
          loadError?.response?.data?.detail ||
          loadError?.message ||
          t('favorites.loadError', 'Nepodarilo sa načítať obľúbených používateľov.');
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
    // Zámerne neuvádzame t v závislostiach, aby sa pri zmene jazyka
    // zbytočne nespúšťal nový request na tie isté dáta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveFavorite = async (favoriteUser: DashboardFavoriteUser) => {
    if (pendingRemoveId === favoriteUser.id) return;

    setPendingRemoveId(favoriteUser.id);
    try {
      await setFavoriteUserState(favoriteUser.id, false);
      setFavoriteUsers((current) => current.filter((item) => item.id !== favoriteUser.id));
      patchUserProfileInCache(favoriteUser.id, { is_favorited: false });
    } catch (removeError: any) {
      const message =
        removeError?.response?.data?.error ||
        removeError?.response?.data?.detail ||
        removeError?.message ||
        t('favorites.removeError', 'Nepodarilo sa odobrať používateľa z obľúbených.');
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('navigation.favorites', 'Obľúbené')}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {t(
            'favorites.description',
            'Zoznam používateľov, ktorých si chcete mať rýchlo po ruke.',
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-sm text-gray-500">
          {t('favorites.loading', 'Načítavam obľúbených používateľov...')}
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : favoriteUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t('favorites.emptyTitle', 'Zatiaľ nemáte žiadnych obľúbených používateľov')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t(
              'favorites.emptyHint',
              'Keď si niekoho pridáte k obľúbeným v profile, zobrazí sa tu.',
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {favoriteUsers.map((favoriteUser) => {
            const displayName = favoriteUser.display_name || t('favorites.unknownUser', 'Používateľ');
            const initials = initialsFromName(displayName);
            const isRemoving = pendingRemoveId === favoriteUser.id;

            return (
              <motion.div
                key={favoriteUser.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => router.push(buildProfileUrl(favoriteUser))}
                    className="min-w-0 flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center flex-shrink-0">
                      {favoriteUser.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={favoriteUser.avatar_url}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-purple-700">
                          {initials || <UserIcon className="w-5 h-5" />}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {displayName}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleRemoveFavorite(favoriteUser);
                    }}
                    disabled={isRemoving}
                    className="px-4 py-2 text-sm font-medium text-purple-800 bg-purple-100 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {t('favorites.removeAction', 'Odobrať')}
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

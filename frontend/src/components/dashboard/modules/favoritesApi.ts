'use client';

import { api, endpoints } from '@/lib/api';

export type DashboardFavoriteUser = {
  id: number;
  slug?: string | null;
  avatar_url?: string | null;
  display_name: string;
};

type FavoritesResponse = {
  users?: DashboardFavoriteUser[];
  skills?: unknown[];
};

const FAVORITE_USER_TYPE = 'user';

export async function fetchFavoriteUsers(): Promise<DashboardFavoriteUser[]> {
  const { data } = await api.get<FavoritesResponse>(endpoints.dashboard.favorites);
  return Array.isArray(data?.users) ? data.users : [];
}

export async function setFavoriteUserState(userId: number, isFavorited: boolean): Promise<void> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid favorite user id.');
  }

  const payload = {
    type: FAVORITE_USER_TYPE,
    id: userId,
  };

  if (isFavorited) {
    await api.post(endpoints.dashboard.favorites, payload);
    return;
  }

  await api.delete(endpoints.dashboard.favorites, {
    data: payload,
  });
}

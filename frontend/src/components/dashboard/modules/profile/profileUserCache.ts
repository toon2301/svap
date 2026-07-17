'use client';

import type { User } from '@/types';

const CACHE_TTL_MS = 60 * 1000; // 60 sekúnd – krátka životnosť kvôli aktuálnosti dát

type CacheEntry = {
  user: User;
  timestamp: number;
};

const userProfileCache = new Map<number, CacheEntry>();
const slugToUserIdCache = new Map<string, number>();


export const getUserProfileFromCache = (userId: number): User | undefined => {
  const entry = userProfileCache.get(userId);
  if (!entry) return undefined;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    userProfileCache.delete(userId);
    return undefined;
  }

  return entry.user;
};

export const setUserProfileToCache = (userId: number, user: User): void => {
  // Ak už máme starý záznam pre tohto používateľa, odstráň starý slug mapping
  const oldEntry = userProfileCache.get(userId);
  if (oldEntry?.user?.slug && oldEntry.user.slug !== user.slug) {
    slugToUserIdCache.delete(oldEntry.user.slug);
  }

  userProfileCache.set(userId, {
    user,
    timestamp: Date.now(),
  });

  // Ak má používateľ slug, zapamätaj si mapovanie slug -> userId
  if (user.slug) {
    slugToUserIdCache.set(user.slug, userId);
  }
};

export const patchUserProfileInCache = (
  userId: number,
  updater: Partial<User> | ((current: User) => User),
): User | undefined => {
  const current = getUserProfileFromCache(userId);
  if (!current) return undefined;

  const next =
    typeof updater === 'function'
      ? updater(current)
      : {
          ...current,
          ...updater,
        };

  setUserProfileToCache(userId, next);
  return next;
};

export const invalidateUserProfileCache = (userId: number): void => {
  const entry = userProfileCache.get(userId);
  if (entry?.user?.slug) {
    slugToUserIdCache.delete(entry.user.slug);
  }

  userProfileCache.delete(userId);
  slugToUserIdCache.forEach((mappedUserId, slug) => {
    if (mappedUserId === userId) {
      slugToUserIdCache.delete(slug);
    }
  });
};

export const getUserIdBySlug = (slug: string): number | undefined => {
  return slugToUserIdCache.get(slug);
};




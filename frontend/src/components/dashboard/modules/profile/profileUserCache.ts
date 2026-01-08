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
  userProfileCache.set(userId, {
    user,
    timestamp: Date.now(),
  });

  // Ak má používateľ slug, zapamätaj si mapovanie slug -> userId
  if (user.slug) {
    slugToUserIdCache.set(user.slug, userId);
  }
};

export const getUserIdBySlug = (slug: string): number | undefined => {
  return slugToUserIdCache.get(slug);
};




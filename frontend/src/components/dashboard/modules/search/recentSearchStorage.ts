'use client';

import type { SearchResults } from './types';

function recentSearchStorageKey(viewerUserId: number): string {
  return `searchRecentResults_${viewerUserId}`;
}

export function removeUserFromRecentSearches(
  viewerUserId: number,
  hiddenUserId: number,
): void {
  if (
    typeof window === 'undefined' ||
    !Number.isInteger(viewerUserId) ||
    viewerUserId <= 0 ||
    !Number.isInteger(hiddenUserId) ||
    hiddenUserId <= 0
  ) {
    return;
  }

  const storageKey = recentSearchStorageKey(viewerUserId);
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return;

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const filtered = (parsed as SearchResults[])
      .map((result) => ({
        users: Array.isArray(result?.users)
          ? result.users.filter((user) => user.id !== hiddenUserId)
          : [],
        skills: Array.isArray(result?.skills)
          ? result.skills.filter((skill) => skill.user_id !== hiddenUserId)
          : [],
      }))
      .filter((result) => result.users.length > 0 || result.skills.length > 0);

    window.localStorage.setItem(storageKey, JSON.stringify(filtered));
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

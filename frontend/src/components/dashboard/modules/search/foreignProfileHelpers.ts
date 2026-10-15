'use client';

/**
 * Pomocné časti profilu cudzieho používateľa (`SearchUserProfileModule`):
 * tvar chyby z API a adresa avatara.
 */

import type { User } from '@/types';

/** Tvar chyby z API, z ktorého sa berie text pre používateľa. */
export type SearchProfileApiError = {
  response?: {
    status?: number;
    data?: {
      error?: string;
      detail?: string;
    };
  };
  message?: string;
};

function withStableAvatarVersion(url: string, version?: string | null): string {
  const cleanVersion = String(version || '').trim();
  if (!cleanVersion) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(cleanVersion)}`;
}

/** Adresa avatara aj s verziou (`updated_at`); `null`, keď profil žiadny nemá. */
export function getProfileAvatarUrl(user: User): string | null {
  const rawUrl = user.avatar_url || user.avatar || '';
  const cleanUrl = rawUrl.trim();
  return cleanUrl ? withStableAvatarVersion(cleanUrl, user.updated_at) : null;
}

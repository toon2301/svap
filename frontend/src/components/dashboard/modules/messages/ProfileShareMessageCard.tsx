'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MessagingUserBrief } from './types';

function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
}

export function ProfileShareMessageCard({
  profile,
  outgoing,
}: {
  profile: MessagingUserBrief | null;
  outgoing: boolean;
}) {
  const { t } = useLanguage();

  if (!profile) {
    return (
      <div className="min-w-52 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-black dark:text-gray-300">
        {t('messages.profileShareUnavailable', 'Profil už nie je dostupný.')}
      </div>
    );
  }

  const displayName = profile.display_name || t('messages.unknownUser', 'Používateľ');
  const identifier = (profile.slug || '').trim() || String(profile.id);

  const openProfile = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof window === 'undefined' || !identifier) return;
    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier },
      }),
    );
  };

  return (
    <button
      type="button"
      onClick={openProfile}
      className={[
        'flex w-full min-w-52 max-w-72 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2',
        outgoing
          ? 'border-white/25 bg-white/95 text-gray-900 hover:bg-white focus:ring-white/60'
          : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus:ring-purple-300 dark:border-gray-800 dark:bg-black dark:text-white dark:hover:bg-gray-950',
      ].join(' ')}
      aria-label={t('messages.profileShareOpenProfile', 'Otvoriť profil')}
    >
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-bold">
            {initials(displayName)}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{displayName}</span>
        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
          {t('messages.profileShareCardTitle', 'Zdieľaný profil')}
        </span>
      </span>
    </button>
  );
}

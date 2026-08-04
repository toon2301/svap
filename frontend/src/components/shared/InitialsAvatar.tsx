'use client';

/**
 * Ľahký avatar do zoznamov: obrázok, alebo iniciály v kruhu ako fallback.
 *
 * Na rozdiel od UserAvatar nepotrebuje celý `User` objekt ani upload logiku –
 * berie len meno a URL, takže sa hodí do feedu, kde príde `FeedUserSummary`.
 */

import { useEffect, useState } from 'react';

export type InitialsAvatarSize = 'xs' | 'sm' | 'md';

const sizeClasses: Record<InitialsAvatarSize, string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
};

/** Dve iniciály z mena – rovnaké pravidlo ako FavoritesModule. */
export function getDisplayInitials(name: string | null | undefined): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = (parts[0] || '').slice(0, 1);
  const second = (parts[1] || '').slice(0, 1);
  return `${first}${second}`.toUpperCase() || 'U';
}

type InitialsAvatarProps = {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: InitialsAvatarSize;
  className?: string;
};

export default function InitialsAvatar({
  name,
  avatarUrl,
  size = 'sm',
  className = '',
}: InitialsAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const trimmedUrl = String(avatarUrl || '').trim();

  useEffect(() => {
    setImageFailed(false);
  }, [trimmedUrl]);

  const showImage = Boolean(trimmedUrl) && !imageFailed;
  const base = `${sizeClasses[size]} rounded-full shrink-0 ${className}`;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmedUrl}
        alt={String(name || '')}
        className={`${base} object-cover border border-purple-200 dark:border-purple-800/60`}
        onError={() => setImageFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${base} flex items-center justify-center bg-purple-100 border border-purple-200 font-bold text-purple-700 dark:bg-purple-900/40 dark:border-purple-800/60 dark:text-purple-200`}
    >
      {getDisplayInitials(name)}
    </div>
  );
}

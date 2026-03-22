'use client';

import React from 'react';

function initialsFromName(name: string): string {
  const parts = name
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean);
  const a = (parts[0] || '').slice(0, 1);
  const b = (parts[1] || '').slice(0, 1);
  const out = `${a}${b}`.toUpperCase();
  return out || 'U';
}

function userTypeLabel(userType: string | null | undefined): string | null {
  if (!userType) return null;
  if (userType === 'company') return 'Firma';
  if (userType === 'individual') return 'Osoba';
  return String(userType);
}

export interface SearchOfferCardAuthorHeaderProps {
  displayName: string;
  avatarUrl?: string | null;
  ownerUserType?: string | null;
  onProfileClick: (e: React.MouseEvent) => void;
}

export function SearchOfferCardAuthorHeader({
  displayName,
  avatarUrl,
  ownerUserType,
  onProfileClick,
}: SearchOfferCardAuthorHeaderProps) {
  const initials = initialsFromName(displayName);
  const badge = userTypeLabel(ownerUserType);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onProfileClick(e);
      }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-t-2xl hover:bg-gray-50/80 dark:hover:bg-[#141416]/80 transition-colors text-left border-b border-gray-200 dark:border-gray-700/50"
    >
      <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
            {initials}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {displayName || 'Používateľ'}
          </span>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

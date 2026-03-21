'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export type GlobalSearchUser = {
  id: number;
  display_name?: string | null;
  slug?: string | null;
  user_type?: string | null;
  location?: string | null;
  district?: string | null;
  is_verified?: boolean | null;
  avatar_url?: string | null;
};

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

export function SearchUsersResults({
  users,
  loading,
  title,
  count,
  currentUserId,
}: {
  users: GlobalSearchUser[];
  loading?: boolean;
  title: string;
  count?: number | null;
  currentUserId?: number | null;
}) {
  const router = useRouter();
  const { t } = useLanguage();

  const items = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  return (
    <section className="w-full">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {typeof count === 'number' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{count} výsledkov</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-14 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white/60 dark:bg-[#0f0f10] px-4 py-5">
          Žiadni používatelia.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((u) => {
            const displayName =
              currentUserId != null && u.id === currentUserId
                ? t('search.you', 'Vy')
                : (String(u.display_name || '').trim() || `Používateľ #${u.id}`);
            const badge = userTypeLabel(u.user_type);
            const location = String(u.location || '').trim();
            const district = String(u.district || '').trim();
            const locality = location || district;
            const avatar = u.avatar_url || null;
            const initials = initialsFromName(displayName);
            const identifier = (u.slug && String(u.slug).trim()) || String(u.id);

            return (
              <button
                key={u.id}
                type="button"
                onClick={() => router.push(`/dashboard/users/${identifier}`)}
                className="w-full text-left flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] hover:bg-white/80 dark:hover:bg-[#141416] transition-colors px-4 py-3"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                      {initials}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {displayName}
                    </span>
                    {badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex-shrink-0">
                        {badge}
                      </span>
                    )}
                    {u.is_verified ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex-shrink-0">
                        Overený
                      </span>
                    ) : null}
                  </div>
                  {locality ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {locality}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}


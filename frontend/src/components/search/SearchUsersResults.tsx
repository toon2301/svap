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
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
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

function safeExternalUrl(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
    >
      {children}
    </a>
  );
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

            const instagram = safeExternalUrl(u.instagram);
            const facebook = safeExternalUrl(u.facebook);
            const linkedin = safeExternalUrl(u.linkedin);
            const youtube = safeExternalUrl(u.youtube);
            const hasSocial = Boolean(instagram || facebook || linkedin || youtube);

            return (
              <div
                key={u.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/users/${identifier}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/dashboard/users/${identifier}`);
                  }
                }}
                className="w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] hover:bg-white/80 dark:hover:bg-[#141416] transition-colors px-4 py-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
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
                        <span className="hidden lg:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex-shrink-0">
                          {badge}
                        </span>
                      )}
                      {u.is_verified ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex-shrink-0">
                          Overený
                        </span>
                      ) : null}
                    </div>
                    {(locality || badge) && (
                      <div className="mt-0.5 flex items-center gap-2 min-w-0">
                        {locality ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {locality}
                          </div>
                        ) : null}
                        {badge && (
                          <span className="inline-flex lg:hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex-shrink-0">
                            {badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {hasSocial ? (
                  <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
                    {facebook && (
                      <SocialIconLink href={facebook} label="Facebook">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </SocialIconLink>
                    )}
                    {instagram && (
                      <SocialIconLink href={instagram} label="Instagram">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </SocialIconLink>
                    )}
                    {linkedin && (
                      <SocialIconLink href={linkedin} label="LinkedIn">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </SocialIconLink>
                    )}
                    {youtube && (
                      <SocialIconLink href={youtube} label="YouTube">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </SocialIconLink>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


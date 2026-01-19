'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckIcon, NoSymbolIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StatusPill } from './ui/StatusPill';
import type { SkillRequest } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type Props = {
  item: SkillRequest;
  variant: 'received' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  isBusy?: boolean;
};

function initials(name?: string | null) {
  const raw = String(name || '').trim();
  if (!raw) return '?';
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + last).toUpperCase();
}

function formatDateSk(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

function getBackendOrigin(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN || '').trim();
  if (fromEnv && /^https?:\/\//.test(fromEnv)) return fromEnv.replace(/\/+$/, '');

  const base = String(api.defaults.baseURL || '').trim();
  if (base && /^https?:\/\//.test(base)) {
    try {
      return new URL(base).origin;
    } catch {
      // ignore
    }
  }

  // dev fallback
  return 'http://localhost:8000';
}

function resolveMediaUrl(rawUrl: string, backendOrigin: string): string {
  const origin = (backendOrigin || '').replace(/\/+$/, '');
  const raw = String(rawUrl || '').trim();
  if (!raw) return '';

  // Absolute URL: if it points to /media but different host, rewrite to backend origin.
  if (/^https?:\/\//.test(raw)) {
    try {
      const u = new URL(raw);
      if (origin && u.pathname.startsWith('/media/') && u.origin !== origin) {
        return `${origin}${u.pathname}`;
      }
    } catch {
      // ignore
    }
    return raw;
  }

  // Relative /media/... path
  if (raw.startsWith('/')) {
    return origin ? `${origin}${raw}` : raw;
  }

  // Relative path without leading slash
  return origin ? `${origin}/${raw}` : raw;
}

export function RequestSummaryCard({ item, variant, onAccept, onReject, onCancel, isBusy = false }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const who = variant === 'received' ? item.requester_summary : item.recipient_summary;
  const whoName = who?.display_name || (variant === 'received' ? item.requester_display_name : item.recipient_display_name) || '';
  const whoAvatar = who?.avatar_url || null;
  const [avatarError, setAvatarError] = useState(false);

  const offer = item.offer_summary || null;
  const isSeeking = offer?.is_seeking ?? item.offer_is_seeking ?? false;
  const subcategory = (offer?.subcategory || item.offer_subcategory || '').trim();
  const description = (item.offer_description || '').trim();
  const created = formatDateSk(item.created_at);

  const avatarSrc = useMemo(() => {
    if (!whoAvatar) return '';
    const resolved = resolveMediaUrl(whoAvatar, getBackendOrigin());
    if (!resolved) return '';
    const buster = `t=${Date.now()}`;
    return resolved.includes('?') ? `${resolved}&${buster}` : `${resolved}?${buster}`;
  }, [whoAvatar]);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarSrc]);

  const hasAvatar = Boolean(avatarSrc && !avatarError);

  const priceLabel = useMemo(() => {
    const p = offer?.price_from ?? null;
    if (typeof p !== 'number') return '';
    const cur = (offer?.price_currency || '€').trim() || '€';
    return `od ${p} ${cur}`;
  }, [offer?.price_currency, offer?.price_from]);

  const intentText = useMemo(() => {
    if (variant === 'received') {
      // Prijaté: karta patrí mne, niekto mi poslal žiadosť
      return isSeeking
        ? 'Užívateľ ponúka to, čo hľadáte.'
        : 'Užívateľ žiada o to, čo ponúkate.';
    } else {
      // Odoslané: karta patrí niekomu inému, ja som poslal žiadosť
      return isSeeking
        ? 'Užívateľ hľadá to, čo ponúkate.'
        : 'Užívateľ ponúka to, čo žiadate.';
    }
  }, [variant, isSeeking]);

  const handleView = () => {
    const offerId = offer?.id ?? item.offer;
    if (typeof offerId !== 'number' || !Number.isFinite(offerId)) {
      toast('Karta už nie je dostupná.');
      return;
    }

    let profileIdentifier: string | null = null;

    if (variant === 'received') {
      // prijaté: karta patrí mne (recipient), otvor môj profil
      // Skús najprv z offer_summary.owner, potom z recipient_summary, potom z recipient ID
      const owner = offer?.owner;
      if (owner?.slug) {
        profileIdentifier = String(owner.slug);
      } else if (owner?.id && typeof owner.id === 'number') {
        profileIdentifier = String(owner.id);
      } else {
        // Fallback: recipient_summary alebo recipient ID (karta patrí recipientovi = mne)
        const slug = item.recipient_summary?.slug;
        if (slug) {
          profileIdentifier = String(slug);
        } else if (typeof item.recipient === 'number') {
          profileIdentifier = String(item.recipient);
        } else {
          // Posledný fallback: auth context
          const me = user;
          if (me) {
            const meSlug = (me as any).slug;
            profileIdentifier = meSlug ? String(meSlug) : typeof me.id === 'number' ? String(me.id) : null;
          }
        }
      }
    } else {
      // odoslané: karta patrí recipientovi, otvor jeho profil
      // Skús najprv z offer_summary.owner, potom z recipient_summary, potom z recipient ID
      const owner = offer?.owner;
      if (owner?.slug) {
        profileIdentifier = String(owner.slug);
      } else if (owner?.id && typeof owner.id === 'number') {
        profileIdentifier = String(owner.id);
      } else {
        // Fallback: recipient_summary alebo recipient ID
        const slug = item.recipient_summary?.slug;
        if (slug) {
          profileIdentifier = String(slug);
        } else if (typeof item.recipient === 'number') {
          profileIdentifier = String(item.recipient);
        }
      }
    }

    if (!profileIdentifier) {
      toast('Profil sa nepodarilo otvoriť.');
      return;
    }

    try {
      sessionStorage.setItem('highlightedSkillId', String(offerId));
      sessionStorage.setItem('highlightedSkillTime', String(Date.now()));
    } catch {
      // ignore
    }

    router.push(`/dashboard/users/${encodeURIComponent(profileIdentifier)}?highlight=${encodeURIComponent(String(offerId))}`);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm hover:shadow-md transition-shadow">
      {/* Pravý panel akcií: od úplného vrchu po úplný spod celej karty */}
      <div
        className="absolute inset-y-0 right-0 w-20 sm:w-24 border-l border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 flex flex-col bg-white/80 dark:bg-[#0f0f10]"
        aria-label="Akcie"
      >
        {variant === 'received' ? (
          <>
            <button
              type="button"
              onClick={onAccept}
              disabled={isBusy || item.status !== 'pending'}
              className="flex-1 inline-flex w-full items-center justify-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-2 py-1 text-[10px] font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
            >
              <CheckIcon className="w-3 h-3" />
              Prijať
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={isBusy || item.status !== 'pending'}
              className="flex-1 inline-flex w-full items-center justify-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-2 py-1 text-[10px] font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
            >
              <XMarkIcon className="w-3 h-3" />
              Odmietnuť
            </button>
            <button
              type="button"
              onClick={handleView}
              className="flex-1 inline-flex w-full items-center justify-center bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-2 py-1 text-[10px] font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
            >
              Zobraziť kartu
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleView}
              className="flex-1 inline-flex w-full items-center justify-center bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-2 py-1 text-[10px] font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
            >
              Zobraziť kartu
            </button>
            {item.status === 'pending' ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={isBusy}
                className="flex-1 inline-flex w-full items-center justify-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-2 py-1 text-[10px] font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
              >
                <NoSymbolIcon className="w-3 h-3" />
                Zrušiť
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </>
        )}
      </div>

      <div className="flex flex-col pr-20 sm:pr-24">
        {/* Horný header (mimo kontajnera avatara) */}
        <div className="px-3 pt-1.5 pb-0">
          <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-none truncate">
            {whoName || 'Používateľ'}
          </div>
          <div className="mt-0 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
            {intentText}
          </div>
          {created && (
            <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              {created}
            </div>
          )}
        </div>

        <div className="flex">
          {/* Ľavý stĺpec: iba avatar box dole vľavo */}
          <div className="w-16 sm:w-20 md:w-24 flex-shrink-0 bg-gray-50 dark:bg-black/30">
            <div className="h-full w-full pt-0 pr-0.5 flex flex-col">
              <div className="mt-auto">
                <div className="w-full aspect-square overflow-hidden rounded-tr-2xl rounded-bl-none rounded-tl-none rounded-br-none bg-gray-100 dark:bg-gray-800">
                  {hasAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center">
                      <span className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200">
                        {initials(whoName)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Obsah karty */}
          <div className="flex-1 p-0.5 pt-0 pb-0.5 min-w-0 relative flex flex-col">

            <div className="-mt-2 flex-1">
              <div className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                {subcategory || 'Bez názvu'}
              </div>
              {description && (
                <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 leading-tight italic">
                  &ldquo;{description}&rdquo;
                </div>
              )}
            </div>

            <div className="mt-auto flex items-center gap-2">
              {priceLabel && (
                <span className="inline-flex items-center rounded-full border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0 font-semibold text-purple-800 dark:text-purple-200 text-[10px]">
                  {priceLabel}
                </span>
              )}
              <div className="scale-75 origin-left shrink-0">
                <StatusPill status={item.status} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}



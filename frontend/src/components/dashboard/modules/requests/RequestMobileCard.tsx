'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { SkillRequest, SkillRequestStatus } from './types';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

type Props = {
  item: SkillRequest;
  variant: 'received' | 'sent';
  onPress: () => void;
};

function initials(name?: string | null) {
  const raw = String(name || '').trim();
  if (!raw) return '?';
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + last).toUpperCase();
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

  return 'http://localhost:8000';
}

function resolveMediaUrl(rawUrl: string, backendOrigin: string): string {
  const origin = (backendOrigin || '').replace(/\/+$/, '');
  const raw = String(rawUrl || '').trim();
  if (!raw) return '';

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

  if (raw.startsWith('/')) return origin ? `${origin}${raw}` : raw;
  return origin ? `${origin}/${raw}` : raw;
}

const STATUS_GRADIENT_CLASS: Record<SkillRequestStatus, string> = {
  pending: 'from-amber-500/20 to-transparent',
  accepted: 'from-emerald-500/20 to-transparent',
  rejected: 'from-rose-500/20 to-transparent',
  cancelled: 'from-gray-500/15 to-transparent',
};

export function RequestMobileCard({ item, variant, onPress }: Props) {
  const { t } = useLanguage();

  const who = variant === 'received' ? item.requester_summary : item.recipient_summary;
  const whoName =
    who?.display_name ||
    (variant === 'received' ? item.requester_display_name : item.recipient_display_name) ||
    t('requests.userFallback');
  const whoAvatar = who?.avatar_url || null;
  const [avatarError, setAvatarError] = useState(false);

  const offer = item.offer_summary || null;
  const isSeeking = offer?.is_seeking ?? item.offer_is_seeking ?? false;
  const isOfferHidden = offer?.is_hidden === true || item.offer_is_hidden === true;
  const subcategory = (offer?.subcategory || item.offer_subcategory || '').trim();

  const intentText = useMemo(() => {
    if (isOfferHidden) {
      return variant === 'received' ? t('requests.youHiddenThisCard') : t('requests.offerNoLongerOffered');
    }
    const key =
      variant === 'received'
        ? isSeeking
          ? 'requests.intentOfferSeeks'
          : 'requests.intentUserRequests'
        : isSeeking
          ? 'requests.intentUserSeeks'
          : 'requests.intentUserOffers';
    const text = t(key);
    return text.endsWith('!') ? text : `${text}!`;
  }, [isOfferHidden, isSeeking, t, variant]);

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
  const status = item.status ?? 'pending';
  const gradientClass = STATUS_GRADIENT_CLASS[status] ?? STATUS_GRADIENT_CLASS.pending;

  return (
    <div className={`relative w-full bg-gradient-to-l ${gradientClass}`}>
      <button
        type="button"
        onClick={onPress}
        className="relative w-full text-left px-6 py-3 sm:px-8 active:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 overflow-hidden"
        aria-label={t('requests.openDetail', 'Otvoriť detail žiadosti')}
      >
        <div className="relative flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
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
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{initials(whoName)}</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{whoName}</div>
                <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 truncate mt-0.5">
                  {intentText}
                </div>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {subcategory || t('requests.noTitle')}
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}


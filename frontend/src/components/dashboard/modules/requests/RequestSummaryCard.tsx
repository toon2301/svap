'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckIcon, NoSymbolIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StatusPill } from './ui/StatusPill';
import type { SkillRequest } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

type Props = {
  item: SkillRequest;
  variant: 'received' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onHide?: () => void;
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

export function RequestSummaryCard({ item, variant, onAccept, onReject, onCancel, onHide, isBusy = false }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const who = variant === 'received' ? item.requester_summary : item.recipient_summary;
  const whoName = who?.display_name || (variant === 'received' ? item.requester_display_name : item.recipient_display_name) || '';
  const whoAvatar = who?.avatar_url || null;
  const [avatarError, setAvatarError] = useState(false);

  const offer = item.offer_summary || null;
  const isSeeking = offer?.is_seeking ?? item.offer_is_seeking ?? false;
  const isOfferHidden = offer?.is_hidden === true || item.offer_is_hidden === true;
  const subcategory = (offer?.subcategory || item.offer_subcategory || '').trim();
  const description = (item.offer_description || '').trim();
  const dateToShow = item.updated_at ?? item.created_at;
  const created = formatDateSk(dateToShow);
  const canHide = item.status === 'cancelled' || item.status === 'rejected';

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
    if (isOfferHidden) {
      return variant === 'received'
        ? t('requests.youHiddenThisCard')
        : t('requests.offerNoLongerOffered');
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
  }, [variant, isSeeking, isOfferHidden, t]);

  const handleView = () => {
    const offerId = offer?.id ?? item.offer;
    if (typeof offerId !== 'number' || !Number.isFinite(offerId)) {
      toast(t('requests.toastCardUnavailable'));
      return;
    }

    // Pri prijatých žiadostiach ide o moju kartu -> otvor môj profil modul (nie /dashboard/users/...)
    // Tým pádom sa nikdy nezobrazia "Požiadať/Správa" na vlastnej karte.
    if (variant === 'received') {
      try {
        sessionStorage.setItem('highlightedSkillId', String(offerId));
        sessionStorage.setItem('highlightedSkillTime', String(Date.now()));
      } catch {
        // ignore
      }

      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('goToMyProfile', {
              detail: { highlightId: offerId },
            }),
          );
          return;
        }
      } catch {
        // ignore
      }

      router.push(`/dashboard/profile?highlight=${encodeURIComponent(String(offerId))}`);
      return;
    }

    let profileIdentifier: string | null = null;

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

    if (!profileIdentifier) {
      toast(t('requests.toastProfileOpenFailed'));
      return;
    }

    try {
      sessionStorage.setItem('highlightedSkillId', String(offerId));
      sessionStorage.setItem('highlightedSkillTime', String(Date.now()));
    } catch {
      // ignore
    }

    // Preferuj internú SPA navigáciu v Dashboarde (bez potreby reloadu/SSR renderu).
    // Fallback na Next router, ak event listener nie je dostupný.
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('goToUserProfile', {
            detail: { identifier: profileIdentifier, highlightId: offerId },
          }),
        );
        return;
      }
    } catch {
      // ignore
    }

    router.push(`/dashboard/users/${encodeURIComponent(profileIdentifier)}?highlight=${encodeURIComponent(String(offerId))}`);
  };

  return (
    <div className="group relative overflow-hidden pt-4 pb-4 min-h-[11rem]">
      {/* Pri skrytej karte: hláška o skrytí v pôvodnom mieste (v strede hore) */}
      {isOfferHidden && (
        <div className="w-full text-center pt-1 pb-1">
          <div className="text-sm sm:text-base font-semibold text-purple-700 dark:text-purple-300">
            {intentText}
          </div>
        </div>
      )}
      {/* Pravý panel: od 1109px dole aj od 1110px hore dátum a tlačidlá úplne vpravo (right-0). */}
      <div
        className="absolute inset-y-0 right-6 sm:right-8 compact-max:right-0 compact:right-0 flex flex-col items-stretch justify-start px-2 sm:px-3 compact-max:pl-3 compact-max:pr-0 compact:pl-3 compact:pr-0 pt-3 sm:pt-4 gap-3 sm:gap-4 w-56 sm:w-64 md:w-72 compact:w-96 wide:w-80"
        aria-label="Akcie"
      >
        <div className="shrink-0 flex items-center justify-end gap-2">
          {created && (
            <div className="text-right text-xs sm:text-sm wide:text-base font-medium text-gray-500 dark:text-gray-400">
              {created}
            </div>
          )}
          {canHide && onHide && (
            <button
              type="button"
              onClick={onHide}
              disabled={isBusy}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-900/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
              aria-label={t('common.delete', 'Odstrániť')}
              title={t('common.delete', 'Odstrániť')}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-row items-stretch justify-center gap-1 compact-max:gap-1 sm:gap-2 wide:gap-3 shrink-0">
        {variant === 'received' ? (
          <>
            <button
              type="button"
              onClick={onAccept}
              disabled={isBusy || item.status !== 'pending'}
              className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 wide:gap-2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-1.5 compact-max:px-1 sm:px-2 md:px-2.5 hd:px-4 py-1.5 compact-max:py-1 sm:py-2 hd:py-2.5 text-[11px] compact-max:text-[10px] sm:text-xs md:text-sm hd:text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 shrink-0"
            >
              <CheckIcon className="w-3 h-3 compact-max:w-2.5 compact-max:h-2.5 sm:w-4 sm:h-4 hd:w-5 hd:h-5 shrink-0" />
              {t('requests.accept')}
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={isBusy || item.status !== 'pending'}
              className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 wide:gap-2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-1.5 compact-max:px-1 sm:px-2 md:px-2.5 hd:px-4 py-1.5 compact-max:py-1 sm:py-2 hd:py-2.5 text-[11px] compact-max:text-[10px] sm:text-xs md:text-sm hd:text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 shrink-0"
            >
              <XMarkIcon className="w-3 h-3 compact-max:w-2.5 compact-max:h-2.5 sm:w-4 sm:h-4 hd:w-5 hd:h-5 shrink-0" />
              {t('requests.reject')}
            </button>
            {!isOfferHidden && (
              <button
                type="button"
                onClick={handleView}
                className="flex-[1.6] inline-flex items-center justify-center gap-1 sm:gap-1.5 wide:gap-2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-1.5 compact-max:px-1 sm:px-2 md:px-2.5 hd:px-4 py-1.5 compact-max:py-1 sm:py-2 hd:py-2.5 text-[11px] compact-max:text-[10px] sm:text-xs md:text-sm hd:text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 shrink-0 whitespace-nowrap"
              >
                {t('requests.showCard')}
              </button>
            )}
          </>
        ) : (
          <>
            {!isOfferHidden && (
              <button
                type="button"
                onClick={handleView}
                className="flex-[1.6] inline-flex items-center justify-center gap-1 sm:gap-1.5 wide:gap-2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-1.5 compact-max:px-1 sm:px-2 md:px-2.5 hd:px-4 py-1.5 compact-max:py-1 sm:py-2 hd:py-2.5 text-[11px] compact-max:text-[10px] sm:text-xs md:text-sm hd:text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 shrink-0 whitespace-nowrap"
              >
                {t('requests.showCard')}
              </button>
            )}
            {item.status === 'pending' && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isBusy}
                className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 wide:gap-2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-1.5 compact-max:px-1 sm:px-2 md:px-2.5 hd:px-4 py-1.5 compact-max:py-1 sm:py-2 hd:py-2.5 text-[11px] compact-max:text-[10px] sm:text-xs md:text-sm hd:text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 shrink-0 whitespace-nowrap"
              >
                <NoSymbolIcon className="w-3 h-3 compact-max:w-2.5 compact-max:h-2.5 sm:w-4 sm:h-4 hd:w-5 hd:h-5 shrink-0" />
                {t('requests.cancel')}
              </button>
            )}
          </>
        )}
        </div>
        {/* Suma a stav: v pravom dolnom rohu, rovnaká veľkosť */}
        <div className="shrink-0 pt-2 pb-2 flex flex-row items-center justify-end gap-3">
          {priceLabel && (
            <span className="inline-flex items-center rounded-full border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 text-[11px] font-semibold text-purple-800 dark:text-purple-200">
              {priceLabel}
            </span>
          )}
          <StatusPill status={item.status} />
        </div>
      </div>

      <div className="flex flex-col pr-[15.5rem] sm:pr-72 md:pr-80 compact-max:pr-[22rem] compact:pr-[26rem] wide:pr-[22rem] min-w-0">
        {/* Avatar, meno a hneď za menom pokračovanie vety (vám ponúka to, čo hľadáte!) */}
        <div className="px-3 pt-0 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
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
                <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200">
                  {initials(whoName)}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-xs sm:text-sm leading-tight">
            {isOfferHidden ? (
              <span className="font-semibold text-gray-900 dark:text-white">
                {whoName || t('requests.userFallback')}
              </span>
            ) : (
              <>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {whoName || t('requests.userFallback')}
                </span>
                <span className="font-semibold text-purple-700 dark:text-purple-300">
                  {' '}{intentText}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 p-0.5 pt-0 pb-0.5 min-w-0 relative flex flex-col">
          <div className="mt-2 flex-1 px-3">
            <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {subcategory || t('requests.noTitle')}
            </div>
            {description && (
              <div className="mt-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight italic">
                &ldquo;{description}&rdquo;
              </div>
            )}
          </div>
          <div className="mt-auto" />
        </div>
      </div>
    </div>
  );
}



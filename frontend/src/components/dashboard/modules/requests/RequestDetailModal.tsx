'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { SkillRequest } from './types';
import { StatusPill } from './ui/StatusPill';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  open: boolean;
  item: SkillRequest | null;
  variant: 'received' | 'sent';
  isBusy?: boolean;
  onClose: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onHide?: () => void;
  showCompletionActions?: boolean;
  onRequestCompletion?: (id: number) => void;
  onConfirmCompletion?: (id: number) => void;
  showReviewButton?: boolean;
  onOpenReview?: (offerId: number) => void;
};

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

export function RequestDetailModal({
  open,
  item,
  variant,
  isBusy = false,
  onClose,
  onAccept,
  onReject,
  onCancel,
  onHide,
  showCompletionActions = false,
  onRequestCompletion,
  onConfirmCompletion,
  showReviewButton = false,
  onOpenReview,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const offer = item?.offer_summary || null;
  const isSeeking = offer?.is_seeking ?? item?.offer_is_seeking ?? false;
  const isOfferHidden = offer?.is_hidden === true || item?.offer_is_hidden === true;
  const subcategory = (offer?.subcategory || item?.offer_subcategory || '').trim();
  const description = (item?.offer_description || '').trim();
  const dateToShow = item?.updated_at ?? item?.created_at;
  const created = formatDateSk(dateToShow);

  const priceLabel = useMemo(() => {
    const p = offer?.price_from ?? null;
    if (typeof p !== 'number') return '';
    const cur = (offer?.price_currency || '€').trim() || '€';
    return `od ${p} ${cur}`;
  }, [offer?.price_currency, offer?.price_from]);

  const who = variant === 'received' ? item?.requester_summary : item?.recipient_summary;
  const whoName =
    who?.display_name ||
    (variant === 'received' ? item?.requester_display_name : item?.recipient_display_name) ||
    t('requests.userFallback');

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

  const canHide = item?.status === 'cancelled' || item?.status === 'rejected';

  const handleView = () => {
    if (!item) return;
    const offerId = offer?.id ?? item.offer;
    if (typeof offerId !== 'number' || !Number.isFinite(offerId)) {
      toast(t('requests.toastCardUnavailable'));
      return;
    }

    // Pri prijatých žiadostiach ide o moju kartu -> otvor môj profil modul.
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
          onClose();
          return;
        }
      } catch {
        // ignore
      }

      onClose();
      router.push(`/dashboard/profile?highlight=${encodeURIComponent(String(offerId))}`);
      return;
    }

    // Odoslané: otvor profil vlastníka karty / recipienta.
    let profileIdentifier: string | null = null;
    const owner = offer?.owner;
    if (owner?.slug) {
      profileIdentifier = String(owner.slug);
    } else if (owner?.id && typeof owner.id === 'number') {
      profileIdentifier = String(owner.id);
    } else {
      const slug = item.recipient_summary?.slug;
      if (slug) profileIdentifier = String(slug);
      else if (typeof item.recipient === 'number') profileIdentifier = String(item.recipient);
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

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('goToUserProfile', {
            detail: { identifier: profileIdentifier, highlightId: offerId },
          }),
        );
        onClose();
        return;
      }
    } catch {
      // ignore
    }

    onClose();
    router.push(
      `/dashboard/users/${encodeURIComponent(profileIdentifier)}?highlight=${encodeURIComponent(String(offerId))}`,
    );
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={t('requests.detailTitle', 'Detail žiadosti')}
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl bg-white dark:bg-[#0f0f10] border-t border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {whoName}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-purple-700 dark:text-purple-300 truncate">
                {intentText}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
              aria-label={t('common.close', 'Zavrieť')}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {priceLabel && (
                <span className="inline-flex items-center rounded-full border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:text-purple-200">
                  {priceLabel}
                </span>
              )}
              {item?.status && <StatusPill status={item.status} />}
            </div>
            {created && <div className="text-xs text-gray-500 dark:text-gray-400">{created}</div>}
          </div>
        </div>

        <div className="px-5 py-4 overflow-auto">
          <div className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
            {subcategory || t('requests.noTitle')}
          </div>
          {description && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
              &ldquo;{description}&rdquo;
            </div>
          )}

          {isOfferHidden && (
            <div className="mt-4 rounded-2xl border border-purple-200 dark:border-purple-800/40 bg-purple-50 dark:bg-purple-900/20 px-4 py-3 text-sm font-semibold text-purple-800 dark:text-purple-200">
              {intentText}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-3">
          {variant === 'received' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={isBusy || item?.status !== 'pending'}
                  className="w-full py-3 rounded-xl font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/60 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                  {t('requests.accept')}
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={isBusy || item?.status !== 'pending'}
                  className="w-full py-3 rounded-xl font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                  {t('requests.reject')}
                </button>
              </div>

              {!isOfferHidden && (
                <button
                  type="button"
                  onClick={handleView}
                  className="w-full py-3 rounded-xl font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
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
                  className="w-full py-3 rounded-xl font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                  {t('requests.showCard')}
                </button>
              )}
              {item?.status === 'pending' && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isBusy}
                  className="w-full py-3 rounded-xl font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                  {t('requests.cancel')}
                </button>
              )}
            </>
          )}

          {showCompletionActions && item && (
            <>
              {variant === 'received' && item.status === 'accepted' && onRequestCompletion && (
                <button
                  type="button"
                  onClick={() => onRequestCompletion(item.id)}
                  disabled={isBusy}
                  className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  {t('requests.markAsCompleted', 'Označiť ako dokončené')}
                </button>
              )}
              {variant === 'sent' && item.status === 'completion_requested' && onConfirmCompletion && (
                <button
                  type="button"
                  onClick={() => onConfirmCompletion(item.id)}
                  disabled={isBusy}
                  className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  {t('requests.confirmCompletion', 'Potvrdiť dokončenie')}
                </button>
              )}
              {variant === 'sent' && item.status === 'accepted' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                  {t('requests.completionInProgress', 'Spolupráca prebieha')}
                </p>
              )}
              {variant === 'received' && item.status === 'completion_requested' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                  {t('requests.completionAwaitingOther', 'Čaká sa na potvrdenie druhej strany')}
                </p>
              )}
            </>
          )}

          {showReviewButton &&
            variant === 'sent' &&
            item?.status === 'completed' &&
            item?.offer_summary?.already_reviewed === false &&
            onOpenReview &&
            item?.offer_summary?.id != null && (
              <button
                type="button"
                onClick={() => onOpenReview(item.offer_summary!.id)}
                disabled={isBusy}
                className="w-full py-3 rounded-xl font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
              >
                {t('requests.writeReview', 'Napíš recenziu')}
              </button>
            )}

          {canHide && onHide && (
            <button
              type="button"
              onClick={onHide}
              disabled={isBusy}
              className="w-full py-3 rounded-xl font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-950/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
            >
              {t('common.delete', 'Odstrániť')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}


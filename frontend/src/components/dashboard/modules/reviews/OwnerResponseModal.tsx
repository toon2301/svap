'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';

const MAX_LENGTH = 700;

export type OwnerResponseModalProps = {
  open: boolean;
  onClose: () => void;
  /** ID recenzie pre POST /api/auth/reviews/<id>/respond/ */
  reviewId: number;
  /** Režim: 'read' – zobrazenie odpovede, 'edit' – úprava (iba pre vlastníka) */
  mode: 'read' | 'edit';
  /** Text odpovede vlastníka (pre read mode alebo predvyplnenie edit) */
  ownerResponse: string;
  /** Dátum odpovede (pre read mode) */
  ownerRespondedAt: string | null;
  /** Callback pri uložení – vráti aktualizovaný owner_response a owner_responded_at */
  onSave?: (ownerResponse: string, ownerRespondedAt: string) => void | Promise<void>;
  /** Callback pre prepnutie z read do edit módu (iba ak je vlastník) */
  onSwitchToEdit?: () => void;
};

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} o ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

export function OwnerResponseModal({
  open,
  onClose,
  reviewId,
  mode,
  ownerResponse,
  ownerRespondedAt,
  onSave,
  onSwitchToEdit,
}: OwnerResponseModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState(ownerResponse || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setText(ownerResponse || '');
      setError(null);
    }
  }, [open, ownerResponse]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose();
  };

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(t('reviews.ownerResponseRequired', 'Odpoveď je povinná.'));
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(t('reviews.ownerResponseMaxLength', 'Maximálne 700 znakov.'));
      return;
    }
    if (!onSave) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post(endpoints.reviews.respond(reviewId), {
        owner_response: trimmed,
      });
      await onSave?.(
        data.owner_response ?? trimmed,
        data.owner_responded_at ?? new Date().toISOString()
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  const isReadMode = mode === 'read';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-response-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 review-modal-mobile-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <ChatBubbleLeftIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2
                id="owner-response-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {isReadMode
                  ? t('reviews.viewOwnerResponse', 'Odpoveď vlastníka ponuky')
                  : t('reviews.addOwnerResponse', 'Odpovedať na recenziu')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('common.close', 'Zavrieť')}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {isReadMode ? (
            <>
              <div className="min-h-[300px]">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {ownerResponse || '—'}
                </p>
              </div>
              {ownerRespondedAt && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(ownerRespondedAt)}
                </p>
              )}
              <div className="mt-6 flex gap-3 justify-end">
                {onSwitchToEdit && (
                  <button
                    type="button"
                    onClick={onSwitchToEdit}
                    className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {t('common.edit', 'Upraviť')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
                >
                  {t('common.close', 'Zavrieť')}
                </button>
              </div>
            </>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                maxLength={MAX_LENGTH}
                placeholder={t('reviews.ownerResponsePlaceholder', 'Napíšte svoju odpoveď...')}
                className="w-full min-h-[260px] px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60 resize-y overflow-y-auto review-modal-scrollbar"
                disabled={isSubmitting}
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 text-right">
                {text.length} / {MAX_LENGTH}
              </p>
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-50 transition-colors"
                >
                  {t('common.cancel', 'Zrušiť')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting || !text.trim()}
                  className="px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('common.saving', 'Ukladám...')}
                    </>
                  ) : (
                    t('common.save', 'Uložiť')
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

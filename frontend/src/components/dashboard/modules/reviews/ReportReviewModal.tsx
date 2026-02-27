'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ExclamationTriangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Nevhodný obsah' },
  { value: 'spam', label: 'Spam' },
  { value: 'fake', label: 'Falošná recenzia' },
  { value: 'other', label: 'Iné' },
] as const;

export type ReportReviewModalProps = {
  open: boolean;
  onClose: () => void;
  reviewId: number;
  onSuccess?: () => void | Promise<void>;
};

export function ReportReviewModal({
  open,
  onClose,
  reviewId,
  onSuccess,
}: ReportReviewModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false); // keep portal mounting explicit
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setReason(REPORT_REASONS[0].value);
      setDescription('');
      setError(null);
      setDropdownOpen(false);
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose();
  };

  const handleSubmit = async () => {
    const reasonLabel = REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(endpoints.reviews.report(reviewId), {
        reason: reasonLabel,
        description: description.trim() || undefined,
      });
      await onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : t('reviews.reportError', 'Chyba pri nahlásení.'));
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-review-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2
                id="report-review-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t('reviews.reportReview', 'Nahlásiť recenziu')}
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

          <div className="space-y-4">
            <div ref={dropdownRef} className="relative">
              <label
                htmlFor="report-reason"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('reviews.reportReason', 'Dôvod')}
              </label>
              <button
                type="button"
                id="report-reason"
                onClick={() => !isSubmitting && setDropdownOpen((o) => !o)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between gap-2 pl-3 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 text-left"
              >
                <span>{REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason}</span>
                <ChevronDownIcon
                  className={`w-5 h-5 shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f0f10] shadow-lg overflow-hidden">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setReason(r.value);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        r.value === reason
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                          : 'bg-white dark:bg-[#0f0f10] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="report-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('reviews.reportDescription', 'Popis')} ({t('common.optional', 'nepovinné')})
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('reviews.reportDescriptionPlaceholder', 'Doplňujúce informácie...')}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60 resize-y disabled:opacity-50"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.sending', 'Odosielam...')}
                </>
              ) : (
                t('common.submit', 'Odoslať')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

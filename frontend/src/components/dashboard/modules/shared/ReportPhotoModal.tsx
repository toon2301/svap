'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';

export type ReportPhotoTarget =
  | { type: 'offer_image'; skillId: number; imageId: number }
  | { type: 'user_avatar'; userId: number };

type ReportPhotoReason = {
  value: string;
  labelKey: string;
  defaultLabel: string;
};

const REPORT_REASONS: ReportPhotoReason[] = [
  {
    value: 'inappropriate',
    labelKey: 'skills.reportPhotoReasonInappropriate',
    defaultLabel: 'Nevhodny obsah',
  },
  {
    value: 'spam',
    labelKey: 'skills.reportPhotoReasonSpam',
    defaultLabel: 'Spam',
  },
  {
    value: 'fake',
    labelKey: 'skills.reportPhotoReasonFake',
    defaultLabel: 'Falosna alebo zavadzajuca fotka',
  },
  {
    value: 'other',
    labelKey: 'skills.reportPhotoReasonOther',
    defaultLabel: 'Ine',
  },
];

type ReportPhotoModalProps = {
  open: boolean;
  target: ReportPhotoTarget | null;
  onClose: () => void;
  onSuccess?: (target: ReportPhotoTarget) => void | Promise<void>;
};

function isValidTarget(target: ReportPhotoTarget | null): target is ReportPhotoTarget {
  if (!target) return false;
  if (target.type === 'offer_image') {
    return Number.isFinite(target.skillId) && Number.isFinite(target.imageId);
  }
  return Number.isFinite(target.userId);
}

export function ReportPhotoModal({
  open,
  target,
  onClose,
  onSuccess,
}: ReportPhotoModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    setReason(REPORT_REASONS[0].value);
    setDescription('');
    setError(null);
    setDropdownOpen(false);
  }, [open, target]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidTarget(target)) {
      setError(t('skills.reportPhotoUnavailable', 'Fotku sa nepodarilo identifikovat.'));
      return;
    }

    const selectedReason = REPORT_REASONS.find((item) => item.value === reason);
    const reasonLabel = selectedReason
      ? t(selectedReason.labelKey, selectedReason.defaultLabel)
      : reason;

    setIsSubmitting(true);
    setError(null);

    try {
      if (target.type === 'offer_image') {
        await api.post(endpoints.skills.reportImage(target.skillId, target.imageId), {
          reason: reasonLabel,
          description: description.trim() || undefined,
        });
      } else {
        await api.post(endpoints.users.reportAvatar(target.userId), {
          reason: reasonLabel,
          description: description.trim() || undefined,
        });
      }

      await onSuccess?.(target);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error
          ? err.message
          : t('skills.reportPhotoError', 'Chyba pri nahlaseni fotky.'));
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-photo-modal-title"
      onClick={handleBackdropClick}
    >
      <form
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f10] sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submitReport}
      >
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2
                id="report-photo-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t('skills.reportPhoto', 'Nahlasit fotku')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label={t('common.close', 'Zavriet')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div ref={dropdownRef} className="relative">
              <label
                htmlFor="report-photo-reason"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('reviews.reportReason', 'Dovod nahlasenia')}
              </label>
              <button
                type="button"
                id="report-photo-reason"
                onClick={() => !isSubmitting && setDropdownOpen((current) => !current)}
                disabled={isSubmitting}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-3 text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white"
              >
                <span>
                  {t(
                    REPORT_REASONS.find((item) => item.value === reason)?.labelKey ||
                      REPORT_REASONS[0].labelKey,
                    REPORT_REASONS.find((item) => item.value === reason)?.defaultLabel ||
                      REPORT_REASONS[0].defaultLabel,
                  )}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 shrink-0 text-gray-500 transition-transform dark:text-gray-400 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-[#0f0f10]">
                  {REPORT_REASONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setReason(item.value);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        item.value === reason
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                          : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-[#0f0f10] dark:text-white dark:hover:bg-gray-800'
                      }`}
                    >
                      {t(item.labelKey, item.defaultLabel)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="report-photo-description"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('reviews.reportDescription', 'Popis nahlasenia')} ({t('common.optional', 'nepovinne')})
              </label>
              <textarea
                id="report-photo-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('reviews.reportDescriptionPlaceholder', 'Popiste dovod nahlasenia...')}
                rows={3}
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
                disabled={isSubmitting}
              />
            </div>

            {error && <div className="error-alert-modern mt-3 text-sm">{error}</div>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              {t('common.cancel', 'Zrusit')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('common.sending', 'Odosielam...')}
                </>
              ) : (
                t('common.submit', 'Odoslat')
              )}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

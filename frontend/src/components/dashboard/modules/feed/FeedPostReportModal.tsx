'use client';

/**
 * Nahlásenie príspevku – jednokrokový dialóg podľa vzoru ReportReviewModal
 * (spodný panel na mobile, centrovaný modal na desktope).
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeedDialog } from './useFeedDialog';
import { reportFeedPost } from '@/lib/feedApi';
import { translateReportError } from '@/lib/reportErrors';

// Zhodné hodnoty ako ReportReviewModal/ReportPhotoModal; „falošná recenzia"
// na príspevok nesedí, preto je namiesto nej obťažovanie.
const REPORT_REASONS = [
  { value: 'inappropriate', labelKey: 'feed.reportReasonInappropriate', fallback: 'Nevhodný obsah' },
  { value: 'spam', labelKey: 'feed.reportReasonSpam', fallback: 'Spam' },
  { value: 'harassment', labelKey: 'feed.reportReasonHarassment', fallback: 'Obťažovanie' },
  { value: 'other', labelKey: 'feed.reportReasonOther', fallback: 'Iné' },
] as const;

type FeedPostReportModalProps = {
  open: boolean;
  onClose: () => void;
  postId: number;
  onReported?: () => void;
};

export default function FeedPostReportModal({
  open,
  onClose,
  postId,
  onReported,
}: FeedPostReportModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setReason(REPORT_REASONS[0].value);
      setDescription('');
    }
  }, [open]);

  // Dôvod „iné" nenesie sám o sebe informáciu – bez popisu nemá moderátor
  // z čoho vychádzať, preto je popis pri ňom povinný (rovnako vynucuje BE).
  const descriptionRequired = reason === 'other';
  const descriptionMissing = descriptionRequired && !description.trim();

  const dialogRef = useFeedDialog({ open, onClose, canClose: !submitting });

  if (!open || !mounted || typeof document === 'undefined') return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Posiela sa STABILNÁ hodnota, nie preložený text: reason končí
      // v moderačnej fronte, kde by lokalizovaná hláška znamenala, že sa
      // rovnaký dôvod nedá filtrovať ani zoskupiť naprieč jazykmi.
      await reportFeedPost(postId, { reason, description });
      toast.success(t('feed.reportSuccess', 'Príspevok bol nahlásený.'));
      onReported?.();
      onClose();
    } catch (err) {
      // Duplicitné nahlásenie vracia BE ako friendly 400 – ukáž ho ako toast,
      // nie ako neošetrenú chybu.
      toast.error(
        translateReportError(t, err, t('feed.reportError', 'Nahlásenie sa nepodarilo.')),
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-report-title"
      data-testid="feed-report-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl dark:border-gray-800 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2
                id="feed-report-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t('feed.reportPost', 'Nahlásiť príspevok')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label={t('common.close', 'Zavrieť')}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('feed.reportReason', 'Dôvod')}
            </legend>
            {REPORT_REASONS.map((item) => (
              <label
                key={item.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  reason === item.value
                    ? 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200'
                    : 'border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900'
                }`}
              >
                <input
                  type="radio"
                  name="feed-report-reason"
                  value={item.value}
                  checked={reason === item.value}
                  onChange={() => setReason(item.value)}
                  disabled={submitting}
                  className="h-4 w-4 accent-purple-600"
                />
                {t(item.labelKey, item.fallback)}
              </label>
            ))}
          </fieldset>

          <div className="mt-4">
            <label
              htmlFor="feed-report-description"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('feed.reportDescription', 'Popis')}{' '}
              {descriptionRequired
                ? '*'
                : `(${t('common.optional', 'nepovinné')})`}
            </label>
            <textarea
              id="feed-report-description"
              aria-required={descriptionRequired}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={submitting}
              placeholder={t('feed.reportDescriptionPlaceholder', 'Doplňujúce informácie...')}
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || descriptionMissing}
              className="rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? t('common.sending', 'Odosielam...')
                : t('common.submit', 'Odoslať')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SkillRequestTerminationReason } from './types';
import { TERMINATION_REASON_OPTIONS } from './terminationReasons';

type TerminateExchangePayload = {
  reason: SkillRequestTerminationReason;
  description: string;
};

type TerminateExchangeModalProps = {
  open: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: TerminateExchangePayload) => void;
};

export function TerminateExchangeModal({
  open,
  isSubmitting = false,
  error = null,
  onClose,
  onSubmit,
}: TerminateExchangeModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState<SkillRequestTerminationReason>(
    TERMINATION_REASON_OPTIONS[0].value,
  );
  const [description, setDescription] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setReason(TERMINATION_REASON_OPTIONS[0].value);
    setDescription('');
  }, [open]);

  if (!open || !mounted || typeof document === 'undefined') return null;

  const closeIfAllowed = () => {
    if (!isSubmitting) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminate-exchange-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeIfAllowed();
      }}
    >
      <form
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f10] sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ reason, description: description.trim() });
        }}
      >
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2
                  id="terminate-exchange-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  {t('requests.terminateExchangeTitle', 'Predčasne ukončiť')}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t(
                    'requests.terminateExchangeDescription',
                    'Výmena sa predčasne ukončí okamžite a recenzia nebude možná.',
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeIfAllowed}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label={t('common.close', 'Zavrieť')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('requests.terminationReasonLabel', 'Dôvod ukončenia')}
            </legend>
            {TERMINATION_REASON_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                <input
                  type="radio"
                  name="termination-reason"
                  value={option.value}
                  checked={reason === option.value}
                  disabled={isSubmitting}
                  onChange={() => setReason(option.value)}
                  className="mt-0.5 h-4 w-4 accent-purple-600"
                />
                <span>{t(option.labelKey, option.defaultLabel)}</span>
              </label>
            ))}
          </fieldset>

          <div className="mt-4">
            <label
              htmlFor="termination-description"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('requests.terminationDescriptionLabel', 'Popis')} ({t('common.optional', 'nepovinné')})
            </label>
            <textarea
              id="termination-description"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t(
                'requests.terminationDescriptionPlaceholder',
                'Môžeš doplniť krátke vysvetlenie.',
              )}
              rows={3}
              disabled={isSubmitting}
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {description.length}/1000
            </p>
          </div>

          {error && <div className="error-alert-modern mt-3 text-sm">{error}</div>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeIfAllowed}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/40"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-transparent" />
                  {t('common.sending', 'Odosielam...')}
                </>
              ) : (
                t('requests.terminateExchangeSubmit', 'Predčasne ukončiť výmenu')
              )}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

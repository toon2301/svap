'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';

import BugReportForm from './BugReportForm';
import type { BugReportResponse } from './types';

type BugReportDialogProps = {
  onClose: () => void;
};

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function BugReportDialog({ onClose }: BugReportDialogProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const discardDialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isDirtyRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const discardConfirmRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [success, setSuccess] = useState<BugReportResponse | null>(null);
  const [formKey, setFormKey] = useState(0);

  const requestClose = useCallback(() => {
    if (isSubmittingRef.current) return;
    if (isDirtyRef.current) {
      discardConfirmRef.current = true;
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [onClose]);

  const setDiscardConfirm = (open: boolean) => {
    discardConfirmRef.current = open;
    setShowDiscardConfirm(open);
  };

  const handleSubmittingChange = (submitting: boolean) => {
    isSubmittingRef.current = submitting;
    setIsSubmitting(submitting);
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (discardConfirmRef.current) {
          setDiscardConfirm(false);
        } else {
          requestClose();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const activeDialog = discardDialogRef.current ?? dialogRef.current;
      const focusable = Array.from(
        activeDialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [requestClose]);

  const startAnotherReport = () => {
    setSuccess(null);
    isDirtyRef.current = false;
    setFormKey((current) => current + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={showDiscardConfirm || undefined}
        className="flex h-dvh w-full flex-col overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-black dark:text-white sm:h-auto sm:max-h-[min(90vh,850px)] sm:max-w-2xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 dark:border-gray-800 sm:px-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold sm:text-2xl">
              {t('bugReport.title', 'Nahlásiť problém')}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t(
                'bugReport.subtitle',
                'Pomôž nám problém nájsť a opraviť čo najrýchlejšie.',
              )}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={isSubmitting}
            onClick={requestClose}
            className="shrink-0 rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            aria-label={t('bugReport.close', 'Zatvoriť')}
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 elegant-scrollbar sm:px-6">
          {success ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <CheckCircleIcon className="h-16 w-16 text-emerald-500" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold">
                {t('bugReport.successTitle', 'Hlásenie bolo odoslané')}
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
                {t(
                  'bugReport.successDescription',
                  'Ďakujeme. Hlásenie sme prijali a pozrieme sa naň.',
                )}
              </p>
              <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 dark:border-purple-800 dark:bg-purple-950/30">
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {t('bugReport.reference', 'Referencia')}
                </span>
                <strong className="mt-0.5 block font-mono text-purple-800 dark:text-purple-200">
                  {success.reference}
                </strong>
              </div>
              <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={startAnotherReport}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
                >
                  {t('bugReport.another', 'Nahlásiť ďalší problém')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
                >
                  {t('bugReport.close', 'Zatvoriť')}
                </button>
              </div>
            </div>
          ) : (
            <BugReportForm
              key={formKey}
              onCancel={requestClose}
              onDirtyChange={(dirty) => { isDirtyRef.current = dirty; }}
              onSubmittingChange={handleSubmittingChange}
              onSuccess={setSuccess}
            />
          )}
        </div>
      </div>

      {showDiscardConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
        >
          <div
            ref={discardDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-discard`}
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          >
            <ExclamationTriangleIcon className="h-10 w-10 text-amber-500" aria-hidden="true" />
            <h3 id={`${titleId}-discard`} className="mt-3 text-lg font-bold">
              {t('bugReport.discardTitle', 'Zahodiť rozpísané hlásenie?')}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t(
                'bugReport.discardDescription',
                'Po zatvorení sa rozpísané údaje neuložia.',
              )}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setDiscardConfirm(false)}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                {t('bugReport.keepEditing', 'Pokračovať v úprave')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t('bugReport.discard', 'Zahodiť')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

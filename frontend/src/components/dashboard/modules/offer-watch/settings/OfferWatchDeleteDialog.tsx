'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalFocusTrap } from '../../profile/useModalFocusTrap';
import type { OfferWatch } from '../types';
import { offerWatchSubcategoryLabel } from './offerWatchUi';

type OfferWatchDeleteDialogProps = {
  watch: OfferWatch | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function OfferWatchDeleteDialog({
  watch,
  isSubmitting,
  onClose,
  onConfirm,
}: OfferWatchDeleteDialogProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const open = watch !== null;

  useModalFocusTrap(open, dialogRef);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose, open]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isSubmitting) onClose();
  };

  if (!open || !watch || !mounted || typeof document === 'undefined') return null;
  const watchName = offerWatchSubcategoryLabel(t, watch.category, watch.subcategory);
  return createPortal(
    <div
      className='fixed inset-0 z-[10010] flex items-end justify-center bg-black/55 p-4 sm:items-center'
      role='alertdialog'
      aria-modal='true'
      aria-labelledby='offer-watch-delete-title'
      aria-describedby='offer-watch-delete-description'
      onClick={handleBackdropClick}
      data-testid='offer-watch-delete-dialog'
    >
      <div
        ref={dialogRef}
        className='w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:p-6'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-start gap-4'>
          <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-300'>
            <TrashIcon className='h-5 w-5' aria-hidden='true' />
          </div>
          <div className='min-w-0'>
            <h2 id='offer-watch-delete-title' className='text-lg font-semibold text-gray-900 dark:text-white'>
              {t('offerWatch.deleteTitle', 'Vymazať sledovanie?')}
            </h2>
            <p id='offer-watch-delete-description' className='mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
              {t('offerWatch.deleteDescription', 'Táto akcia sa nedá vrátiť späť.')}
            </p>
            <p className='mt-2 truncate text-sm font-semibold text-gray-900 dark:text-white'>{watchName}</p>
          </div>
        </div>
        <div className='mt-6 grid grid-cols-2 gap-3'>
          <button
            ref={cancelButtonRef}
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            className='min-h-11 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900'
          >
            {t('common.cancel', 'Zrušiť')}
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isSubmitting}
            className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:opacity-50'
          >
            {isSubmitting ? <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' aria-hidden='true' /> : null}
            {isSubmitting
              ? t('offerWatch.deleting', 'Vymazávam...')
              : t('offerWatch.deleteConfirm', 'Vymazať')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

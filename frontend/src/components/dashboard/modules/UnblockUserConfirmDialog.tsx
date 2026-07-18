'use client';

import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { NoSymbolIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalFocusTrap } from './profile/useModalFocusTrap';

type UnblockUserConfirmDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

type UnblockDialogBodyProps = {
  cancelButtonRef: RefObject<HTMLButtonElement>;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function UnblockDialogBody({
  cancelButtonRef,
  isSubmitting,
  onClose,
  onConfirm,
}: UnblockDialogBodyProps) {
  const { t } = useLanguage();

  return (
    <>
      <div className='flex items-start gap-4'>
        <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800'>
          <NoSymbolIcon className='h-6 w-6 text-gray-700 dark:text-gray-200' aria-hidden='true' />
        </div>
        <div className='min-w-0 flex-1'>
          <h2 id='unblock-user-title' className='text-lg font-semibold text-gray-900 dark:text-white'>
            {t('blockedUsers.confirmTitle')}
          </h2>
          <p id='unblock-user-description' className='mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
            {t('blockedUsers.confirmDescription')}
          </p>
        </div>
      </div>
      <div className='mt-6 grid grid-cols-2 gap-3'>
        <button
          ref={cancelButtonRef}
          type='button'
          onClick={onClose}
          disabled={isSubmitting}
          className='rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50'
        >
          {t('common.cancel')}
        </button>
        <button
          type='button'
          onClick={onConfirm}
          disabled={isSubmitting}
          className='inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200'
        >
          {isSubmitting ? (
            <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
          ) : null}
          {isSubmitting ? t('blockedUsers.unblocking') : t('blockedUsers.unblock')}
        </button>
      </div>
    </>
  );
}

export function UnblockUserConfirmDialog({
  open,
  isSubmitting,
  onClose,
  onConfirm,
}: UnblockUserConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useModalFocusTrap(open, dialogRef);
  useEffect(() => setMounted(true), []);
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

  if (!open || !mounted || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className='fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-4 sm:items-center'
      role='alertdialog'
      aria-modal='true'
      aria-labelledby='unblock-user-title'
      aria-describedby='unblock-user-description'
      onClick={handleBackdropClick}
      data-testid='unblock-user-confirm-dialog'
    >
      <div
        ref={dialogRef}
        className='w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-[#0f0f10] sm:p-6'
        onClick={(event) => event.stopPropagation()}
      >
        <UnblockDialogBody
          cancelButtonRef={cancelButtonRef}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </div>
    </div>,
    document.body,
  );
}

'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalFocusTrap } from '../../profile/useModalFocusTrap';
import { createOfferWatchDraft, validateOfferWatchDraft } from '../offerWatchDraft';
import type {
  OfferWatch,
  OfferWatchActionResult,
  OfferWatchDraft,
  OfferWatchDraftField,
  OfferWatchInput,
  OfferWatchValidationErrors,
} from '../types';
import OfferWatchForm from './OfferWatchForm';
import {
  focusFirstOfferWatchError,
  offerWatchErrorMessage,
  validationErrorsFromApiFields,
} from './offerWatchUi';

type OfferWatchEditDialogProps = {
  watch: OfferWatch | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (watchId: number, input: OfferWatchInput) => Promise<OfferWatchActionResult<OfferWatch>>;
  onUnavailable: () => void;
};

const FORM_ID = 'offer-watch-edit';

export default function OfferWatchEditDialog({
  watch,
  isSubmitting,
  onClose,
  onSave,
  onUnavailable,
}: OfferWatchEditDialogProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<OfferWatchDraft>(() => createOfferWatchDraft());
  const [errors, setErrors] = useState<OfferWatchValidationErrors>({});
  const open = watch !== null;

  useModalFocusTrap(open, dialogRef);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!watch) return;
    setDraft(createOfferWatchDraft({ watch }));
    setErrors({});
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }, [watch]);

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose, open]);

  const handleDraftChange = useCallback((
    nextDraft: OfferWatchDraft,
    clearFields: OfferWatchDraftField[] = [],
  ) => {
    setDraft(nextDraft);
    if (clearFields.length) {
      setErrors((current) => {
        const next = { ...current };
        clearFields.forEach((field) => delete next[field]);
        return next;
      });
    }
  }, []);

  const handleSubmit = async () => {
    if (!watch || isSubmitting) return;
    const validation = validateOfferWatchDraft(draft);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstOfferWatchError(FORM_ID, validation.errors);
      toast.error(offerWatchErrorMessage(t, 'validation'));
      return;
    }

    const result = await onSave(watch.id, validation.input);
    if (result.ok) {
      toast.success(t('offerWatch.updateSuccess', 'Sledovanie bolo upravené.'));
      onClose();
      return;
    }
    if (result.error.kind === 'cancelled') return;
    if (result.error.kind === 'validation') {
      const serverErrors = validationErrorsFromApiFields(result.error.fields);
      setErrors(serverErrors);
      focusFirstOfferWatchError(FORM_ID, serverErrors);
    }
    toast.error(offerWatchErrorMessage(t, result.error.kind));
    if (result.error.kind === 'not_found') onUnavailable();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isSubmitting) onClose();
  };

  if (!open || !watch || !mounted || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='offer-watch-edit-title'
      aria-describedby='offer-watch-edit-description'
      onClick={handleBackdropClick}
      data-testid='offer-watch-edit-dialog'
    >
      <div
        ref={dialogRef}
        className='max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:p-6'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='mb-5 flex items-start justify-between gap-4'>
          <div>
            <h2 id='offer-watch-edit-title' className='text-xl font-semibold text-gray-900 dark:text-white'>
              {t('offerWatch.editTitle', 'Upraviť sledovanie')}
            </h2>
            <p id='offer-watch-edit-description' className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              {t('offerWatch.editDescription', 'Zmeny sa použijú až po ich uložení.')}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('common.close', 'Zatvoriť')}
            className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400/40 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white'
          >
            <XMarkIcon className='h-5 w-5' aria-hidden='true' />
          </button>
        </div>

        <OfferWatchForm
          idPrefix={FORM_ID}
          draft={draft}
          errors={errors}
          onChange={handleDraftChange}
          onSubmit={handleSubmit}
          submitLabel={t('offerWatch.saveChanges', 'Uložiť zmeny')}
          submittingLabel={t('offerWatch.savingChanges', 'Ukladám zmeny...')}
          isSubmitting={isSubmitting}
          secondaryLabel={t('common.cancel', 'Zrušiť')}
          onSecondary={onClose}
          persistCountrySelection={false}
        />
      </div>
    </div>,
    document.body,
  );
}

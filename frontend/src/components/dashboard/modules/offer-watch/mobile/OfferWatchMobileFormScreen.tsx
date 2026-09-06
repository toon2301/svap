'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  createOfferWatchDraft,
  validateOfferWatchDraft,
} from '../offerWatchDraft';
import type {
  OfferWatch,
  OfferWatchActionResult,
  OfferWatchDraft,
  OfferWatchDraftField,
  OfferWatchInput,
  OfferWatchValidationErrors,
} from '../types';
import OfferWatchForm from '../settings/OfferWatchForm';
import {
  focusFirstOfferWatchError,
  offerWatchErrorMessage,
  validationErrorsFromApiFields,
} from '../settings/offerWatchUi';
import OfferWatchMobileShell from './OfferWatchMobileShell';

type OfferWatchMobileFormScreenProps = {
  mode: 'create' | 'edit';
  watch?: OfferWatch;
  isSubmitting: boolean;
  onBack: () => void;
  onSave: (input: OfferWatchInput) => Promise<OfferWatchActionResult<OfferWatch>>;
  onSaved: () => void;
  onUnavailable: () => void;
};

export default function OfferWatchMobileFormScreen({
  mode,
  watch,
  isSubmitting,
  onBack,
  onSave,
  onSaved,
  onUnavailable,
}: OfferWatchMobileFormScreenProps) {
  const { country, t } = useLanguage();
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const formId = mode === 'create' ? 'offer-watch-mobile-create' : 'offer-watch-mobile-edit';
  const [draft, setDraft] = useState<OfferWatchDraft>(() => createOfferWatchDraft({
    watch,
    detectedCountryCode: country,
  }));
  const [errors, setErrors] = useState<OfferWatchValidationErrors>({});

  useEffect(() => {
    requestAnimationFrame(() => backButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (mode !== 'create' || draft.countryCode || !country) return;
    setDraft((current) => ({ ...current, countryCode: country }));
    setErrors((current) => {
      const next = { ...current };
      delete next.countryCode;
      return next;
    });
  }, [country, draft.countryCode, mode]);

  const handleDraftChange = useCallback((
    nextDraft: OfferWatchDraft,
    clearFields: OfferWatchDraftField[] = [],
  ) => {
    setDraft(nextDraft);
    if (!clearFields.length) return;
    setErrors((current) => {
      const next = { ...current };
      clearFields.forEach((field) => delete next[field]);
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const validation = validateOfferWatchDraft(draft);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstOfferWatchError(formId, validation.errors);
      toast.error(offerWatchErrorMessage(t, 'validation'));
      return;
    }

    const result = await onSave(validation.input);
    if (result.ok) {
      toast.success(mode === 'create'
        ? t('offerWatch.createSuccess', 'Sledovanie bolo uložené.')
        : t('offerWatch.updateSuccess', 'Sledovanie bolo upravené.'));
      onSaved();
      return;
    }
    if (result.error.kind === 'cancelled') return;
    if (result.error.kind === 'validation') {
      const serverErrors = validationErrorsFromApiFields(result.error.fields);
      setErrors(serverErrors);
      focusFirstOfferWatchError(formId, serverErrors);
    }
    toast.error(offerWatchErrorMessage(t, result.error.kind));
    if (result.error.kind === 'not_found' || result.error.kind === 'limit') {
      onUnavailable();
    }
  };

  const title = mode === 'create'
    ? t('offerWatch.createAction', 'Vytvoriť sledovanie')
    : t('offerWatch.editTitle', 'Upraviť sledovanie');

  return (
    <OfferWatchMobileShell
      title={title}
      onBack={onBack}
      backDisabled={isSubmitting}
      initialFocusRef={backButtonRef}
    >
      <div className='px-4 pb-[max(7rem,calc(env(safe-area-inset-bottom,0px)+5rem))] pt-5 sm:px-6'>
        <p className='mb-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
          {mode === 'create'
            ? t('offerWatch.createDescription', 'Nastav filtre, podľa ktorých ťa upozorníme na nové zhody.')
            : t('offerWatch.editDescription', 'Zmeny sa použijú až po ich uložení.')}
        </p>
        <OfferWatchForm
          idPrefix={formId}
          draft={draft}
          errors={errors}
          onChange={handleDraftChange}
          onSubmit={handleSubmit}
          submitLabel={mode === 'create'
            ? t('offerWatch.save', 'Uložiť sledovanie')
            : t('offerWatch.saveChanges', 'Uložiť zmeny')}
          submittingLabel={mode === 'create'
            ? t('offerWatch.saving', 'Ukladám sledovanie...')
            : t('offerWatch.savingChanges', 'Ukladám zmeny...')}
          isSubmitting={isSubmitting}
          secondaryLabel={t('common.cancel', 'Zrušiť')}
          onSecondary={onBack}
          persistCountrySelection={mode === 'create'}
        />
      </div>
    </OfferWatchMobileShell>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OfferCountryCode } from '@/shared/countryRegistry';
import {
  createOfferWatchDraft,
  selectOfferWatchCategory,
  selectOfferWatchCountry,
  selectOfferWatchDistrict,
  validateOfferWatchDraft,
} from '../offerWatchDraft';
import {
  buildOfferWatchCategoryOptions,
  buildOfferWatchCountryOptions,
  buildOfferWatchDistrictOptions,
  offerWatchCategoryKey,
  parseOfferWatchCategoryKey,
  type OfferWatchSelectionOption,
} from '../offerWatchSelectionOptions';
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
import OfferWatchMobilePickerScreen from './OfferWatchMobilePickerScreen';
import type { OfferWatchMobilePicker } from './offerWatchMobileNavigation';
import type { VisualViewportBounds } from '../../../hooks/useVisualViewportBounds';
import { useOfferWatchPriceFieldVisibility } from './useOfferWatchPriceFieldVisibility';

type OfferWatchMobileFormScreenProps = {
  mode: 'create' | 'edit';
  watch?: OfferWatch;
  isSubmitting: boolean;
  onBack: () => void;
  onSave: (input: OfferWatchInput) => Promise<OfferWatchActionResult<OfferWatch>>;
  onSaved: () => void;
  onUnavailable: () => void;
  picker?: OfferWatchMobilePicker;
  onOpenPicker: (picker: OfferWatchMobilePicker) => void;
  viewportBounds: VisualViewportBounds | null;
};

type PickerConfiguration = {
  title: string;
  searchPlaceholder: string;
  emptyMessage: string;
  startTypingMessage?: string;
  options: OfferWatchSelectionOption[];
  selectedKey: string;
  requireQuery?: boolean;
};

export default function OfferWatchMobileFormScreen({
  mode,
  watch,
  isSubmitting,
  onBack,
  onSave,
  onSaved,
  onUnavailable,
  picker,
  onOpenPicker,
  viewportBounds,
}: OfferWatchMobileFormScreenProps) {
  const { country, locale, setCountry, t } = useLanguage();
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousPickerRef = useRef<OfferWatchMobilePicker | undefined>(picker);
  const formId = mode === 'create' ? 'offer-watch-mobile-create' : 'offer-watch-mobile-edit';
  const [draft, setDraft] = useState<OfferWatchDraft>(() => createOfferWatchDraft({
    watch,
    detectedCountryCode: country,
  }));
  const [errors, setErrors] = useState<OfferWatchValidationErrors>({});
  const priceFieldVisibility = useOfferWatchPriceFieldVisibility({
    scrollContainerRef,
    viewportBounds,
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => backButtonRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const previousPicker = previousPickerRef.current;
    previousPickerRef.current = picker;
    if (!previousPicker || picker) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`${formId}-${previousPicker}`)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [formId, picker]);

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

  const pickerConfiguration = useMemo<PickerConfiguration | null>(() => {
    if (picker === 'category') {
      return {
        title: t('offerWatch.categoryLabel', 'Podkategória'),
        searchPlaceholder: t('offerWatch.categorySearchPlaceholder', 'Začni písať názov podkategórie'),
        startTypingMessage: t('offerWatch.categoryStartTyping', 'Začni písať a vyber podkategóriu zo zoznamu.'),
        emptyMessage: t('offerWatch.categoryNoResults', 'Nenašla sa žiadna podkategória.'),
        options: buildOfferWatchCategoryOptions(t),
        selectedKey: offerWatchCategoryKey(draft.category, draft.subcategory),
        requireQuery: true,
      };
    }
    if (picker === 'country') {
      return {
        title: t('skills.countryTitle', 'Krajina'),
        searchPlaceholder: t('skills.countrySearchPlaceholder', 'Vyhľadaj krajinu'),
        emptyMessage: t('skills.countryNoResults', 'Nenašla sa žiadna krajina.'),
        options: buildOfferWatchCountryOptions(locale),
        selectedKey: draft.countryCode,
      };
    }
    if (picker === 'district') {
      const allDistrictsLabel = t('offerWatch.allDistricts', 'Všetky okresy');
      return {
        title: t('skills.district', 'Okres'),
        searchPlaceholder: t('offerWatch.districtSearchPlaceholder', 'Vyhľadaj okres'),
        emptyMessage: t('offerWatch.districtNoResults', 'Nenašiel sa žiadny okres.'),
        options: buildOfferWatchDistrictOptions(draft.countryCode, allDistrictsLabel),
        selectedKey: draft.districtCode,
      };
    }
    return null;
  }, [draft.category, draft.countryCode, draft.districtCode, draft.subcategory, locale, picker, t]);

  const handlePickerSelect = useCallback((option: OfferWatchSelectionOption) => {
    if (picker === 'category') {
      const selection = parseOfferWatchCategoryKey(option.key);
      if (!selection) return;
      handleDraftChange(
        selectOfferWatchCategory(draft, selection.category, selection.subcategory),
        ['category', 'subcategory'],
      );
    } else if (picker === 'country') {
      const countryCode = option.key as OfferCountryCode;
      if (mode === 'create') setCountry(countryCode);
      const nextDraft = selectOfferWatchCountry(draft, countryCode);
      const clearFields: OfferWatchDraftField[] = ['countryCode', 'districtCode'];
      if (nextDraft.priceCurrency !== draft.priceCurrency) {
        clearFields.push('priceCurrency');
      }
      handleDraftChange(nextDraft, clearFields);
    } else if (picker === 'district') {
      handleDraftChange(
        selectOfferWatchDistrict(draft, option.key),
        ['districtCode'],
      );
    } else {
      return;
    }
    onBack();
  }, [draft, handleDraftChange, mode, onBack, picker, setCountry]);

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

  if (picker && pickerConfiguration) {
    return (
      <OfferWatchMobilePickerScreen
        key={picker}
        {...pickerConfiguration}
        onBack={onBack}
        onSelect={handlePickerSelect}
      />
    );
  }

  return (
    <OfferWatchMobileShell
      title={title}
      onBack={onBack}
      backDisabled={isSubmitting}
      initialFocusRef={backButtonRef}
      contentRef={scrollContainerRef}
    >
      <div
        className='px-4 pb-[max(7rem,calc(env(safe-area-inset-bottom,0px)+5rem))] pt-5 sm:px-6'
        onFocusCapture={priceFieldVisibility.onFocusCapture}
        onBlurCapture={priceFieldVisibility.onBlurCapture}
      >
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
            ? t('common.save', 'Uložiť')
            : t('offerWatch.saveChanges', 'Uložiť zmeny')}
          submittingLabel={mode === 'create'
            ? t('offerWatch.saving', 'Ukladám sledovanie...')
            : t('offerWatch.savingChanges', 'Ukladám zmeny...')}
          isSubmitting={isSubmitting}
          secondaryLabel={t('common.cancel', 'Zrušiť')}
          onSecondary={onBack}
          persistCountrySelection={mode === 'create'}
          onOpenMobilePicker={onOpenPicker}
        />
      </div>
    </OfferWatchMobileShell>
  );
}

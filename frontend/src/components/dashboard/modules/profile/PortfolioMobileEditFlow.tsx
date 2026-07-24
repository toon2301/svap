'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  PhotoIcon,
  PencilSquareIcon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { updatePortfolioItem } from './portfolioApi';
import { PortfolioCategoryPicker } from './PortfolioCategoryPicker';
import { getPortfolioCategoryLabel } from './portfolioDisplay';
import {
  portfolioCreateCategoryError,
  portfolioCreateDescriptionError,
  portfolioCreateStepLabel,
  portfolioCreateTitleError,
  requiredPortfolioLabel,
  type PortfolioCreateStep,
} from './portfolioCreateFlow';
import {
  PORTFOLIO_DESCRIPTION_MAX_LENGTH,
  PORTFOLIO_IMAGE_MAX_COUNT,
  PORTFOLIO_TITLE_MAX_LENGTH,
  portfolioPayloadFromValues,
  portfolioPhotosRemainingText,
  type PortfolioFormErrors,
  type PortfolioFormValues,
} from './portfolioFormUtils';
import {
  translatePortfolioApiError,
  translatePortfolioFormErrors,
} from './portfolioApiErrors';
import { isActivePortfolioImage, uniquePortfolioImages } from './portfolioImageUtils';
import { PortfolioMobilePhotoEditor } from './PortfolioMobilePhotoEditor';
import type { PortfolioItem } from './portfolioTypes';

type PortfolioMobileEditFlowProps = {
  item: PortfolioItem;
  onClose: () => void;
  onSaved: (item: PortfolioItem) => void;
  onRefresh: () => Promise<void> | void;
  // Prepošle sa do foto-editora: keď server signalizuje, že celá položka už
  // neexistuje, nadradený modul zobrazí „položka neexistuje" a vráti na zoznam.
  onItemGone?: () => void;
};

type PortfolioEditField = PortfolioCreateStep;

type FieldOption = {
  field: PortfolioEditField;
  label: string;
  value: string;
  icon: typeof PencilSquareIcon;
};

function valuesFromItem(item: PortfolioItem): PortfolioFormValues {
  return {
    title: item.title || '',
    category: item.category || '',
    description: item.description || '',
  };
}

function LoadingSpinner() {
  return (
    <span
      className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function MobileEditHeader({
  title,
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  leftDisabled = false,
  rightDisabled = false,
  onLeft,
  onRight,
}: {
  title: string;
  leftLabel: string;
  rightLabel?: string;
  leftIcon: ReactNode;
  rightIcon?: ReactNode;
  leftDisabled?: boolean;
  rightDisabled?: boolean;
  onLeft: () => void;
  onRight?: () => void;
}) {
  return (
    <header className="relative flex min-h-[60px] shrink-0 items-center justify-center border-b border-gray-200 bg-white px-14 dark:border-gray-800 dark:bg-[#101011]">
      <button
        type="button"
        data-testid="portfolio-mobile-edit-left-action"
        aria-label={leftLabel}
        disabled={leftDisabled}
        onClick={onLeft}
        className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-900 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:hover:bg-[#171719]"
      >
        {leftIcon}
      </button>
      <h1 className="min-w-0 truncate text-center text-lg font-semibold text-gray-950 dark:text-white">
        {title}
      </h1>
      {onRight && rightIcon && rightLabel && (
        <button
          type="button"
          data-testid="portfolio-mobile-edit-right-action"
          aria-label={rightLabel}
          disabled={rightDisabled}
          onClick={onRight}
          className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-900 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:hover:bg-[#171719]"
        >
          {rightIcon}
        </button>
      )}
    </header>
  );
}

function FieldOptionRow({ option, onSelect }: { option: FieldOption; onSelect: () => void }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      data-testid={`portfolio-mobile-edit-option-${option.field}`}
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:border-gray-800 dark:bg-[#101011] dark:hover:border-purple-900/70 dark:hover:bg-purple-950/20"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-gray-950 dark:text-white">
          {option.label}
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-gray-500 dark:text-gray-400">
          {option.value}
        </span>
      </span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
    </button>
  );
}

export function PortfolioMobileEditFlow({
  item,
  onClose,
  onSaved,
  onRefresh,
  onItemGone,
}: PortfolioMobileEditFlowProps) {
  const { t } = useLanguage();
  const fieldId = useId();
  const [activeField, setActiveField] = useState<PortfolioEditField | null>(null);
  const [values, setValues] = useState<PortfolioFormValues>(() => valuesFromItem(item));
  const [errors, setErrors] = useState<PortfolioFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const titleInputId = `${fieldId}-mobile-edit-title`;
  const categoryInputId = `${fieldId}-mobile-edit-category`;
  const descriptionInputId = `${fieldId}-mobile-edit-description`;
  const titleErrorId = `${fieldId}-mobile-edit-title-error`;
  const categoryErrorId = `${fieldId}-mobile-edit-category-error`;
  const descriptionErrorId = `${fieldId}-mobile-edit-description-error`;
  const descriptionHelpId = `${fieldId}-mobile-edit-description-help`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (activeField && activeField !== 'photos') return;
    setValues(valuesFromItem(item));
  }, [activeField, item]);

  const categoryLabel = useMemo(
    () => (item.category ? getPortfolioCategoryLabel(t, item.category) : t('portfolio.categoryPlaceholder')),
    [item.category, t],
  );
  const activeImagesCount = useMemo(
    () => uniquePortfolioImages(item).filter(isActivePortfolioImage).length,
    [item],
  );
  const photoSummary = portfolioPhotosRemainingText(
    t,
    Math.max(0, PORTFOLIO_IMAGE_MAX_COUNT - activeImagesCount),
  );
  const descriptionSummary = item.description?.trim() || t('portfolio.addDescription');

  const options: FieldOption[] = [
    {
      field: 'title',
      label: t('portfolio.titleLabel'),
      value: item.title || t('portfolio.titlePlaceholder'),
      icon: PencilSquareIcon,
    },
    {
      field: 'category',
      label: t('portfolio.categoryLabel'),
      value: categoryLabel,
      icon: TagIcon,
    },
    {
      field: 'description',
      label: t('portfolio.descriptionLabel'),
      value: descriptionSummary,
      icon: DocumentTextIcon,
    },
    {
      field: 'photos',
      label: t('portfolio.photosLabel'),
      value: photoSummary,
      icon: PhotoIcon,
    },
  ];

  const handleChange = useCallback((field: keyof PortfolioFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  }, []);

  const resetFieldDraft = useCallback(() => {
    setValues(valuesFromItem(item));
    setErrors({});
    setSubmitError(null);
    setActiveField(null);
  }, [item]);

  const validateActiveField = useCallback((): PortfolioFormErrors => {
    if (activeField === 'title') {
      const title = portfolioCreateTitleError(values, t);
      return title ? { title } : {};
    }
    if (activeField === 'category') {
      const category = portfolioCreateCategoryError(values, t);
      return category ? { category } : {};
    }
    if (activeField === 'description') {
      const description = portfolioCreateDescriptionError(values, t);
      return description ? { description } : {};
    }
    return {};
  }, [activeField, t, values]);

  const handleSaveField = useCallback(async () => {
    if (!activeField || isSaving) return;
    if (activeField === 'photos') {
      setActiveField(null);
      return;
    }

    const nextErrors = validateActiveField();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstMessage = Object.values(nextErrors).find(Boolean);
      if (firstMessage) toast.error(firstMessage);
      return;
    }

    const nextPayload = portfolioPayloadFromValues(values);
    const currentPayload = portfolioPayloadFromValues(valuesFromItem(item));
    if (
      nextPayload.title === currentPayload.title &&
      nextPayload.category === currentPayload.category &&
      nextPayload.description === currentPayload.description
    ) {
      setActiveField(null);
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    try {
      const saved = await updatePortfolioItem(item.id, nextPayload);
      setValues(valuesFromItem(saved));
      toast.success(t('portfolio.saveSuccess'));
      onSaved(saved);
      setErrors({});
      setActiveField(null);
    } catch (error) {
      const fieldErrors = translatePortfolioFormErrors(t, error);
      const message = translatePortfolioApiError(t, error, t('portfolio.saveFailed'));
      setErrors(fieldErrors);
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [activeField, isSaving, item, onSaved, t, validateActiveField, values]);

  const activeLabel = activeField ? portfolioCreateStepLabel(activeField, t) : '';
  const activeHeaderLabel =
    activeField === 'title' || activeField === 'category'
      ? requiredPortfolioLabel(activeLabel)
      : activeLabel;

  if (!activeField) {
    return (
      <div
        data-testid="portfolio-mobile-edit-flow"
        className="fixed inset-0 z-[10020] flex flex-col bg-gray-50 text-gray-950 dark:bg-black dark:text-white lg:hidden"
      >
        <MobileEditHeader
          title={t('portfolio.editPortfolioTitle')}
          leftLabel={t('common.back', 'Back')}
          leftIcon={<ArrowLeftIcon className="h-6 w-6" aria-hidden="true" />}
          onLeft={onClose}
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-sm space-y-5">
            <div className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-gray-100 dark:border-gray-800 dark:bg-[#0f0f10] dark:ring-gray-900">
              <h2 className="text-xl font-semibold text-gray-950 dark:text-white">
                {t('portfolio.editPortfolioChooseField')}
              </h2>
            </div>
            <div className="space-y-3">
              {options.map((option) => (
                <FieldOptionRow
                  key={option.field}
                  option={option}
                  onSelect={() => {
                    setErrors({});
                    setSubmitError(null);
                    setActiveField(option.field);
                  }}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      data-testid={`portfolio-mobile-edit-field-${activeField}`}
      className="fixed inset-0 z-[10020] flex flex-col bg-gray-50 text-gray-950 dark:bg-black dark:text-white lg:hidden"
    >
      <MobileEditHeader
        title={activeHeaderLabel}
        leftLabel={t('common.save')}
        rightLabel={t('common.close', 'Close')}
        leftDisabled={isSaving}
        rightDisabled={isSaving}
        leftIcon={isSaving ? <LoadingSpinner /> : <CheckIcon className="h-6 w-6" aria-hidden="true" />}
        rightIcon={<XMarkIcon className="h-6 w-6" aria-hidden="true" />}
        onLeft={() => void handleSaveField()}
        onRight={resetFieldDraft}
      />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <section className="mx-auto max-w-sm overflow-hidden rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-gray-100 dark:border-gray-800 dark:bg-[#0f0f10] dark:ring-gray-900">
          {activeField === 'title' && (
            <div>
              <label htmlFor={titleInputId} className="sr-only">
                {requiredPortfolioLabel(t('portfolio.titleLabel'))}
              </label>
              <textarea
                id={titleInputId}
                data-testid="portfolio-mobile-edit-title-input"
                value={values.title}
                disabled={isSaving}
                maxLength={PORTFOLIO_TITLE_MAX_LENGTH}
                rows={4}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? titleErrorId : undefined}
                placeholder={t('portfolio.titlePlaceholder')}
                onChange={(event) => handleChange('title', event.target.value)}
                className="min-h-[158px] w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50/80 px-5 py-4 text-lg leading-7 text-gray-950 outline-none shadow-inner transition placeholder:text-gray-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-[#151517] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-purple-700 dark:focus:bg-[#101011] dark:focus:ring-purple-950/40"
              />
              <p className="mt-2 text-right text-xs font-medium text-gray-400 dark:text-gray-500">
                {values.title.length}/{PORTFOLIO_TITLE_MAX_LENGTH}
              </p>
              {errors.title && (
                <p id={titleErrorId} className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">
                  {errors.title}
                </p>
              )}
            </div>
          )}

          {activeField === 'category' && (
            <div>
              <label htmlFor={categoryInputId} className="sr-only">
                {requiredPortfolioLabel(t('portfolio.categoryLabel'))}
              </label>
              <PortfolioCategoryPicker
                buttonId={categoryInputId}
                value={values.category}
                disabled={isSaving}
                invalid={Boolean(errors.category)}
                describedBy={errors.category ? categoryErrorId : undefined}
                label={requiredPortfolioLabel(t('portfolio.categoryLabel'))}
                placeholder={t('portfolio.categoryPlaceholder')}
                onChange={(value) => handleChange('category', value)}
                buttonClassName="flex min-h-[58px] w-full items-center justify-between gap-3 rounded-[22px] border border-gray-200 bg-gray-50/80 px-5 py-3 text-left text-base font-medium text-gray-900 outline-none shadow-inner transition hover:bg-white focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-[#151517] dark:text-white dark:hover:bg-[#101011] dark:focus:border-purple-700 dark:focus:ring-purple-950/40"
              />
              {errors.category && (
                <p id={categoryErrorId} className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">
                  {errors.category}
                </p>
              )}
            </div>
          )}

          {activeField === 'description' && (
            <div>
              <label htmlFor={descriptionInputId} className="sr-only">
                {t('portfolio.descriptionLabel')}
              </label>
              <div className="relative">
                <textarea
                  id={descriptionInputId}
                  data-testid="portfolio-mobile-edit-description-input"
                  value={values.description}
                  disabled={isSaving}
                  maxLength={PORTFOLIO_DESCRIPTION_MAX_LENGTH}
                  rows={8}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={`${descriptionHelpId}${errors.description ? ` ${descriptionErrorId}` : ''}`}
                  placeholder={t('portfolio.addDescription')}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className="w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 pb-9 pt-3 text-base text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-purple-300 focus:ring-2 focus:ring-purple-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white dark:placeholder:text-gray-400 dark:focus:border-purple-800"
                />
                <span className="pointer-events-none absolute bottom-3 right-4 text-xs font-medium text-gray-400 dark:text-gray-500">
                  {values.description.length}/{PORTFOLIO_DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              <p id={descriptionHelpId} className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {t('portfolio.descriptionHelp')}
              </p>
              {errors.description && (
                <p id={descriptionErrorId} className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">
                  {errors.description}
                </p>
              )}
            </div>
          )}

          {activeField === 'photos' && (
            <PortfolioMobilePhotoEditor
              item={item}
              onRefresh={onRefresh}
              onItemGone={onItemGone}
            />
          )}

          {submitError && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
              {submitError}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { createPortfolioItem } from './portfolioApi';
import { PortfolioCategoryPicker } from './PortfolioCategoryPicker';
import { PortfolioCreateDiscardConfirm } from './PortfolioCreateDiscardConfirm';
import { PortfolioCreatePhotoPicker } from './PortfolioCreatePhotoPicker';
import { showPortfolioCreateErrors, uploadPortfolioFiles } from './portfolioCreateSubmit';
import {
  PORTFOLIO_CATEGORY_OPTIONS,
  PORTFOLIO_DESCRIPTION_MAX_LENGTH,
  PORTFOLIO_TITLE_MAX_LENGTH,
  emptyPortfolioFormValues,
  portfolioErrorMessageFromApi,
  portfolioFormErrorsFromApi,
  portfolioPayloadFromValues,
  validatePortfolioFormValues,
  type PortfolioFormErrors,
  type PortfolioFormField,
  type PortfolioFormValues,
} from './portfolioFormUtils';
import type { PortfolioItem } from './portfolioTypes';

type PortfolioCreateDesktopModalProps = {
  onCancel: () => void;
  onCreated: (item: PortfolioItem) => void;
};

const CREATE_STEPS = ['title', 'category', 'description', 'photos'] as const;
type CreateStep = typeof CREATE_STEPS[number];

type Translator = (key: string, fallback?: string) => string;

function progressText(t: Translator, current: number, total: number): string {
  return t('portfolio.createStepProgress', 'Step {current} of {total}')
    .replace('{current}', String(current))
    .replace('{total}', String(total));
}

function hasDraft(values: PortfolioFormValues, photoFiles: File[]): boolean {
  return Boolean(
    values.title.trim() ||
      values.category.trim() ||
      values.description.trim() ||
      photoFiles.length > 0,
  );
}

function titleError(values: PortfolioFormValues, t: Translator): string | undefined {
  const title = values.title.trim();
  if (!title) return t('portfolio.titleRequired');
  if (title.length > PORTFOLIO_TITLE_MAX_LENGTH) return t('portfolio.titleTooLong');
  return undefined;
}

function categoryError(values: PortfolioFormValues, t: Translator): string | undefined {
  const category = values.category.trim();
  if (!category) return t('portfolio.categoryRequired');
  if (!PORTFOLIO_CATEGORY_OPTIONS.includes(category as typeof PORTFOLIO_CATEGORY_OPTIONS[number])) {
    return t('portfolio.categoryRequired');
  }
  return undefined;
}

function descriptionError(values: PortfolioFormValues, t: Translator): string | undefined {
  if (values.description.trim().length > PORTFOLIO_DESCRIPTION_MAX_LENGTH) {
    return t('portfolio.descriptionTooLong');
  }
  return undefined;
}

function errorStep(errors: PortfolioFormErrors): CreateStep {
  if (errors.title) return 'title';
  if (errors.category) return 'category';
  if (errors.description) return 'description';
  return 'photos';
}

export function PortfolioCreateDesktopModal({
  onCancel,
  onCreated,
}: PortfolioCreateDesktopModalProps) {
  const { t } = useLanguage();
  const fieldId = useId();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<CreateStep>('title');
  const [values, setValues] = useState<PortfolioFormValues>(() => emptyPortfolioFormValues());
  const [errors, setErrors] = useState<PortfolioFormErrors>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdWithUploadIssue, setCreatedWithUploadIssue] = useState<PortfolioItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const titleInputId = `${fieldId}-portfolio-desktop-title`;
  const categoryInputId = `${fieldId}-portfolio-desktop-category`;
  const descriptionInputId = `${fieldId}-portfolio-desktop-description`;
  const titleErrorId = `${fieldId}-portfolio-desktop-title-error`;
  const categoryErrorId = `${fieldId}-portfolio-desktop-category-error`;
  const descriptionErrorId = `${fieldId}-portfolio-desktop-description-error`;
  const descriptionHelpId = `${fieldId}-portfolio-desktop-description-help`;
  const stepIndex = CREATE_STEPS.indexOf(step);
  const isLastStep = step === 'photos';
  const draftIsDirty = hasDraft(values, photoFiles);

  const stepCopy = useMemo(() => {
    if (step === 'title') {
      return {
        title: t('portfolio.createTitleStepTitle'),
        body: t('portfolio.createTitleStepBody'),
      };
    }
    if (step === 'category') {
      return {
        title: t('portfolio.createCategoryStepTitle'),
        body: t('portfolio.createCategoryStepBody'),
      };
    }
    if (step === 'description') {
      return {
        title: t('portfolio.createDescriptionStepTitle'),
        body: t('portfolio.createDescriptionStepBody'),
      };
    }
    return {
      title: t('portfolio.createPhotosStepTitle'),
      body: t('portfolio.createPhotosStepBody'),
    };
  }, [step, t]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  const requestClose = useCallback(() => {
    if (isSubmitting) return;
    if (createdWithUploadIssue) {
      onCreated(createdWithUploadIssue);
      return;
    }
    if (draftIsDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onCancel();
  }, [createdWithUploadIssue, draftIsDirty, isSubmitting, onCancel, onCreated]);

  useEffect(() => {
    if (!mounted) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted, requestClose]);

  useEffect(() => {
    if (step === 'title') {
      window.setTimeout(() => titleInputRef.current?.focus(), 0);
    }
  }, [step]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) requestClose();
  };

  const handleChange = (field: PortfolioFormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
    setCreatedWithUploadIssue(null);
  };

  const validateCurrentStep = (): boolean => {
    const nextErrors: PortfolioFormErrors = {};
    if (step === 'title') nextErrors.title = titleError(values, t);
    if (step === 'category') nextErrors.category = categoryError(values, t);
    if (step === 'description') nextErrors.description = descriptionError(values, t);

    const messages = Object.values(nextErrors).filter(Boolean);
    setErrors((current) => ({ ...current, ...nextErrors }));
    if (messages.length > 0) {
      showPortfolioCreateErrors(messages);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    setSubmitError(null);
    setStep(CREATE_STEPS[Math.min(stepIndex + 1, CREATE_STEPS.length - 1)]);
  };

  const goBack = () => {
    setSubmitError(null);
    setShowDiscardConfirm(false);
    setStep(CREATE_STEPS[Math.max(stepIndex - 1, 0)]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createdWithUploadIssue) {
      onCreated(createdWithUploadIssue);
      return;
    }
    if (isSubmitting) return;
    if (!isLastStep) {
      goNext();
      return;
    }

    const nextErrors = validatePortfolioFormValues(values, t);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError(null);
      setStep(errorStep(nextErrors));
      showPortfolioCreateErrors(Object.values(nextErrors));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setCreatedWithUploadIssue(null);

    let created: PortfolioItem | null = null;
    try {
      created = await createPortfolioItem(portfolioPayloadFromValues(values));
      if (photoFiles.length > 0) {
        await uploadPortfolioFiles(created.id, photoFiles);
      }
      onCreated(created);
    } catch (error) {
      if (created) {
        const message = portfolioErrorMessageFromApi(
          error,
          t('portfolio.photoUploadAfterCreateFailed'),
        );
        setCreatedWithUploadIssue(created);
        setSubmitError(message);
        toast.error(message);
        return;
      }
      const fieldErrors = portfolioFormErrorsFromApi(error);
      const message = portfolioErrorMessageFromApi(error, t('portfolio.createFailed'));
      setErrors(fieldErrors);
      setSubmitError(message);
      if (Object.keys(fieldErrors).length > 0) setStep(errorStep(fieldErrors));
      showPortfolioCreateErrors([...Object.values(fieldErrors), message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  const primaryLabel = createdWithUploadIssue
    ? t('portfolio.openCreatedPortfolio')
    : isSubmitting
      ? photoFiles.length > 0
        ? t('portfolio.savingWithPhotos')
        : t('common.saving')
      : isLastStep
        ? t('portfolio.createAction')
        : t('common.next', 'Next');

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-6"
      role={showDiscardConfirm ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-labelledby={showDiscardConfirm ? 'portfolio-create-discard-title' : 'portfolio-create-desktop-title'}
      onClick={handleBackdropClick}
    >
      <div
        data-testid="portfolio-create-desktop-modal"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        {showDiscardConfirm ? (
          <PortfolioCreateDiscardConfirm
            onKeepEditing={() => setShowDiscardConfirm(false)}
            onDiscard={onCancel}
          />
        ) : (
          <>
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">
                    {progressText(t, stepIndex + 1, CREATE_STEPS.length)}
                  </p>
                  <h2
                    id="portfolio-create-desktop-title"
                    className="mt-1 text-xl font-semibold text-gray-950 dark:text-white"
                  >
                    {stepCopy.title}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-400">
                    {stepCopy.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={isSubmitting}
                  className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                  aria-label={t('common.close', 'Close')}
                >
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2" aria-hidden="true">
                {CREATE_STEPS.map((currentStep, index) => (
                  <div
                    key={currentStep}
                    className={`h-1.5 rounded-full transition ${
                      index <= stepIndex ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            <form
              data-testid="portfolio-create-form"
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                {step === 'title' && (
                  <div>
                    <label
                      htmlFor={titleInputId}
                      className="block text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t('portfolio.titleLabel')}
                    </label>
                    <input
                      ref={titleInputRef}
                      id={titleInputId}
                      type="text"
                      value={values.title}
                      disabled={isSubmitting || Boolean(createdWithUploadIssue)}
                      maxLength={PORTFOLIO_TITLE_MAX_LENGTH}
                      aria-invalid={Boolean(errors.title)}
                      aria-describedby={errors.title ? titleErrorId : undefined}
                      placeholder={t('portfolio.titlePlaceholder')}
                      onChange={(event) => handleChange('title', event.target.value)}
                      className="mt-2 min-h-[48px] w-full rounded-2xl border border-gray-300 bg-white px-4 text-base text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-purple-300 focus:ring-2 focus:ring-purple-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white dark:placeholder:text-gray-400 dark:focus:border-purple-800"
                    />
                    {errors.title && (
                      <p id={titleErrorId} className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">
                        {errors.title}
                      </p>
                    )}
                  </div>
                )}

                {step === 'category' && (
                  <div>
                    <label
                      htmlFor={categoryInputId}
                      className="block text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t('portfolio.categoryLabel')}
                    </label>
                    <div className="mt-2">
                      <PortfolioCategoryPicker
                        buttonId={categoryInputId}
                        value={values.category}
                        disabled={isSubmitting || Boolean(createdWithUploadIssue)}
                        invalid={Boolean(errors.category)}
                        describedBy={errors.category ? categoryErrorId : undefined}
                        label={t('portfolio.categoryLabel')}
                        placeholder={t('portfolio.categoryPlaceholder')}
                        onChange={(value) => handleChange('category', value)}
                      />
                    </div>
                    {errors.category && (
                      <p id={categoryErrorId} className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">
                        {errors.category}
                      </p>
                    )}
                  </div>
                )}

                {step === 'description' && (
                  <div>
                    <label
                      htmlFor={descriptionInputId}
                      className="block text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t('portfolio.descriptionLabel')}
                    </label>
                    <div className="relative mt-2">
                      <textarea
                        id={descriptionInputId}
                        value={values.description}
                        disabled={isSubmitting || Boolean(createdWithUploadIssue)}
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

                {step === 'photos' && (
                  <PortfolioCreatePhotoPicker
                    files={photoFiles}
                    disabled={isSubmitting || Boolean(createdWithUploadIssue)}
                    onChange={(files) => {
                      setPhotoFiles(files);
                      setSubmitError(null);
                      setCreatedWithUploadIssue(null);
                    }}
                  />
                )}

                {submitError && (
                  <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                    {submitError}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-[#0f0f10]">
                {!createdWithUploadIssue && (
                  <button
                    type="button"
                    onClick={stepIndex === 0 ? requestClose : goBack}
                    disabled={isSubmitting}
                    className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800/60"
                  >
                    {stepIndex === 0 ? t('common.cancel') : t('common.back', 'Back')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {primaryLabel}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
'use client';

import { useId, useMemo, useRef } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PortfolioItem } from './portfolioTypes';
import { PortfolioCategoryPicker } from './PortfolioCategoryPicker';
import { PortfolioCreateDiscardConfirm } from './PortfolioCreateDiscardConfirm';
import { PortfolioCreatePhotoPicker } from './PortfolioCreatePhotoPicker';
import {
  PORTFOLIO_DESCRIPTION_MAX_LENGTH,
  PORTFOLIO_TITLE_MAX_LENGTH,
} from './portfolioFormUtils';
import {
  portfolioCreateStepLabel,
  requiredPortfolioLabel,
} from './portfolioCreateFlow';
import { usePortfolioCreateStepper } from './usePortfolioCreateStepper';

type PortfolioCreateFormProps = {
  onCancel: () => void;
  onCreated: (item: PortfolioItem) => void;
};

function iconButtonClass(disabled: boolean, tone: 'neutral' | 'primary' = 'neutral'): string {
  const base = [
    'inline-flex h-14 w-14 items-center justify-center rounded-full border shadow-sm transition',
    'focus:outline-none focus:ring-2 focus:ring-purple-400/50 active:scale-95',
  ];

  if (disabled && tone === 'primary') {
    return [
      ...base,
      'cursor-wait border-purple-500 bg-purple-600 text-white shadow-purple-500/20 dark:border-purple-500 dark:bg-purple-500 dark:text-white',
    ].join(' ');
  }

  if (disabled) {
    return [
      ...base,
      'cursor-not-allowed border-gray-200 bg-white text-gray-300 dark:border-gray-800 dark:bg-[#0f0f10] dark:text-gray-700',
    ].join(' ');
  }

  if (tone === 'primary') {
    return [
      ...base,
      'border-purple-500 bg-purple-600 text-white shadow-purple-500/20 hover:-translate-y-0.5 hover:bg-purple-700 dark:border-purple-500 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-400',
    ].join(' ');
  }

  return [
    ...base,
    'border-gray-200 bg-white text-gray-800 hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50/70 dark:border-gray-800 dark:bg-[#0f0f10] dark:text-gray-100 dark:hover:border-purple-900 dark:hover:bg-purple-950/20',
  ].join(' ');
}

function LoadingSpinner() {
  return (
    <span
      className="h-6 w-6 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
      aria-hidden="true"
    />
  );
}

export function PortfolioCreateForm({ onCancel, onCreated }: PortfolioCreateFormProps) {
  const { t } = useLanguage();
  const fieldId = useId();
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const titleInputId = `${fieldId}-portfolio-title`;
  const categoryInputId = `${fieldId}-portfolio-category`;
  const descriptionInputId = `${fieldId}-portfolio-description`;
  const titleErrorId = `${fieldId}-portfolio-title-error`;
  const categoryErrorId = `${fieldId}-portfolio-category-error`;
  const descriptionErrorId = `${fieldId}-portfolio-description-error`;
  const descriptionHelpId = `${fieldId}-portfolio-description-help`;
  const {
    step,
    values,
    errors,
    photoFiles,
    submitError,
    createdWithUploadIssue,
    isSubmitting,
    showDiscardConfirm,
    setShowDiscardConfirm,
    stepIndex,
    isLastStep,
    handleChange,
    handlePhotosChange,
    requestClose,
    goBack,
    handleSubmit,
    primaryActionLabel: rightActionLabel,
  } = usePortfolioCreateStepper({ onCancel, onCreated });

  const stepLabel = useMemo(() => portfolioCreateStepLabel(step, t), [step, t]);
  const headerLabel = step === 'title' || step === 'category' ? requiredPortfolioLabel(stepLabel) : stepLabel;

  if (showDiscardConfirm) {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white text-gray-950 shadow-sm dark:border-gray-800 dark:bg-[#0f0f10] dark:text-white">
        <PortfolioCreateDiscardConfirm
          onKeepEditing={() => setShowDiscardConfirm(false)}
          onDiscard={onCancel}
        />
      </div>
    );
  }

  return (
    <form
      data-testid="portfolio-create-form"
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-sm"
    >
      {stepIndex > 0 && (
        <button
          type="button"
          onClick={requestClose}
          disabled={isSubmitting}
          className="fixed right-3 top-1.5 z-40 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-[#161618] dark:hover:text-white lg:hidden"
          aria-label={t('common.close', 'Close')}
        >
          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 text-gray-950 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-gray-100 dark:border-gray-800 dark:bg-[#0f0f10] dark:text-white dark:ring-gray-900">
        <div className="flex min-h-[74px] items-center justify-center px-6 pb-2 pt-5">
          <h2 className="min-w-0 truncate text-center text-2xl font-semibold tracking-normal text-gray-950 dark:text-white">
            {step === 'title' || step === 'category' ? (
              <>
                {stepLabel} <span>*</span>
              </>
            ) : (
              headerLabel
            )}
          </h2>
        </div>

        <div className="px-5 pb-6 pt-3" data-testid={`portfolio-create-step-${step}`}>
        {step === 'title' && (
          <div>
            <label htmlFor={titleInputId} className="sr-only">
              {requiredPortfolioLabel(t('portfolio.titleLabel'))}
            </label>
            <textarea
              ref={titleInputRef}
              id={titleInputId}
              value={values.title}
              disabled={isSubmitting || Boolean(createdWithUploadIssue)}
              maxLength={PORTFOLIO_TITLE_MAX_LENGTH}
              rows={3}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? titleErrorId : undefined}
              placeholder={t('portfolio.titlePlaceholder')}
              onChange={(event) => handleChange('title', event.target.value)}
              className="min-h-[136px] w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50/80 px-5 py-4 text-lg leading-7 text-gray-950 outline-none shadow-inner transition placeholder:text-gray-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-[#151517] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-purple-700 dark:focus:bg-[#101011] dark:focus:ring-purple-950/40"
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

        {step === 'category' && (
          <div>
            <label htmlFor={categoryInputId} className="sr-only">
              {requiredPortfolioLabel(t('portfolio.categoryLabel'))}
            </label>
            <div>
              <PortfolioCategoryPicker
                buttonId={categoryInputId}
                value={values.category}
                disabled={isSubmitting || Boolean(createdWithUploadIssue)}
                invalid={Boolean(errors.category)}
                describedBy={errors.category ? categoryErrorId : undefined}
                label={requiredPortfolioLabel(t('portfolio.categoryLabel'))}
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
            <label htmlFor={descriptionInputId} className="sr-only">
              {t('portfolio.descriptionLabel')}
            </label>
            <div className="relative">
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
            variant="panel"
            onChange={handlePhotosChange}
          />
        )}

        {submitError && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
            {submitError}
          </p>
        )}
        </div>
      </section>

      <div className="mx-auto mt-5 flex max-w-sm items-center justify-between px-4">
        {stepIndex === 0 ? (
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            className={iconButtonClass(isSubmitting)}
            aria-label={t('common.close', 'Close')}
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={goBack}
            disabled={isSubmitting}
            className={iconButtonClass(isSubmitting)}
            aria-label={t('common.back', 'Back')}
          >
            <ArrowLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={iconButtonClass(isSubmitting, 'primary')}
          aria-label={rightActionLabel}
        >
          {isSubmitting ? (
            <LoadingSpinner />
          ) : isLastStep || createdWithUploadIssue ? (
            <CheckIcon className="h-6 w-6" aria-hidden="true" />
          ) : (
            <ArrowRightIcon className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {isSubmitting && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-center text-sm font-semibold text-purple-700 dark:text-purple-300"
        >
          {rightActionLabel}
        </p>
      )}
    </form>
  );
}

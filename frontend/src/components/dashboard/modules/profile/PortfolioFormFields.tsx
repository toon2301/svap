'use client';

import { useId } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPortfolioCategoryLabel } from './portfolioDisplay';
import {
  PORTFOLIO_CATEGORY_OPTIONS,
  PORTFOLIO_DESCRIPTION_MAX_LENGTH,
  PORTFOLIO_TITLE_MAX_LENGTH,
  type PortfolioFormErrors,
  type PortfolioFormField,
  type PortfolioFormValues,
} from './portfolioFormUtils';

type PortfolioFormFieldsProps = {
  values: PortfolioFormValues;
  errors: PortfolioFormErrors;
  disabled?: boolean;
  onChange: (field: PortfolioFormField, value: string) => void;
};

export function PortfolioFormFields({
  values,
  errors,
  disabled = false,
  onChange,
}: PortfolioFormFieldsProps) {
  const { t } = useLanguage();
  const fieldId = useId();
  const descriptionLength = values.description.length;
  const titleInputId = `${fieldId}-portfolio-title`;
  const categoryInputId = `${fieldId}-portfolio-category`;
  const descriptionInputId = `${fieldId}-portfolio-description`;
  const titleErrorId = `${fieldId}-portfolio-title-error`;
  const categoryErrorId = `${fieldId}-portfolio-category-error`;
  const descriptionErrorId = `${fieldId}-portfolio-description-error`;
  const descriptionCountId = `${fieldId}-portfolio-description-count`;
  const descriptionDescribedBy = [
    errors.description ? descriptionErrorId : null,
    descriptionCountId,
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <div className="block">
        <label htmlFor={titleInputId}>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {t('portfolio.titleLabel')}
          </span>
        </label>
        <input
          id={titleInputId}
          type="text"
          value={values.title}
          disabled={disabled}
          maxLength={PORTFOLIO_TITLE_MAX_LENGTH}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? titleErrorId : undefined}
          onChange={(event) => onChange('title', event.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white"
        />
        {errors.title && (
          <span
            id={titleErrorId}
            className="mt-1 block text-xs font-medium text-red-600 dark:text-red-300"
          >
            {errors.title}
          </span>
        )}
      </div>

      <div className="block">
        <label htmlFor={categoryInputId}>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {t('portfolio.categoryLabel')}
          </span>
        </label>
        <select
          id={categoryInputId}
          value={values.category}
          disabled={disabled}
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? categoryErrorId : undefined}
          onChange={(event) => onChange('category', event.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white"
        >
          <option value="">{t('portfolio.categoryPlaceholder')}</option>
          {PORTFOLIO_CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {getPortfolioCategoryLabel(t, category)}
            </option>
          ))}
        </select>
        {errors.category && (
          <span
            id={categoryErrorId}
            className="mt-1 block text-xs font-medium text-red-600 dark:text-red-300"
          >
            {errors.category}
          </span>
        )}
      </div>

      <div className="block">
        <label htmlFor={descriptionInputId}>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {t('portfolio.descriptionLabel')}
          </span>
        </label>
        <textarea
          id={descriptionInputId}
          value={values.description}
          disabled={disabled}
          maxLength={PORTFOLIO_DESCRIPTION_MAX_LENGTH}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={descriptionDescribedBy}
          onChange={(event) => onChange('description', event.target.value)}
          rows={4}
          className="mt-1 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white"
        />
        <div className="mt-1 flex items-center justify-between gap-3">
          {errors.description ? (
            <span
              id={descriptionErrorId}
              className="text-xs font-medium text-red-600 dark:text-red-300"
            >
              {errors.description}
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          <span
            id={descriptionCountId}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {descriptionLength}/{PORTFOLIO_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}

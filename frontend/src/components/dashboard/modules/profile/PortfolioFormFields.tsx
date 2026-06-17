'use client';

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
  const descriptionLength = values.description.length;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {t('portfolio.titleLabel')}
        </span>
        <input
          type="text"
          value={values.title}
          disabled={disabled}
          maxLength={PORTFOLIO_TITLE_MAX_LENGTH}
          aria-invalid={Boolean(errors.title)}
          onChange={(event) => onChange('title', event.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white"
        />
        {errors.title && (
          <span className="mt-1 block text-xs font-medium text-red-600 dark:text-red-300">
            {errors.title}
          </span>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {t('portfolio.categoryLabel')}
        </span>
        <select
          value={values.category}
          disabled={disabled}
          aria-invalid={Boolean(errors.category)}
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
          <span className="mt-1 block text-xs font-medium text-red-600 dark:text-red-300">
            {errors.category}
          </span>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {t('portfolio.descriptionLabel')}
        </span>
        <textarea
          value={values.description}
          disabled={disabled}
          maxLength={PORTFOLIO_DESCRIPTION_MAX_LENGTH}
          aria-invalid={Boolean(errors.description)}
          onChange={(event) => onChange('description', event.target.value)}
          rows={4}
          className="mt-1 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white"
        />
        <div className="mt-1 flex items-center justify-between gap-3">
          {errors.description ? (
            <span className="text-xs font-medium text-red-600 dark:text-red-300">
              {errors.description}
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {descriptionLength}/{PORTFOLIO_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </label>
    </div>
  );
}

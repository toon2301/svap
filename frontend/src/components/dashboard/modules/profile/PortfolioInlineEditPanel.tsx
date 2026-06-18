'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { updatePortfolioItem } from './portfolioApi';
import type { PortfolioItem } from './portfolioTypes';
import { PortfolioFormFields } from './PortfolioFormFields';
import {
  portfolioErrorMessageFromApi,
  portfolioFormErrorsFromApi,
  portfolioPayloadFromValues,
  validatePortfolioFormValues,
  type PortfolioFormErrors,
  type PortfolioFormField,
  type PortfolioFormValues,
} from './portfolioFormUtils';

type PortfolioInlineEditPanelProps = {
  item: PortfolioItem;
  onCancel: () => void;
  onSaved: (item: PortfolioItem) => void;
};

function valuesFromItem(item: PortfolioItem): PortfolioFormValues {
  return {
    title: item.title || '',
    category: item.category || '',
    description: item.description || '',
  };
}

export function PortfolioInlineEditPanel({
  item,
  onCancel,
  onSaved,
}: PortfolioInlineEditPanelProps) {
  const { t } = useLanguage();
  const [values, setValues] = useState<PortfolioFormValues>(() => valuesFromItem(item));
  const [errors, setErrors] = useState<PortfolioFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedItemIdRef = useRef(item.id);

  useEffect(() => {
    if (initializedItemIdRef.current === item.id) return;
    initializedItemIdRef.current = item.id;
    setValues(valuesFromItem(item));
    setErrors({});
    setSubmitError(null);
  }, [item]);

  const handleChange = useCallback((field: PortfolioFormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;

      const nextErrors = validatePortfolioFormValues(values, t);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        setSubmitError(null);
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const saved = await updatePortfolioItem(item.id, portfolioPayloadFromValues(values));
        onSaved(saved);
      } catch (error) {
        setErrors(portfolioFormErrorsFromApi(error));
        setSubmitError(portfolioErrorMessageFromApi(error, t('portfolio.saveFailed')));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, item.id, onSaved, t, values],
  );

  return (
    <form
      data-testid="portfolio-inline-edit-panel"
      onSubmit={handleSubmit}
      className="rounded-3xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm dark:border-purple-900/50 dark:bg-purple-950/10"
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-950 dark:text-white">
          {t('portfolio.editAction')}
        </h2>
      </div>

      <PortfolioFormFields
        values={values}
        errors={errors}
        disabled={isSubmitting}
        onChange={handleChange}
      />

      {submitError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
          {submitError}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-gray-200 dark:hover:bg-gray-800/60"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}

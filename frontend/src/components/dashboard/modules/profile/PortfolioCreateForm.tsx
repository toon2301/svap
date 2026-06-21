'use client';

import { useCallback, useId, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { createPortfolioItem, uploadPortfolioImageFile } from './portfolioApi';
import type { PortfolioItem } from './portfolioTypes';
import { PortfolioCategoryPicker } from './PortfolioCategoryPicker';
import { PortfolioCreatePhotoPicker } from './PortfolioCreatePhotoPicker';
import { PortfolioDescriptionEditorModal } from './PortfolioDescriptionEditorModal';
import {
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

type PortfolioCreateFormProps = {
  onCancel: () => void;
  onCreated: (item: PortfolioItem) => void;
};

async function uploadPortfolioFiles(itemId: number, files: File[]): Promise<void> {
  for (const file of files) {
    // Sequential uploads keep storage and API pressure predictable for mobile users.
    // eslint-disable-next-line no-await-in-loop
    await uploadPortfolioImageFile(itemId, file);
  }
}

function fieldSummary(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function uniqueMessages(messages: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  messages.forEach((message) => {
    const trimmed = String(message || '').trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    unique.push(trimmed);
  });
  return unique;
}

function showPortfolioCreateErrors(messages: Array<string | undefined>): void {
  uniqueMessages(messages).forEach((message) => toast.error(message));
}

export function PortfolioCreateForm({ onCancel, onCreated }: PortfolioCreateFormProps) {
  const { t } = useLanguage();
  const fieldId = useId();
  const titleInputId = `${fieldId}-portfolio-title`;
  const categoryInputId = `${fieldId}-portfolio-category`;
  const titleErrorId = `${fieldId}-portfolio-title-error`;
  const categoryErrorId = `${fieldId}-portfolio-category-error`;
  const [values, setValues] = useState<PortfolioFormValues>(() => emptyPortfolioFormValues());
  const [errors, setErrors] = useState<PortfolioFormErrors>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdWithUploadIssue, setCreatedWithUploadIssue] = useState<PortfolioItem | null>(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((field: PortfolioFormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
    setCreatedWithUploadIssue(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting || createdWithUploadIssue) return;

      const nextErrors = validatePortfolioFormValues(values, t);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        setSubmitError(null);
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
        showPortfolioCreateErrors([...Object.values(fieldErrors), message]);
      } finally {
        setIsSubmitting(false);
      }
    },
    [createdWithUploadIssue, isSubmitting, onCreated, photoFiles, t, values],
  );

  const descriptionSummary = values.description.trim()
    ? t('portfolio.editDescription')
    : t('portfolio.addDescription');

  return (
    <>
      <form
        data-testid="portfolio-create-form"
        onSubmit={handleSubmit}
        className="w-full text-gray-950 dark:text-white"
      >
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-100 py-4 dark:border-gray-800">
            <div className="px-2">
              <label
                htmlFor={titleInputId}
                className="block text-center text-base font-medium text-gray-900 dark:text-white"
              >
                {t('portfolio.titleLabel')}
              </label>
              <input
                id={titleInputId}
                type="text"
                value={values.title}
                disabled={isSubmitting || Boolean(createdWithUploadIssue)}
                maxLength={PORTFOLIO_TITLE_MAX_LENGTH}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? titleErrorId : undefined}
                placeholder={t('portfolio.titlePlaceholder')}
                onChange={(event) => handleChange('title', event.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-purple-300 focus:ring-2 focus:ring-purple-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white dark:placeholder:text-gray-400 dark:focus:border-purple-800"
              />
            </div>
            {errors.title && (
              <p id={titleErrorId} className="mt-2 pl-2 text-xs font-medium text-red-600 dark:text-red-300">
                {errors.title}
              </p>
            )}
          </div>

          <div className="border-b border-gray-100 py-4 dark:border-gray-800">
            <div className="px-2">
              <label
                htmlFor={categoryInputId}
                className="block text-center text-base font-medium text-gray-900 dark:text-white"
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
            </div>
            {errors.category && (
              <p id={categoryErrorId} className="mt-2 pl-2 text-xs font-medium text-red-600 dark:text-red-300">
                {errors.category}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={isSubmitting || Boolean(createdWithUploadIssue)}
            onClick={() => setIsDescriptionOpen(true)}
            className="flex w-full items-center border-b border-gray-100 py-4 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <span className="w-36 shrink-0 pl-2 pr-3 text-base font-medium text-gray-900 dark:text-white sm:w-40">
              {t('portfolio.descriptionLabel')}
            </span>
            <span className="flex min-w-0 flex-1 items-center pr-2">
              <span className="mr-3 h-5 w-px shrink-0 bg-gray-300 dark:bg-gray-700" />
              <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                {fieldSummary(descriptionSummary, t('portfolio.addDescription'))}
              </span>
            </span>
          </button>

          <div className="border-b border-gray-100 py-4 dark:border-gray-800">
            <PortfolioCreatePhotoPicker
              files={photoFiles}
              disabled={isSubmitting || Boolean(createdWithUploadIssue)}
              onChange={(files) => {
                setPhotoFiles(files);
                setSubmitError(null);
                setCreatedWithUploadIssue(null);
              }}
            />
          </div>
        </div>

        {submitError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
            {submitError}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={createdWithUploadIssue ? () => onCreated(createdWithUploadIssue) : onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800/60"
          >
            {createdWithUploadIssue ? t('portfolio.openCreatedPortfolio') : t('common.cancel')}
          </button>
          {!createdWithUploadIssue && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? photoFiles.length > 0
                  ? t('portfolio.savingWithPhotos')
                  : t('common.saving')
                : t('portfolio.createAction')}
            </button>
          )}
        </div>
      </form>

      <PortfolioDescriptionEditorModal
        open={isDescriptionOpen}
        value={values.description}
        error={errors.description}
        onChange={(value) => handleChange('description', value)}
        onClose={() => setIsDescriptionOpen(false)}
      />
    </>
  );
}

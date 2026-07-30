'use client';

import { useRef, useState, type FormEvent } from 'react';
import {
  ExclamationTriangleIcon,
  BoltIcon,
  PaintBrushIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';

import { collectBugReportContext } from './bugReportContext';
import { createBugReport } from './bugReportsApi';
import {
  BUG_REPORT_CATEGORIES,
  type BugReportCategory,
  type BugReportFieldErrors,
  type BugReportFormValues,
  type BugReportResponse,
} from './types';

const INITIAL_VALUES: BugReportFormValues = {
  category: '',
  title: '',
  description: '',
  reproductionSteps: '',
};

const CATEGORY_ICONS = {
  not_working: ExclamationTriangleIcon,
  visual: PaintBrushIcon,
  performance: BoltIcon,
  other: QuestionMarkCircleIcon,
} satisfies Record<BugReportCategory, typeof ExclamationTriangleIcon>;

const CATEGORY_LABEL_KEYS: Record<BugReportCategory, string> = {
  not_working: 'bugReport.categories.notWorking',
  visual: 'bugReport.categories.visual',
  performance: 'bugReport.categories.performance',
  other: 'bugReport.categories.other',
};

type BugReportFormProps = {
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSubmittingChange: (submitting: boolean) => void;
  onSuccess: (response: BugReportResponse) => void;
};

type ApiErrorShape = {
  response?: {
    status?: number;
    data?: {
      validation_errors?: Record<string, unknown>;
      details?: Record<string, unknown>;
    };
  };
};

function validate(values: BugReportFormValues, translate: (key: string, fallback: string) => string) {
  const errors: BugReportFieldErrors = {};

  if (!values.category) {
    errors.category = translate('bugReport.errors.categoryRequired', 'Vyber kategóriu problému.');
  }
  if (!values.title.trim()) {
    errors.title = translate('bugReport.errors.titleRequired', 'Napíš krátky názov problému.');
  } else if (values.title.length > 120) {
    errors.title = translate('bugReport.errors.titleTooLong', 'Názov môže mať najviac 120 znakov.');
  }
  if (!values.description.trim()) {
    errors.description = translate(
      'bugReport.errors.descriptionRequired',
      'Popíš, čo sa stalo.',
    );
  } else if (values.description.length > 2000) {
    errors.description = translate(
      'bugReport.errors.descriptionTooLong',
      'Popis môže mať najviac 2 000 znakov.',
    );
  }
  if (values.reproductionSteps.length > 2000) {
    errors.reproductionSteps = translate(
      'bugReport.errors.stepsTooLong',
      'Postup môže mať najviac 2 000 znakov.',
    );
  }

  return errors;
}

function getServerFieldErrors(error: unknown, invalidMessage: string): BugReportFieldErrors {
  const data = (error as ApiErrorShape).response?.data;
  const details = data?.validation_errors ?? data?.details;
  if (!details || typeof details !== 'object') return {};

  const errors: BugReportFieldErrors = {};
  if ('category' in details) errors.category = invalidMessage;
  if ('title' in details) errors.title = invalidMessage;
  if ('description' in details) errors.description = invalidMessage;
  if ('reproduction_steps' in details) errors.reproductionSteps = invalidMessage;
  return errors;
}

function CharacterCount({ current, maximum }: { current: number; maximum: number }) {
  return (
    <span className={current > maximum ? 'text-red-600 dark:text-red-400' : ''}>
      {current}/{maximum}
    </span>
  );
}

export default function BugReportForm({
  onCancel,
  onDirtyChange,
  onSubmittingChange,
  onSuccess,
}: BugReportFormProps) {
  const { locale, t } = useLanguage();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<BugReportFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const updateValue = <Key extends keyof BugReportFormValues>(
    key: Key,
    value: BugReportFormValues[Key],
  ) => {
    const next = { ...values, [key]: value };
    setValues(next);
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError('');
    onDirtyChange(
      Boolean(
        next.category ||
          next.title ||
          next.description ||
          next.reproductionSteps,
      ),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = validate(values, t);
    setFieldErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0 || !values.category) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    onSubmittingChange(true);

    try {
      const response = await createBugReport({
        category: values.category,
        title: values.title.trim(),
        description: values.description.trim(),
        reproduction_steps: values.reproductionSteps.trim(),
        ...collectBugReportContext(locale),
      });
      onDirtyChange(false);
      onSuccess(response);
    } catch (error) {
      const status = (error as ApiErrorShape).response?.status;
      const invalidMessage = t(
        'bugReport.errors.invalidValue',
        'Skontroluj označené údaje.',
      );
      const serverErrors = getServerFieldErrors(error, invalidMessage);
      setFieldErrors((current) => ({ ...current, ...serverErrors }));

      if (status === 429) {
        setSubmitError(
          t(
            'bugReport.errors.rateLimited',
            'Dosiahol si limit hlásení. Skús to znova neskôr.',
          ),
        );
      } else if (status === 401 || status === 403) {
        setSubmitError(
          t(
            'bugReport.errors.sessionExpired',
            'Tvoja relácia vypršala. Prihlás sa znova a potom hlásenie odošli.',
          ),
        );
      } else if (Object.keys(serverErrors).length === 0) {
        setSubmitError(
          t(
            'bugReport.errors.generic',
            'Hlásenie sa nepodarilo odoslať. Skús to znova.',
          ),
        );
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      onSubmittingChange(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex gap-2">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            {t(
              'bugReport.privacyWarning',
              'Neuvádzaj heslá, platobné údaje ani iné citlivé informácie.',
            )}
          </p>
        </div>
      </div>

      <fieldset aria-describedby={fieldErrors.category ? 'bug-report-category-error' : undefined}>
        <legend className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
          {t('bugReport.categoryLabel', 'Čo sa pokazilo?')}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {BUG_REPORT_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            const selected = values.category === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected}
                onClick={() => updateValue('category', category)}
                className={`flex min-h-16 items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
                  selected
                    ? 'border-purple-400 bg-purple-100 text-purple-900 dark:border-purple-500 dark:bg-purple-900/40 dark:text-purple-100'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-purple-700 dark:hover:bg-purple-950/30'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {t(CATEGORY_LABEL_KEYS[category], category)}
              </button>
            );
          })}
        </div>
        {fieldErrors.category && (
          <p id="bug-report-category-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {fieldErrors.category}
          </p>
        )}
      </fieldset>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="bug-report-title" className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('bugReport.titleLabel', 'Krátky názov')}
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <CharacterCount current={values.title.length} maximum={120} />
          </span>
        </div>
        <input
          id="bug-report-title"
          value={values.title}
          maxLength={121}
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'bug-report-title-error' : undefined}
          onChange={(event) => updateValue('title', event.target.value)}
          placeholder={t('bugReport.titlePlaceholder', 'Napr. tlačidlo Uložiť nereaguje')}
          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
        {fieldErrors.title && (
          <p id="bug-report-title-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="bug-report-description" className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('bugReport.descriptionLabel', 'Čo sa stalo?')}
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <CharacterCount current={values.description.length} maximum={2000} />
          </span>
        </div>
        <textarea
          id="bug-report-description"
          value={values.description}
          maxLength={2001}
          rows={5}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'bug-report-description-error' : undefined}
          onChange={(event) => updateValue('description', event.target.value)}
          placeholder={t(
            'bugReport.descriptionPlaceholder',
            'Popíš očakávané správanie a čo sa stalo namiesto neho.',
          )}
          className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
        {fieldErrors.description && (
          <p id="bug-report-description-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="bug-report-steps" className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('bugReport.stepsLabel', 'Ako sa dá problém zopakovať?')}{' '}
            <span className="font-normal text-gray-500 dark:text-gray-400">
              ({t('bugReport.optional', 'voliteľné')})
            </span>
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <CharacterCount current={values.reproductionSteps.length} maximum={2000} />
          </span>
        </div>
        <textarea
          id="bug-report-steps"
          value={values.reproductionSteps}
          maxLength={2001}
          rows={4}
          aria-invalid={Boolean(fieldErrors.reproductionSteps)}
          aria-describedby={fieldErrors.reproductionSteps ? 'bug-report-steps-error' : undefined}
          onChange={(event) => updateValue('reproductionSteps', event.target.value)}
          placeholder={t(
            'bugReport.stepsPlaceholder',
            '1. Otvoril som… 2. Klikol som… 3. Zobrazilo sa…',
          )}
          className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
        {fieldErrors.reproductionSteps && (
          <p id="bug-report-steps-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {fieldErrors.reproductionSteps}
          </p>
        )}
      </div>

      {submitError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-200">
          {submitError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
        >
          {t('bugReport.cancel', 'Zrušiť')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? t('bugReport.sending', 'Odosielam…')
            : t('bugReport.submit', 'Odoslať hlásenie')}
        </button>
      </div>
    </form>
  );
}

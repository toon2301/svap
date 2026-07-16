'use client';

import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { createPortfolioItem } from './portfolioApi';
import type { PortfolioItem } from './portfolioTypes';
import { showPortfolioCreateErrors, uploadPortfolioFiles } from './portfolioCreateSubmit';
import {
  emptyPortfolioFormValues,
  portfolioPayloadFromValues,
  validatePortfolioFormValues,
  type PortfolioFormErrors,
  type PortfolioFormField,
  type PortfolioFormValues,
} from './portfolioFormUtils';
import {
  translatePortfolioApiError,
  translatePortfolioFormErrors,
} from './portfolioApiErrors';
import {
  PORTFOLIO_CREATE_STEPS,
  hasPortfolioCreateDraft,
  portfolioCreateCategoryError,
  portfolioCreateDescriptionError,
  portfolioCreateErrorStep,
  portfolioCreateTitleError,
  type PortfolioCreateStep,
} from './portfolioCreateFlow';

type UsePortfolioCreateStepperOptions = {
  onCancel: () => void;
  onCreated: (item: PortfolioItem) => void;
};

/**
 * Zdieľaný step-machine pre create flow portfólia (mobilný form aj desktop
 * modal): stav krokov/hodnôt/chýb, per-step validácia, submit s create +
 * upload fotiek, error handling (vrátane "created but upload failed" stavu)
 * a discard-confirm tok. Komponenty ostávajú čisto prezentačné.
 */
export function usePortfolioCreateStepper({
  onCancel,
  onCreated,
}: UsePortfolioCreateStepperOptions) {
  const { t } = useLanguage();
  const [step, setStep] = useState<PortfolioCreateStep>('title');
  const [values, setValues] = useState<PortfolioFormValues>(() => emptyPortfolioFormValues());
  const [errors, setErrors] = useState<PortfolioFormErrors>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdWithUploadIssue, setCreatedWithUploadIssue] = useState<PortfolioItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const stepIndex = PORTFOLIO_CREATE_STEPS.indexOf(step);
  const isLastStep = step === 'photos';
  const draftIsDirty = hasPortfolioCreateDraft(values, photoFiles);

  const handleChange = useCallback((field: PortfolioFormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
    setCreatedWithUploadIssue(null);
  }, []);

  const handlePhotosChange = useCallback((files: File[]) => {
    setPhotoFiles(files);
    setSubmitError(null);
    setCreatedWithUploadIssue(null);
  }, []);

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

  const validateCurrentStep = (): boolean => {
    const nextErrors: PortfolioFormErrors = {};
    if (step === 'title') nextErrors.title = portfolioCreateTitleError(values, t);
    if (step === 'category') nextErrors.category = portfolioCreateCategoryError(values, t);
    if (step === 'description') nextErrors.description = portfolioCreateDescriptionError(values, t);

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
    setShowDiscardConfirm(false);
    setStep(PORTFOLIO_CREATE_STEPS[Math.min(stepIndex + 1, PORTFOLIO_CREATE_STEPS.length - 1)]);
  };

  const goBack = () => {
    setSubmitError(null);
    setShowDiscardConfirm(false);
    setStep(PORTFOLIO_CREATE_STEPS[Math.max(stepIndex - 1, 0)]);
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
      setStep(portfolioCreateErrorStep(nextErrors));
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
      toast.success(t('portfolio.createSuccess'));
      onCreated(created);
    } catch (error) {
      if (created) {
        const message = translatePortfolioApiError(
          t,
          error,
          t('portfolio.photoUploadAfterCreateFailed'),
        );
        setCreatedWithUploadIssue(created);
        setSubmitError(message);
        toast.error(message);
        return;
      }
      const fieldErrors = translatePortfolioFormErrors(t, error);
      const message = translatePortfolioApiError(t, error, t('portfolio.createFailed'));
      setErrors(fieldErrors);
      setSubmitError(message);
      if (Object.keys(fieldErrors).length > 0) setStep(portfolioCreateErrorStep(fieldErrors));
      showPortfolioCreateErrors([...Object.values(fieldErrors), message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryActionLabel = createdWithUploadIssue
    ? t('portfolio.openCreatedPortfolio')
    : isSubmitting
      ? photoFiles.length > 0
        ? t('portfolio.savingWithPhotos')
        : t('common.saving')
      : isLastStep
        ? t('portfolio.createAction')
        : t('common.next', 'Next');

  return {
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
    draftIsDirty,
    handleChange,
    handlePhotosChange,
    requestClose,
    goNext,
    goBack,
    handleSubmit,
    primaryActionLabel,
  };
}

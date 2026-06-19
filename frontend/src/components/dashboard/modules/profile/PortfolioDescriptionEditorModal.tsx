'use client';

import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../profile-edit/shared/MobileFullScreenModal';
import { PORTFOLIO_DESCRIPTION_MAX_LENGTH } from './portfolioFormUtils';

type PortfolioDescriptionEditorModalProps = {
  open: boolean;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onClose: () => void;
};

export function PortfolioDescriptionEditorModal({
  open,
  value,
  error,
  onChange,
  onClose,
}: PortfolioDescriptionEditorModalProps) {
  const { t } = useLanguage();
  const textareaId = useId();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const remainingChars = PORTFOLIO_DESCRIPTION_MAX_LENGTH - draft.length;

  return (
    <MobileFullScreenModal
      isOpen={open}
      title={t('portfolio.descriptionLabel')}
      onBack={onClose}
      onSave={() => {
        onChange(draft);
        onClose();
      }}
    >
      <label htmlFor={textareaId} className="sr-only">
        {t('portfolio.descriptionLabel')}
      </label>
      <div className="relative">
        <textarea
          id={textareaId}
          value={draft}
          maxLength={PORTFOLIO_DESCRIPTION_MAX_LENGTH}
          rows={8}
          autoFocus
          aria-invalid={Boolean(error)}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 pb-8 pt-2 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 dark:border-gray-700 dark:bg-black dark:text-white"
        />
        <span
          className={`pointer-events-none absolute bottom-2 right-3 text-xs font-medium ${
            remainingChars < 50 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
          }`}
          aria-live="polite"
        >
          {draft.length}/{PORTFOLIO_DESCRIPTION_MAX_LENGTH}
        </span>
      </div>
      {error && (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </p>
      )}
    </MobileFullScreenModal>
  );
}

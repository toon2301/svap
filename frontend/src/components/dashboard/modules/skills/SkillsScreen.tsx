'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import SkillsDesktopSection from './SkillsDesktopSection';
import SkillsMobileSection from './SkillsMobileSection';
import type { SkillsScreenProps } from './SkillsScreen.types';

export default function SkillsScreen(props: SkillsScreenProps) {
  const { t } = useLanguage();
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const {
    title,
    firstOptionText,
    firstOptionHint,
    onFirstOptionClick,
    secondOptionText,
    secondOptionHint,
    onSecondOptionClick,
    standardCategories = [],
    onRemoveStandardCategory,
    onEditStandardCategoryDescription,
    onAddCategory,
    customCategories = [],
    onRemoveCustomCategory,
    onEditCustomCategoryDescription,
    isSeeking = false,
  } = props;

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const onSaveStart = (e: Event) => {
      clearHideTimer();
      const detail = (e as CustomEvent)?.detail;
      const label =
        typeof detail?.label === 'string'
          ? detail.label
          : t('skills.savingOffer', 'Ukladám ponuku...');
      setStatusLabel(label);
    };

    const onUploadStart = () => {
      clearHideTimer();
      setStatusLabel(
        t(
          'skills.uploadingPhotosMayTake',
          'Nahrávam fotky, môže to trvať pár sekúnd...',
        ),
      );
    };

    const onSaveDone = () => {
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        setStatusLabel(null);
      }, 600);
    };

    window.addEventListener('offer-save-start', onSaveStart);
    window.addEventListener('offer-image-upload-start', onUploadStart);
    window.addEventListener('offer-save-done', onSaveDone);

    return () => {
      clearHideTimer();
      window.removeEventListener('offer-save-start', onSaveStart);
      window.removeEventListener('offer-image-upload-start', onUploadStart);
      window.removeEventListener('offer-save-done', onSaveDone);
    };
  }, [t]);

  return (
    <div className="text-[var(--foreground)]">
      {statusLabel && (
        <div className="sticky top-0 z-40 px-3 pt-3">
          <div className="w-full rounded-2xl bg-black/80 text-white px-4 py-3 shadow-lg backdrop-blur flex items-center gap-3">
            <svg
              className="h-5 w-5 animate-spin text-white/90 flex-shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
              />
            </svg>
            <span className="text-sm font-medium leading-snug">{statusLabel}</span>
          </div>
        </div>
      )}
      <div className="hidden lg:block w-full">
        <SkillsDesktopSection
          t={t}
          title={title}
          isSeeking={isSeeking}
          firstOptionText={firstOptionText}
          firstOptionHint={firstOptionHint}
          onFirstOptionClick={onFirstOptionClick}
          secondOptionText={secondOptionText}
          secondOptionHint={secondOptionHint}
          onSecondOptionClick={onSecondOptionClick}
          onAddCategory={onAddCategory}
          standardCategories={standardCategories}
          customCategories={customCategories}
          onRemoveStandardCategory={onRemoveStandardCategory}
          onEditStandardCategoryDescription={onEditStandardCategoryDescription}
          onRemoveCustomCategory={onRemoveCustomCategory}
          onEditCustomCategoryDescription={onEditCustomCategoryDescription}
        />
      </div>

      <div className="block lg:hidden w-full px-0">
        <SkillsMobileSection
          t={t}
          isSeeking={isSeeking}
          firstOptionText={firstOptionText}
          secondOptionText={secondOptionText}
          onFirstOptionClick={onFirstOptionClick}
          onSecondOptionClick={onSecondOptionClick}
          onAddCategory={onAddCategory}
          standardCategories={standardCategories}
          customCategories={customCategories}
          onRemoveStandardCategory={onRemoveStandardCategory}
          onEditStandardCategoryDescription={onEditStandardCategoryDescription}
          onRemoveCustomCategory={onRemoveCustomCategory}
          onEditCustomCategoryDescription={onEditCustomCategoryDescription}
        />
      </div>
    </div>
  );
}



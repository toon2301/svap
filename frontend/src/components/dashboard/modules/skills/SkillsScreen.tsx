'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import SkillsDesktopSection from './SkillsDesktopSection';
import SkillsMobileSection from './SkillsMobileSection';
import type { SkillsScreenProps } from './SkillsScreen.types';

export default function SkillsScreen(props: SkillsScreenProps) {
  const { t } = useLanguage();

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

  return (
    <div className="text-[var(--foreground)]">
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



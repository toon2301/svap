'use client';

import React from 'react';
import { SkillItem } from './SkillsScreen.types';
import SkillsMobileCard from './SkillsMobileCard';

interface SkillsMobileSectionProps {
  t: (key: string, defaultValue: string) => string;
  isSeeking: boolean;
  firstOptionText?: string;
  secondOptionText?: string;
  onFirstOptionClick?: () => void;
  onSecondOptionClick?: () => void;
  onAddCategory?: () => void;
  standardCategories: SkillItem[];
  customCategories: SkillItem[];
  onRemoveStandardCategory?: (index: number) => void;
  onEditStandardCategoryDescription?: (index: number) => void;
  onRemoveCustomCategory?: (index: number) => void;
  onEditCustomCategoryDescription?: (index: number) => void;
}

export default function SkillsMobileSection({
  t,
  isSeeking,
  firstOptionText,
  secondOptionText,
  onFirstOptionClick,
  onSecondOptionClick,
  onAddCategory,
  standardCategories,
  customCategories,
  onRemoveStandardCategory,
  onEditStandardCategoryDescription,
  onRemoveCustomCategory,
  onEditCustomCategoryDescription,
}: SkillsMobileSectionProps) {
  return (
    <div className="flex flex-col items-stretch w-full">
      {firstOptionText && (
        <>
          <div className="w-full pt-0 pb-6">
            <div className="flex flex-col gap-0 w-full">
              {/* Vyber kategóriu */}
              <button
                type="button"
                onClick={onFirstOptionClick}
                className="w-full h-20 flex items-center justify-between px-2 rounded-t-2xl rounded-b-none bg-[var(--background)] active:bg-gray-50 dark:active:bg-gray-900 transition-colors gap-4 relative z-10 -mb-6"
              >
                <div className="flex flex-col text-left">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    {firstOptionText}
                  </span>
                </div>
                {(standardCategories && standardCategories.length > 0) ||
                (customCategories && customCategories.length > 0) ? (
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>

              {/* Pridaj čo hľadáš */}
              {secondOptionText && onSecondOptionClick && (
                <button
                  type="button"
                  onClick={onSecondOptionClick}
                  className={`w-full h-20 flex items-center justify-between px-2 ${
                    onAddCategory ? 'rounded-none' : 'rounded-b-2xl'
                  } bg-[var(--background)] active:bg-gray-50 dark:active:bg-gray-900 transition-colors gap-4 relative z-0`}
                >
                  <div className="flex flex-col text-left">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      {secondOptionText}
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {/* Pridať kategóriu */}
              {onAddCategory && (
                <button
                  type="button"
                  onClick={onAddCategory}
                  className="w-full h-20 flex items-center justify-between px-2 rounded-b-2xl rounded-t-none bg-[var(--background)] active:bg-gray-50 dark:active:bg-gray-900 transition-colors gap-4 relative z-0"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      {t('skills.addCategory', 'Pridať kategóriu')}
                    </span>
                  </div>
                  {customCategories && customCategories.length > 0 ? (
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile cards */}
      {(standardCategories.length > 0 || customCategories.length > 0) && (
        <div className="mt-4 space-y-3">
          {standardCategories.map((item, index) => (
            <SkillsMobileCard
              key={item.id ?? `standard-${item.category}-${item.subcategory}-${index}`}
              item={item}
              t={t}
              isSeeking={isSeeking}
              onRemove={
                onRemoveStandardCategory ? () => onRemoveStandardCategory(index) : undefined
              }
              onEdit={
                onEditStandardCategoryDescription
                  ? () => onEditStandardCategoryDescription(index)
                  : undefined
              }
            />
          ))}
          {customCategories.map((item, index) => (
            <SkillsMobileCard
              key={`custom-${index}`}
              item={item}
              t={t}
              isSeeking={isSeeking}
              onRemove={onRemoveCustomCategory ? () => onRemoveCustomCategory(index) : undefined}
              onEdit={
                onEditCustomCategoryDescription
                  ? () => onEditCustomCategoryDescription(index)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}



'use client';

import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DescriptionSection from './skillDescriptionModal/sections/DescriptionSection';
import MobileFullScreenModal from '../profile-edit/shared/MobileFullScreenModal';

interface SkillsDescriptionScreenProps {
  category: string;
  subcategory: string;
  onBack: () => void;
  initialDescription?: string;
  onDescriptionChange?: (description: string) => void;
  initialDetailedDescription?: string;
  onDetailedDescriptionChange?: (description: string) => void;
}

const MAX_DETAILED_LENGTH = 1000;

export default function SkillsDescriptionScreen({
  category,
  subcategory,
  onBack,
  initialDescription = '',
  onDescriptionChange,
  initialDetailedDescription = '',
  onDetailedDescriptionChange,
}: SkillsDescriptionScreenProps) {
  const { t } = useLanguage();
  const [description, setDescription] = useState(initialDescription);
  const [originalDescription] = useState(initialDescription);
  const [detailedDescription, setDetailedDescription] = useState(initialDetailedDescription);
  const [originalDetailedDescription] = useState(initialDetailedDescription);
  const [error, setError] = useState('');
  const [detailedError, setDetailedError] = useState('');
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isDetailedDescriptionModalOpen, setIsDetailedDescriptionModalOpen] = useState(false);
  const detailedTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (onDescriptionChange) {
      onDescriptionChange(value);
    }
  };

  const handleDetailedDescriptionChange = (value: string) => {
    if (value.length <= MAX_DETAILED_LENGTH) {
      setDetailedDescription(value);
      setDetailedError('');
      if (onDetailedDescriptionChange) {
        onDetailedDescriptionChange(value);
      }
    }
  };

  const handleDescriptionSave = () => {
    setIsDescriptionModalOpen(false);
  };

  const handleDescriptionBack = () => {
    setDescription(originalDescription);
    setIsDescriptionModalOpen(false);
  };

  const handleDetailedDescriptionSave = () => {
    setIsDetailedDescriptionModalOpen(false);
  };

  const handleDetailedDescriptionBack = () => {
    setDetailedDescription(originalDetailedDescription);
    setIsDetailedDescriptionModalOpen(false);
  };

  const remainingDetailedChars = MAX_DETAILED_LENGTH - detailedDescription.length;

  return (
    <div className="text-[var(--foreground)]">
      {/* Mobile layout */}
      <div className="block lg:hidden w-full -mt-3">
        <div className="flex flex-col w-full">
          {/* Category breadcrumb */}
          <div className="mb-4 px-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-800 dark:text-gray-200">{category}</span>
              {category && subcategory && <span className="mx-2">→</span>}
              {subcategory && (
                <span className="text-gray-700 dark:text-gray-300">{subcategory}</span>
              )}
            </p>
          </div>

          {/* Fields wrapper */}
          <div className="border-t border-gray-200 dark:border-gray-800 border-b border-gray-200 dark:border-b-gray-800">
            {/* Popis */}
            <div 
              className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
              onClick={() => setIsDescriptionModalOpen(true)}
            >
              <span className="text-gray-900 dark:text-white font-medium w-40">
                {t('skills.description', 'Popis')}
              </span>
              <div className="flex items-center flex-1 ml-4 pr-2">
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                  {description ? t('skills.editDescription', 'Upraviť popis') : t('skills.addDescription', 'Pridať popis')}
                </span>
              </div>
            </div>

            {/* Podrobný opis */}
            <div 
              className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
              onClick={() => setIsDetailedDescriptionModalOpen(true)}
            >
              <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
                {t('skills.detailedDescription', 'Podrobný opis')}
              </span>
              <div className="flex items-center flex-1 ml-4 pr-2">
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                  {detailedDescription ? t('skills.edit', 'Upraviť') : t('skills.detailedDescription', 'Podrobný opis')}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Description Modal */}
      <MobileFullScreenModal
        isOpen={isDescriptionModalOpen}
        title={t('skills.description', 'Popis')}
        onBack={handleDescriptionBack}
        onSave={handleDescriptionSave}
      >
        <DescriptionSection
          description={description}
          onChange={handleDescriptionChange}
          error={error}
          onErrorChange={setError}
          isOpen={isDescriptionModalOpen}
        />
      </MobileFullScreenModal>

      {/* Detailed Description Modal */}
      <MobileFullScreenModal
        isOpen={isDetailedDescriptionModalOpen}
        title={t('skills.detailedDescription', 'Podrobný opis')}
        onBack={handleDetailedDescriptionBack}
        onSave={handleDetailedDescriptionSave}
      >
        <div className="mb-2 relative">
          <div className="relative">
            <textarea
              ref={detailedTextareaRef}
              value={detailedDescription}
              onChange={(e) => handleDetailedDescriptionChange(e.target.value)}
              placeholder={t('skills.detailedDescriptionPlaceholder', 'Opíš detaily služby – postup, čo je zahrnuté, očakávania a výsledok.')}
              className="w-full px-3 pt-2 pb-6 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none skill-description-textarea-scrollbar"
              rows={6}
              maxLength={MAX_DETAILED_LENGTH}
              autoFocus
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end pr-3 pb-2">
              <span
                className={`text-xs font-medium ${
                  remainingDetailedChars < 50 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
                }`}
                aria-live="polite"
                aria-atomic="true"
                title={t('skills.charsSuffix', 'znakov')}
              >
                {remainingDetailedChars}
              </span>
            </div>
          </div>
        </div>

        {detailedError && (
          <p className="mt-1 text-sm text-red-500">{detailedError}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {t('skills.detailedDescriptionHint', 'Opíš detaily služby – postup, čo je zahrnuté, očakávania a výsledok.')}
        </p>
      </MobileFullScreenModal>

      {/* Desktop layout - hidden */}
      <div className="hidden lg:block"></div>
    </div>
  );
}


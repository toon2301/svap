'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../profile-edit/shared/MobileFullScreenModal';

interface AddCustomCategoryScreenProps {
  onBack: () => void;
  onSave: (categoryName: string) => void;
}

export default function AddCustomCategoryScreen({
  onBack,
  onSave
}: AddCustomCategoryScreenProps) {
  const { t } = useLanguage();
  const [categoryName, setCategoryName] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setCategoryName('');
    setError('');
  }, []);

  const handleSave = () => {
    const trimmed = categoryName.trim();
    
    if (!trimmed) {
      setError(t('skills.customCategoryNameRequired', 'Názov kategórie je povinný'));
      return;
    }

    if (trimmed.length > 60) {
      setError(t('skills.customCategoryNameTooLong', 'Názov kategórie môže mať maximálne 60 znakov'));
      return;
    }

    onSave(trimmed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 60) {
      setCategoryName(value);
      setError('');
    }
  };

  const remainingChars = 60 - categoryName.length;

  return (
    <MobileFullScreenModal
      isOpen={true}
      title={t('skills.customCategoryTitle', 'Pridať kategóriu')}
      onBack={onBack}
      onSave={() => {
        if (categoryName.trim()) {
          handleSave();
        }
      }}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('skills.customCategoryNameLabel', 'Názov kategórie')}
          </label>
          <input
            type="text"
            value={categoryName}
            onChange={handleChange}
            placeholder={t('skills.customCategoryNamePlaceholder', 'Napíš názov kategórie')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            maxLength={60}
            autoFocus
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1">
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
            <p className={`text-xs ${remainingChars < 10 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {t('skills.customCategoryRemaining', '{{count}} znakov').replace('{{count}}', String(remainingChars))}
            </p>
          </div>
        </div>
      </div>
    </MobileFullScreenModal>
  );
}


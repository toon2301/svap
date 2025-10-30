'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface GenderModalProps {
  isOpen: boolean;
  gender: string;
  originalGender: string;
  setGender: (v: string) => void;
  setOriginalGender?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function GenderModal({ isOpen, gender, originalGender, setGender, setOriginalGender, onClose, onUserUpdate }: GenderModalProps) {
  const { t } = useLanguage();
  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { gender });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalGender && setOriginalGender(gender);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní pohlavia:', e);
    }
  };
  const handleBack = () => {
    setGender(originalGender);
    onClose();
  };
  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.gender', 'Pohlavie')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('profile.gender', 'Pohlavie')}</label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={(e) => setGender(e.target.value)} className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:ring-purple-500" />
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{t('profile.male', 'Muž')}</span>
          </label>
          <label className="flex items-center">
            <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={(e) => setGender(e.target.value)} className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:ring-purple-500" />
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{t('profile.female', 'Žena')}</span>
          </label>
          <label className="flex items-center">
            <input type="radio" name="gender" value="other" checked={gender === 'other'} onChange={(e) => setGender(e.target.value)} className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:ring-purple-500" />
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{t('profile.other', 'Iné')}</span>
          </label>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.genderDescription', 'Vyberte svoje pohlavie. Táto informácia pomôže ostatným používateľom lepšie vás identifikovať.')}</p>
      </div>
    </MobileFullScreenModal>
  );
}



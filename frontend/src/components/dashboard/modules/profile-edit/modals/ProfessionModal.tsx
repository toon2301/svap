'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface ProfessionModalProps {
  isOpen: boolean;
  profession: string;
  originalProfession: string;
  professionVisible: boolean;
  originalProfessionVisible: boolean;
  setProfession: (v: string) => void;
  setProfessionVisible: (v: boolean) => void;
  setOriginalProfession?: (v: string) => void;
  setOriginalProfessionVisible?: (v: boolean) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function ProfessionModal({ isOpen, profession, originalProfession, professionVisible, originalProfessionVisible, setProfession, setProfessionVisible, setOriginalProfession, setOriginalProfessionVisible, onClose, onUserUpdate }: ProfessionModalProps) {
  const { t } = useLanguage();

  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { job_title: profession, job_title_visible: professionVisible });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalProfession && setOriginalProfession(profession);
      setOriginalProfessionVisible && setOriginalProfessionVisible(professionVisible);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní profese:', e);
    }
  };

  const handleBack = () => {
    setProfession(originalProfession);
    setProfessionVisible(originalProfessionVisible);
    onClose();
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.profession', 'Profesia')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.profession', 'Profesia')}</label>
        <input
          type="text"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterProfession', 'Zadajte svoju profesiu')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.professionDescription', 'Zadajte svoju profesiu alebo pracovné zaradenie. Viditeľnosť profesie môžete nastaviť pomocou prepínača v hlavnom zobrazení.')}</p>
      </div>
    </MobileFullScreenModal>
  );
}



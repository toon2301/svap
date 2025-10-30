'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface LocationModalProps {
  isOpen: boolean;
  location: string;
  originalLocation: string;
  setLocation: (v: string) => void;
  setOriginalLocation?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function LocationModal({ isOpen, location, originalLocation, setLocation, setOriginalLocation, onClose, onUserUpdate }: LocationModalProps) {
  const { t } = useLanguage();

  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { location });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalLocation && setOriginalLocation(location);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní lokality:', e);
    }
  };

  const handleBack = () => {
    setLocation(originalLocation);
    onClose();
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.location', 'Lokalita')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.location', 'Lokalita')}</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterLocation', 'Zadajte svoje mesto alebo obec')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('profile.locationDescription', 'Zadajte mesto alebo obec, kde sa nachádzate. Táto informácia pomôže ostatným používateľom lepšie vás nájsť a môže byť užitočná pri plánovaní stretnutí alebo výmeny zručností.')}
        </p>
      </div>
    </MobileFullScreenModal>
  );
}



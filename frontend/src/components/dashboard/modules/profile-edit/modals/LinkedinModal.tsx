'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface LinkedinModalProps {
  isOpen: boolean;
  linkedin: string;
  originalLinkedin: string;
  setLinkedin: (v: string) => void;
  setOriginalLinkedin?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function LinkedinModal({ isOpen, linkedin, originalLinkedin, setLinkedin, setOriginalLinkedin, onClose, onUserUpdate }: LinkedinModalProps) {
  const { t } = useLanguage();
  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { linkedin });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalLinkedin && setOriginalLinkedin(linkedin);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní LinkedIn:', e);
    }
  };
  const handleBack = () => {
    setLinkedin(originalLinkedin);
    onClose();
  };
  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.linkedin', 'LinkedIn')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.linkedin', 'LinkedIn')}</label>
        <input
          type="url"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          maxLength={255}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterLinkedinUrl', 'https://linkedin.com/in/username')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.linkedinDescription', 'Zadajte URL vašej LinkedIn stránky.')}</p>
      </div>
    </MobileFullScreenModal>
  );
}



'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface FacebookModalProps {
  isOpen: boolean;
  facebook: string;
  originalFacebook: string;
  setFacebook: (v: string) => void;
  setOriginalFacebook?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function FacebookModal({ isOpen, facebook, originalFacebook, setFacebook, setOriginalFacebook, onClose, onUserUpdate }: FacebookModalProps) {
  const { t } = useLanguage();
  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { facebook });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalFacebook && setOriginalFacebook(facebook);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní Facebooku:', e);
    }
  };
  const handleBack = () => {
    setFacebook(originalFacebook);
    onClose();
  };
  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.facebook', 'Facebook')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.facebook', 'Facebook')}</label>
        <input
          type="url"
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
          maxLength={255}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterFacebookUrl', 'https://facebook.com/username')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.facebookDescription', 'Zadajte URL vašej Facebook stránky.')}</p>
      </div>
    </MobileFullScreenModal>
  );
}



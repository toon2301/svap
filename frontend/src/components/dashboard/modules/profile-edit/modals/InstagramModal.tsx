'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface InstagramModalProps {
  isOpen: boolean;
  instagram: string;
  originalInstagram: string;
  setInstagram: (v: string) => void;
  setOriginalInstagram?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function InstagramModal({ isOpen, instagram, originalInstagram, setInstagram, setOriginalInstagram, onClose, onUserUpdate }: InstagramModalProps) {
  const { t } = useLanguage();
  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { instagram });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalInstagram && setOriginalInstagram(instagram);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní Instagramu:', e);
    }
  };
  const handleBack = () => {
    setInstagram(originalInstagram);
    onClose();
  };
  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.instagram', 'Instagram')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.instagram', 'Instagram')}</label>
        <input
          type="url"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          maxLength={255}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterInstagramUrl', 'https://instagram.com/username')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.instagramDescription', 'Zadajte URL vašej Instagram stránky.')}</p>
      </div>
    </MobileFullScreenModal>
  );
}



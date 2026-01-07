'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface YouTubeModalProps {
  isOpen: boolean;
  youtube: string;
  originalYoutube: string;
  setYoutube: (v: string) => void;
  setOriginalYoutube?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function YouTubeModal({ isOpen, youtube, originalYoutube, setYoutube, setOriginalYoutube, onClose, onUserUpdate }: YouTubeModalProps) {
  const { t } = useLanguage();
  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { youtube: youtube.trim() });
      if (response.data?.user) {
        onUserUpdate?.(response.data.user);
      }
      setOriginalYoutube?.(youtube.trim());
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní YouTube:', e);
      // Revert on error
      setYoutube(originalYoutube);
    }
  };
  const handleBack = () => {
    setYoutube(originalYoutube);
    onClose();
  };
  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.youtube', 'YouTube')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.youtube', 'YouTube')}</label>
        <input
          type="url"
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
          maxLength={255}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterYouTubeUrl', 'https://youtube.com/@username alebo https://youtube.com/channel/...')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.youtubeDescription', 'Zadajte URL vašej YouTube stránky alebo kanálu.')}</p>
      </div>
    </MobileFullScreenModal>
  );
}


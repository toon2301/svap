'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BioFieldProps {
  bio: string;
  setBio: (v: string) => void;
  onSave: () => void;
}

export default function BioField({ bio, setBio, onSave }: BioFieldProps) {
  const { t } = useLanguage();
  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.bio', 'Bio')}</label>
      <div className="relative">
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(); } }}
          rows={3}
          maxLength={150}
          className="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('placeholders.bio', 'Napíšte niečo o sebe...')}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">{bio.length}/150</div>
      </div>
    </div>
  );
}



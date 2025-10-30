'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface NameModalProps {
  isOpen: boolean;
  firstName: string;
  lastName: string;
  originalFirstName: string;
  originalLastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setOriginalFirstName?: (v: string) => void;
  setOriginalLastName?: (v: string) => void;
  onClose: () => void; // will reset values
  onUserUpdate?: (u: User) => void;
}

export default function NameModal({ isOpen, firstName, lastName, originalFirstName, originalLastName, setFirstName, setLastName, setOriginalFirstName, setOriginalLastName, onClose, onUserUpdate }: NameModalProps) {
  const { t } = useLanguage();

  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { first_name: firstName, last_name: lastName });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalFirstName && setOriginalFirstName(firstName);
      setOriginalLastName && setOriginalLastName(lastName);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní mena:', e);
    }
  };

  const handleBack = () => {
    setFirstName(originalFirstName);
    setLastName(originalLastName);
    onClose();
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.fullName', 'Meno')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.fullName', 'Meno')}</label>
        <input
          type="text"
          value={`${firstName} ${lastName}`.trim()}
          onChange={(e) => {
            const value = e.target.value || '';
            const parts = value.trim().split(/\s+/).filter(Boolean);
            if (parts.length === 0) {
              setFirstName('');
              setLastName('');
            } else if (parts.length === 1) {
              setFirstName(parts[0]);
              setLastName('');
            } else {
              setFirstName(parts.slice(0, -1).join(' '));
              setLastName(parts[parts.length - 1]);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterName', 'Zadajte svoje meno a priezvisko')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('profile.fullNameDescription', 'Tu si môžete upraviť svoje meno a priezvisko. Vaše meno sa bude zobrazovať ostatným používateľom a zároveň podľa neho budete vyhľadateľní. Odporúčame použiť svoje skutočné meno, aby vás ostatní ľahšie našli a rozpoznali.')}
        </p>
      </div>
    </MobileFullScreenModal>
  );
}



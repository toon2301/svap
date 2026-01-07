'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface WhatsAppModalProps {
  isOpen: boolean;
  whatsapp: string;
  originalWhatsapp: string;
  setWhatsapp: (v: string) => void;
  setOriginalWhatsapp?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function WhatsAppModal({ isOpen, whatsapp, originalWhatsapp, setWhatsapp, setOriginalWhatsapp, onClose, onUserUpdate }: WhatsAppModalProps) {
  const { t } = useLanguage();
  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { whatsapp: whatsapp.trim() });
      if (response.data?.user) {
        onUserUpdate?.(response.data.user);
      }
      setOriginalWhatsapp?.(whatsapp.trim());
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní WhatsApp:', e);
      // Revert on error
      setWhatsapp(originalWhatsapp);
    }
  };
  const handleBack = () => {
    setWhatsapp(originalWhatsapp);
    onClose();
  };
  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.whatsapp', 'WhatsApp')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.whatsapp', 'WhatsApp')}</label>
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          maxLength={255}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterWhatsAppNumber', '+421 912 345 678 alebo https://wa.me/421912345678')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.whatsappDescription', 'Zadajte WhatsApp číslo alebo link.')}</p>
      </div>
    </MobileFullScreenModal>
  );
}


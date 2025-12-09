'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface ContactModalProps {
  isOpen: boolean;
  phone: string;
  phoneVisible: boolean;
  originalPhone: string;
  originalPhoneVisible: boolean;
  setPhone: (v: string) => void;
  setPhoneVisible: (v: boolean) => void;
  setOriginalPhone?: (v: string) => void;
  setOriginalPhoneVisible?: (v: boolean) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function ContactModal({ isOpen, phone, phoneVisible, originalPhone, originalPhoneVisible, setPhone, setPhoneVisible, setOriginalPhone, setOriginalPhoneVisible, onClose, onUserUpdate }: ContactModalProps) {
  const { t } = useLanguage();

  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { phone, phone_visible: phoneVisible });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalPhone && setOriginalPhone(phone);
      setOriginalPhoneVisible && setOriginalPhoneVisible(phoneVisible);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní kontaktu:', e);
    }
  };

  const handleBack = () => {
    setPhone(originalPhone);
    setPhoneVisible(originalPhoneVisible);
    onClose();
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.contact', 'Kontakt')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.phoneNumber', 'Telefónne číslo')}</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={15}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.phoneNumber', 'Tel. číslo')}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('profile.contactDescription', 'Zadajte svoje telefónne číslo. Viditeľnosť kontaktu môžete nastaviť pomocou prepínača v hlavnom zobrazení.')}
        </p>
      </div>
    </MobileFullScreenModal>
  );
}



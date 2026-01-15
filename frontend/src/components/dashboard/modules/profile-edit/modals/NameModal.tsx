'use client';

import React, { useState, useEffect } from 'react';
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
  accountType?: 'personal' | 'business';
  user: User;
}

export default function NameModal({ isOpen, firstName, lastName, originalFirstName, originalLastName, setFirstName, setLastName, setOriginalFirstName, setOriginalLastName, onClose, onUserUpdate, accountType = 'personal', user }: NameModalProps) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');

  // Inicializovať inputValue keď sa modal otvorí
  useEffect(() => {
    if (isOpen) {
      if (accountType === 'business') {
        // Pre firmy používame company_name (ktorý je uložený v firstName)
        setInputValue(firstName || '');
      } else {
        // Pre osobné účty používame first_name + last_name
        const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
        setInputValue(fullName);
      }
    }
  }, [isOpen, firstName, lastName, accountType]);

  const parseAndUpdate = (value: string) => {
    const trimmedValue = value.trim();
    const parts = trimmedValue.split(/\s+/).filter(Boolean);
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
  };

  const handleSave = async () => {
    try {
      // Obmedziť na 35 znakov
      const trimmedValue = inputValue.trim().slice(0, 35);
      
      if (accountType === 'business') {
        // Pre firmy ukladať ako company_name
        const response = await api.patch('/auth/profile/', { company_name: trimmedValue });
        if (onUserUpdate && response.data?.user) {
          onUserUpdate(response.data.user);
        }
        setFirstName(trimmedValue);
        setLastName('');
        setOriginalFirstName && setOriginalFirstName(trimmedValue);
        setOriginalLastName && setOriginalLastName('');
        onClose();
      } else {
        // Pre osobné účty používame existujúcu logiku
        const parts = trimmedValue.split(/\s+/).filter(Boolean);
        const finalFirstName = parts.length === 0 ? '' : parts.length === 1 ? parts[0] : parts.slice(0, -1).join(' ');
        const finalLastName = parts.length <= 1 ? '' : parts[parts.length - 1];
        
        // Parsovať hodnotu a aktualizovať state
        parseAndUpdate(trimmedValue);
        
        const response = await api.patch('/auth/profile/', { first_name: finalFirstName.trim(), last_name: finalLastName.trim() });
        if (onUserUpdate && response.data?.user) {
          onUserUpdate(response.data.user);
        }
        setOriginalFirstName && setOriginalFirstName(finalFirstName.trim());
        setOriginalLastName && setOriginalLastName(finalLastName.trim());
        onClose();
      }
    } catch (e) {
      console.error('Chyba pri ukladaní mena:', e);
      // Revert na pôvodné hodnoty
      if (accountType === 'business') {
        setFirstName(originalFirstName);
        setLastName('');
        setInputValue(originalFirstName || '');
      } else {
        setFirstName(originalFirstName);
        setLastName(originalLastName);
        setInputValue(originalFirstName && originalLastName ? `${originalFirstName} ${originalLastName}` : originalFirstName || originalLastName || '');
      }
    }
  };

  const handleBack = () => {
    if (accountType === 'business') {
      setInputValue(firstName || '');
    } else {
      setInputValue(firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '');
    }
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
          value={inputValue}
          onChange={(e) => {
            const value = e.target.value;
            // Obmedziť na 35 znakov
            if (value.length <= 35) {
              setInputValue(value);
            }
          }}
          maxLength={35}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder={t('profile.enterName', 'Zadajte svoje meno a priezvisko')}
        />
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
          {inputValue.length}/35 znakov
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('profile.fullNameDescription', 'Tu si môžete upraviť svoje meno a priezvisko. Vaše meno sa bude zobrazovať ostatným používateľom a zároveň podľa neho budete vyhľadateľní. Odporúčame použiť svoje skutočné meno, aby vás ostatní ľahšie našli a rozpoznali.')}
        </p>
      </div>
    </MobileFullScreenModal>
  );
}



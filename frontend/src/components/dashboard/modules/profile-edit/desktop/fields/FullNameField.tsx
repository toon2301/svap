'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface FullNameFieldProps {
  user: User;
  accountType: 'personal' | 'business';
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onUserUpdate?: (user: User) => void;
}

/**
 * Meno / Názov field (desktop) – presunuté z ProfileEditFormDesktop bez zmeny správania.
 * - personal: parsovanie do first_name/last_name
 * - business: ukladanie do company_name
 */
export default function FullNameField({
  user,
  accountType,
  firstName,
  lastName,
  setFirstName,
  setLastName,
  onUserUpdate,
}: FullNameFieldProps) {
  const { t } = useLanguage();

  // Lokálny state pre input hodnotu mena - zachová medzery počas písania
  const [fullNameInput, setFullNameInput] = useState('');

  // Synchronizovať lokálny state s firstName a lastName (pre osobné účty) alebo company_name (pre firemné účty)
  useEffect(() => {
    if (accountType === 'business') {
      // Pre firmy používame company_name
      setFullNameInput(user.company_name || '');
    } else {
      // Pre osobné účty používame first_name + last_name
      const fullName =
        firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
      setFullNameInput(fullName);
    }
  }, [firstName, lastName, accountType, user.company_name]);

  // Wrapper pre handleFullNameSave, ktorý parsuje input hodnotu pred uložením
  const handleFullNameSaveWithParse = async () => {
    // Obmedziť na 35 znakov
    const trimmedValue = fullNameInput.trim().slice(0, 35);

    // Pre firemné účty ukladať ako company_name
    if (accountType === 'business') {
      const newCompanyName = trimmedValue;

      // Porovnať s aktuálnou hodnotou
      if (newCompanyName === (user.company_name || '').trim()) {
        // Žiadna zmena
        return;
      }

      try {
        // Volať API priamo s company_name
        const response = await api.patch('/auth/profile/', {
          company_name: newCompanyName,
        });

        if (onUserUpdate && response.data?.user) {
          onUserUpdate(response.data.user);
        }
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error saving company name:', error);
        // Revert na pôvodnú hodnotu
        setFullNameInput(user.company_name || '');
      }
      return;
    }

    // Pre osobné účty používame existujúcu logiku
    const parts = trimmedValue.split(/\s+/).filter(Boolean);
    let newFirstName = '';
    let newLastName = '';

    if (parts.length === 0) {
      newFirstName = '';
      newLastName = '';
    } else if (parts.length === 1) {
      newFirstName = parts[0];
      newLastName = '';
    } else {
      newFirstName = parts.slice(0, -1).join(' ');
      newLastName = parts[parts.length - 1];
    }

    // Porovnať s aktuálnymi hodnotami
    const f = newFirstName.trim();
    const l = newLastName.trim();
    if (f === (user.first_name || '').trim() && l === (user.last_name || '').trim()) {
      // Žiadna zmena - len aktualizovať lokálny state
      setFirstName(newFirstName);
      setLastName(newLastName);
      return;
    }

    try {
      // Volať API priamo s novými hodnotami
      const response = await api.patch('/auth/profile/', {
        first_name: f,
        last_name: l,
      });

      // Aktualizovať state
      setFirstName(newFirstName);
      setLastName(newLastName);

      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error saving full name:', error);
      // Revert na pôvodné hodnoty
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setFullNameInput(
        firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '',
      );
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
        {accountType === 'business' ? 'Meno / Názov' : t('profile.fullName', 'Meno')}
      </label>
      <input
        id="fullName"
        type="text"
        value={fullNameInput}
        onChange={(e) => {
          const value = e.target.value;
          // Obmedziť na 35 znakov
          if (value.length <= 35) {
            setFullNameInput(value);
          }
        }}
        onBlur={handleFullNameSaveWithParse}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleFullNameSaveWithParse();
          }
        }}
        maxLength={35}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder={t('profile.enterName', 'Zadajte svoje meno a priezvisko')}
      />
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
        {fullNameInput.length}/35 znakov
      </div>
    </div>
  );
}



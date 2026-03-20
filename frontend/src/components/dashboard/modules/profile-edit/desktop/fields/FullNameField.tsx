'use client';

import React, { useEffect, useState } from 'react';
import type { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface FullNameFieldProps {
  editableUser: User;
  accountType: 'personal' | 'business';
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onEditableUserUpdate: (partial: Partial<User>) => void;
  onBlur?: () => void;
}

/**
 * Meno / Názov field (desktop) – používa editableUser, sync na blur bez API.
 * - personal: parsovanie do first_name/last_name
 * - business: ukladanie do company_name
 */
export default function FullNameField({
  editableUser,
  accountType,
  firstName,
  lastName,
  setFirstName,
  setLastName,
  onEditableUserUpdate,
  onBlur,
}: FullNameFieldProps) {
  const { t } = useLanguage();

  const [fullNameInput, setFullNameInput] = useState('');

  useEffect(() => {
    if (accountType === 'business') {
      const nameToUse = editableUser.company_name || '';
      setFullNameInput(nameToUse);
    } else {
      const firstNameToUse = firstName || editableUser.first_name || '';
      const fullName =
        firstNameToUse && lastName ? `${firstNameToUse} ${lastName}` : firstNameToUse || lastName || '';
      setFullNameInput(fullName);
    }
  }, [firstName, lastName, accountType, editableUser.company_name, editableUser.first_name, editableUser.last_name]);

  const handleBlur = () => {
    const trimmedValue = fullNameInput.trim().slice(0, 25);

    if (accountType === 'business') {
      const newCompanyName = trimmedValue;
      if (newCompanyName === (editableUser.company_name || '').trim()) return;

      setFirstName(newCompanyName);
      setLastName('');
      onEditableUserUpdate({
        company_name: newCompanyName,
        first_name: newCompanyName,
        last_name: '',
      });
      onBlur?.();
      return;
    }

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

    const f = newFirstName.trim();
    const l = newLastName.trim();
    if (f === (editableUser.first_name || '').trim() && l === (editableUser.last_name || '').trim()) {
      setFirstName(newFirstName);
      setLastName(newLastName);
      return;
    }

    setFirstName(newFirstName);
    setLastName(newLastName);
    onEditableUserUpdate({
      first_name: f,
      last_name: l,
      company_name: '',
    });
    onBlur?.();
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
          if (value.length <= 25) setFullNameInput(value);
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleBlur();
        }}
        maxLength={25}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder={t('profile.enterName', 'Zadajte svoje meno a priezvisko')}
      />
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
        {fullNameInput.length}/25 znakov
      </div>
    </div>
  );
}

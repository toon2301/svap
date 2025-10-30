'use client';

import React from 'react';

interface Props {
  t: (k: string, def?: string) => string;
  value: 'individual' | 'company';
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown: (e: React.KeyboardEvent, field: string) => void;
  onTouchStart: (e: React.TouchEvent, field: string) => void;
  onTouchEnd: (e: React.TouchEvent, field: string) => void;
  onFocus: (field: string) => void;
  onBlur: (field: string) => void;
}

export default function AccountTypeSelect({ t, value, onChange, onKeyDown, onTouchStart, onTouchEnd, onFocus, onBlur }: Props) {
  return (
    <div>
      <label className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
        {t('auth.accountType')}
      </label>
      <select
        id="user_type"
        name="user_type"
        value={value}
        onChange={onChange}
        onKeyDown={(e) => onKeyDown(e, 'user_type')}
        onTouchStart={(e) => onTouchStart(e, 'user_type')}
        onTouchEnd={(e) => onTouchEnd(e, 'user_type')}
        onFocus={() => onFocus('user_type')}
        onBlur={() => onBlur('user_type')}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white"
        aria-label={t('auth.selectAccountType')}
        aria-required="true"
        aria-describedby="user-type-help"
        tabIndex={1}
      >
        <option value="individual">{t('auth.individual')}</option>
        <option value="company">{t('auth.company')}</option>
      </select>
      <div id="user-type-help" className="sr-only">{t('auth.selectAccountTypeHelp')}</div>
    </div>
  );
}



'use client';

import React from 'react';

interface Props {
  t: (k: string, def?: string) => string;
  birthDay: string; birthMonth: string; birthYear: string;
  gender: string;
  errors: Record<string, string>;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent, field: string) => void;
  onGenderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  bindSelectHandlers: {
    onTouchStart: (e: React.TouchEvent, field: string) => void;
    onTouchEnd: (e: React.TouchEvent, field: string) => void;
    onFocus: (field: string) => void;
    onBlur: (field: string) => void;
  };
}

export default function BirthGenderSection({ t, birthDay, birthMonth, birthYear, gender, errors, onDateChange, onKeyDown, onGenderChange, bindSelectHandlers }: Props) {
  const dateValue = birthDay && birthMonth && birthYear ? `${birthYear}-${birthMonth}-${birthDay}` : '';
  return (
    <>
      <div>
        <label htmlFor="birth_date" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">{t('auth.birthDate')} *</label>
        <input
          id="birth_date"
          type="date"
          name="birth_date"
          value={dateValue}
          onChange={onDateChange}
          onKeyDown={(e) => onKeyDown(e, 'birth_date')}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
            errors.birth_day || errors.birth_month || errors.birth_year ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          aria-label={t('auth.birthDateHelp')}
          aria-required="true"
          aria-invalid={errors.birth_day || errors.birth_month || errors.birth_year ? 'true' : 'false'}
          aria-describedby={errors.birth_day || errors.birth_month || errors.birth_year ? 'birth-date-error' : 'birth-date-help'}
          tabIndex={5}
        />
        <div id="birth-date-help" className="sr-only">{t('auth.birthDateHelp')}</div>
        {(errors.birth_day || errors.birth_month || errors.birth_year) && (
          <p id="birth-date-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">{errors.birth_day || errors.birth_month || errors.birth_year}</p>
        )}
      </div>

      <div>
        <label htmlFor="gender" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">{t('auth.gender')} *</label>
        <select
          id="gender"
          name="gender"
          value={gender}
          onChange={onGenderChange}
          onTouchStart={(e) => bindSelectHandlers.onTouchStart(e, 'gender')}
          onTouchEnd={(e) => bindSelectHandlers.onTouchEnd(e, 'gender')}
          onFocus={() => bindSelectHandlers.onFocus('gender')}
          onBlur={() => bindSelectHandlers.onBlur('gender')}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
            errors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          <option value="">{t('auth.selectGender')}</option>
          <option value="male">{t('auth.male')}</option>
          <option value="female">{t('auth.female')}</option>
          <option value="other">{t('auth.other')}</option>
        </select>
        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
      </div>
    </>
  );
}



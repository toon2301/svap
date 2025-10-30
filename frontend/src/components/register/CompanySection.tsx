'use client';

import React from 'react';

interface Props {
  t: (k: string, def?: string) => string;
  companyName: string;
  website: string;
  errors: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function CompanySection({ t, companyName, website, errors, onChange }: Props) {
  return (
    <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
      <h3 className="text-base font-normal text-purple-700 dark:text-purple-400 mb-2 max-lg:text-base max-lg:mb-1">{t('auth.companyInfo')}</h3>
      <div>
        <label htmlFor="company_name" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">{t('auth.companyName')} *</label>
        <input
          id="company_name"
          type="text"
          name="company_name"
          value={companyName}
          onChange={onChange}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
            errors.company_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder={t('auth.companyNamePlaceholder')}
        />
        {errors.company_name && <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>}
      </div>

      <div>
        <label className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">{t('auth.website')}</label>
        <input
          type="url"
          name="website"
          value={website}
          onChange={onChange}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white"
          placeholder={t('auth.websitePlaceholder')}
        />
      </div>
    </div>
  );
}



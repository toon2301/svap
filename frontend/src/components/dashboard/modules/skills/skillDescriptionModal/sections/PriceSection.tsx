'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import CurrencySelect from '../CurrencySelect';
import { CurrencyOption } from '../types';

interface PriceSectionProps {
  value: string;
  onChange: (value: string) => void;
  currency: CurrencyOption;
  onCurrencyChange: (value: CurrencyOption) => void;
  error: string;
  isSeeking?: boolean;
}

export default function PriceSection({ value, onChange, currency, onCurrencyChange, error, isSeeking = false }: PriceSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {isSeeking
          ? t('skills.priceToOptional', 'Cena do (voliteľné)')
          : t('skills.priceFromOptional', 'Cena od (voliteľné)')}
      </label>
      <div className="flex items-stretch h-11 border border-gray-300 dark:border-gray-700 rounded-lg overflow-visible focus-within:ring-1 focus-within:ring-purple-300 focus-within:border-purple-300 dark:focus-within:border-purple-500 transition-all hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-black">
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 px-3 py-0 h-full border-0 bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="self-stretch w-px bg-gray-300 dark:bg-gray-600"></div>
        <CurrencySelect value={currency} onChange={onCurrencyChange} />
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}


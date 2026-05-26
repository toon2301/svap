'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MasterToggle from '../../../notifications/MasterToggle';
import CurrencySelect from '../CurrencySelect';
import { CurrencyOption } from '../types';

interface PriceSectionProps {
  value: string;
  onChange: (value: string) => void;
  currency: CurrencyOption;
  onCurrencyChange: (value: CurrencyOption) => void;
  isNegotiable?: boolean;
  onNegotiableChange?: (value: boolean) => void;
  error: string;
  isSeeking?: boolean;
}

export default function PriceSection({
  value,
  onChange,
  currency,
  onCurrencyChange,
  isNegotiable = false,
  onNegotiableChange,
  error,
  isSeeking = false,
}: PriceSectionProps) {
  const { t } = useLanguage();

  const negotiableLabel = t('skills.priceNegotiable', 'Dohodou');

  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {isSeeking
          ? t('skills.priceToOptional', 'Cena do (voliteľné)')
          : t('skills.priceFromOptional', 'Cena od (voliteľné)')}
      </p>

      <div
        className={`rounded-xl border px-3 py-2.5 transition-colors ${
          isNegotiable
            ? 'border-purple-200 bg-purple-50/60 dark:border-purple-800/50 dark:bg-purple-950/20'
            : 'border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/40'
        }`}
      >
        <MasterToggle
          enabled={isNegotiable}
          onChange={(next) => onNegotiableChange?.(next)}
          label={negotiableLabel}
        />
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
          isNegotiable ? 'mt-0 grid-rows-[0fr] opacity-0' : 'mt-3 grid-rows-[1fr] opacity-100'
        }`}
        aria-hidden={isNegotiable}
      >
        <div className="min-h-0 overflow-hidden">
          {!isNegotiable ? (
            <div className="flex h-11 items-stretch overflow-visible rounded-lg border border-gray-300 bg-white transition-all hover:border-gray-400 focus-within:border-purple-300 focus-within:ring-1 focus-within:ring-purple-300 dark:border-gray-700 dark:bg-black dark:focus-within:border-purple-500 dark:hover:border-gray-600">
              <input
                type="number"
                min="0"
                step="1"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
                className="h-full flex-1 border-0 bg-transparent px-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <div className="w-px self-stretch bg-gray-300 dark:bg-gray-600" />
              <CurrencySelect value={currency} onChange={onCurrencyChange} />
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div className="error-alert-modern mt-2 px-3 py-2 text-sm">{error}</div> : null}
    </div>
  );
}


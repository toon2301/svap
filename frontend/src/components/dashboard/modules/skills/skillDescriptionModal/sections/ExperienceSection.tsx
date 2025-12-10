'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ExperienceUnitSelect from '../ExperienceUnitSelect';
import { UnitOption } from '../types';

interface ExperienceSectionProps {
  value: string;
  onChange: (value: string) => void;
  unit: UnitOption;
  onUnitChange: (value: UnitOption) => void;
  error: string;
  isSeeking?: boolean;
}

export default function ExperienceSection({ value, onChange, unit, onUnitChange, error, isSeeking = false }: ExperienceSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {isSeeking
          ? t('skills.experienceOptionalSeeking', 'Minimálna prax (voliteľné)')
          : t('skills.experienceOptional', 'Dĺžka praxe (voliteľné)')}
      </label>
      <div className="flex items-stretch h-11 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-purple-300 focus-within:border-purple-300 dark:focus-within:border-purple-500 transition-all hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-black">
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 px-3 py-0 h-full border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="self-stretch w-px bg-gray-300 dark:bg-gray-600"></div>
        <ExperienceUnitSelect value={unit} onChange={onUnitChange} />
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}


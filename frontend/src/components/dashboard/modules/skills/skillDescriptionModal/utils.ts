'use client';

import { CURRENCY_OPTIONS, CurrencyOption } from './types';

export const currencyFromLocale = (locale: string): CurrencyOption => {
  if (locale === 'pl') return 'zł';
  if (locale === 'hu') return 'Ft';
  if (locale === 'cs') return 'Kč';
  return '€';
};

export const ensureCurrencyOption = (value?: string | null): CurrencyOption => {
  if (value && CURRENCY_OPTIONS.includes(value as CurrencyOption)) {
    return value as CurrencyOption;
  }
  return '€';
};

export function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}


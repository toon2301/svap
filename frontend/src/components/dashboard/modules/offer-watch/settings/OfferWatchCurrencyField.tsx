'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  OFFER_WATCH_PRICE_CURRENCIES,
  type OfferWatchPriceCurrency,
} from '../types';
import OfferWatchSearchSelect, { type OfferWatchSearchOption } from './OfferWatchSearchSelect';

const CURRENCY_CODE: Record<OfferWatchPriceCurrency, string> = {
  '€': 'EUR',
  'Kč': 'CZK',
  '$': 'USD',
  'zł': 'PLN',
  Ft: 'HUF',
};

type OfferWatchCurrencyFieldProps = {
  id: string;
  currency: OfferWatchPriceCurrency | '';
  onChange: (currency: OfferWatchPriceCurrency) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export default function OfferWatchCurrencyField({
  id,
  currency,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
}: OfferWatchCurrencyFieldProps) {
  const { locale, t } = useLanguage();
  const options = useMemo<OfferWatchSearchOption[]>(() => {
    let displayNames: Intl.DisplayNames | null = null;
    try {
      displayNames = new Intl.DisplayNames([locale], { type: 'currency' });
    } catch {
      displayNames = null;
    }
    return OFFER_WATCH_PRICE_CURRENCIES.map((value) => {
      const code = CURRENCY_CODE[value];
      return {
        key: value,
        label: value,
        secondaryLabel: displayNames?.of(code) || code,
        searchText: code,
      };
    });
  }, [locale]);
  const label = t('offerWatch.currency', 'Mena');

  return (
    <OfferWatchSearchSelect
      id={id}
      label={label}
      valueKey={currency}
      valueLabel={currency}
      placeholder={label}
      searchPlaceholder={t('offerWatch.currencySearchPlaceholder', 'Vyhľadaj menu')}
      emptyMessage={t('offerWatch.currencyNoResults', 'Nenašla sa žiadna mena.')}
      options={options}
      onSelect={(option) => onChange(option.key as OfferWatchPriceCurrency)}
      disabled={disabled}
      invalid={invalid}
      describedBy={describedBy}
    />
  );
}

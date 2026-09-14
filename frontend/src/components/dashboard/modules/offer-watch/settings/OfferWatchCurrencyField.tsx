'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  OFFER_WATCH_PRICE_CURRENCIES,
  type OfferWatchPriceCurrency,
} from '../types';
import OfferWatchSearchSelect, { type OfferWatchSearchOption } from './OfferWatchSearchSelect';

type OfferWatchCurrencyPresentation = 'native' | 'custom' | 'custom-above';

type OfferWatchCurrencyFieldProps = {
  id: string;
  currency: OfferWatchPriceCurrency | '';
  onChange: (currency: OfferWatchPriceCurrency) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  presentation?: OfferWatchCurrencyPresentation;
};

export default function OfferWatchCurrencyField({
  id,
  currency,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
  presentation = 'native',
}: OfferWatchCurrencyFieldProps) {
  const { t } = useLanguage();
  const label = t('offerWatch.currency', 'Mena');
  const options: OfferWatchSearchOption[] = OFFER_WATCH_PRICE_CURRENCIES.map((option) => ({
    key: option,
    label: option,
  }));

  if (presentation !== 'native') {
    return (
      <OfferWatchSearchSelect
        id={id}
        label={label}
        valueKey={currency}
        valueLabel={currency}
        placeholder={label}
        searchPlaceholder={label}
        emptyMessage={label}
        options={options}
        onSelect={(option) => {
          const selectedCurrency = OFFER_WATCH_PRICE_CURRENCIES.find(
            (currencyOption) => currencyOption === option.key,
          );
          if (selectedCurrency) onChange(selectedCurrency);
        }}
        disabled={disabled}
        invalid={invalid}
        describedBy={describedBy}
        readOnly
        popupPlacement={presentation === 'custom-above' ? 'above' : 'auto'}
        chevronPointsUp={presentation === 'custom-above'}
      />
    );
  }

  return (
    <div className='relative w-full'>
      <select
        id={id}
        value={currency}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onChange={(event) => {
          const selectedCurrency = OFFER_WATCH_PRICE_CURRENCIES.find(
            (option) => option === event.currentTarget.value,
          );
          if (selectedCurrency) onChange(selectedCurrency);
        }}
        style={{ backgroundImage: 'none' }}
        className={`min-h-11 w-full appearance-none bg-none rounded-xl border bg-white px-3 py-2 pr-9 text-sm outline-none [color-scheme:light] focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:bg-black dark:[color-scheme:dark] dark:disabled:bg-gray-900 dark:disabled:text-gray-500 ${
          currency
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400'
        } ${
          invalid
            ? 'border-red-400 focus:ring-red-400/25 dark:border-red-700'
            : 'border-gray-300 focus:border-purple-400 focus:ring-purple-400/25 dark:border-gray-700'
        }`}
      >
        <option value='' disabled>{label}</option>
        {OFFER_WATCH_PRICE_CURRENCIES.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <ChevronDownIcon
        className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'
        aria-hidden='true'
      />
    </div>
  );
}

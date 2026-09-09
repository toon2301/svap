'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOfferCountryEntries,
  getOfferCountryFallbackName,
  type OfferCountryCode,
} from '@/shared/countryRegistry';
import OfferWatchSearchSelect, { type OfferWatchSearchOption } from './OfferWatchSearchSelect';

type OfferWatchCountryFieldProps = {
  id: string;
  countryCode: OfferCountryCode | '';
  onChange: (countryCode: OfferCountryCode) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export default function OfferWatchCountryField({
  id,
  countryCode,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
}: OfferWatchCountryFieldProps) {
  const { locale, t } = useLanguage();
  const options = useMemo<OfferWatchSearchOption[]>(() => {
    let displayNames: Intl.DisplayNames | null = null;
    try {
      displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      displayNames = null;
    }

    return getOfferCountryEntries()
      .map((country) => ({
        key: country.code,
        label: displayNames?.of(country.code) || country.name,
        secondaryLabel: country.code,
        searchText: country.name,
      }))
      .sort((first, second) => first.label.localeCompare(second.label, locale));
  }, [locale]);
  const selectedLabel = options.find((option) => option.key === countryCode)?.label
    || getOfferCountryFallbackName(countryCode);

  return (
    <OfferWatchSearchSelect
      id={id}
      label={t('offerWatch.countryLabel', 'Krajina')}
      valueKey={countryCode}
      valueLabel={selectedLabel}
      placeholder={t('skills.countryPlaceholder', 'Vyber krajinu')}
      searchPlaceholder={t('skills.countrySearchPlaceholder', 'Vyhľadaj krajinu')}
      emptyMessage={t('skills.countryNoResults', 'Nenašla sa žiadna krajina.')}
      options={options}
      onSelect={(option) => onChange(option.key)}
      disabled={disabled}
      invalid={invalid}
      describedBy={describedBy}
    />
  );
}

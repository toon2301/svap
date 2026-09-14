'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  type OfferCountryCode,
} from '@/shared/countryRegistry';
import {
  buildOfferWatchCountryOptions,
  offerWatchCountryLabel,
  selectedOfferWatchCountryLabel,
} from '../offerWatchSelectionOptions';
import OfferWatchMobilePickerTrigger from '../mobile/OfferWatchMobilePickerTrigger';
import OfferWatchSearchSelect, { type OfferWatchSearchOption } from './OfferWatchSearchSelect';

type OfferWatchCountryFieldProps = {
  id: string;
  countryCode: OfferCountryCode | '';
  onChange: (countryCode: OfferCountryCode) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onOpenMobilePicker?: () => void;
};

export default function OfferWatchCountryField({
  id,
  countryCode,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
  onOpenMobilePicker,
}: OfferWatchCountryFieldProps) {
  const { locale, t } = useLanguage();
  const usesMobilePicker = Boolean(onOpenMobilePicker);
  const options = useMemo<OfferWatchSearchOption[]>(
    () => (usesMobilePicker ? [] : buildOfferWatchCountryOptions(locale)),
    [locale, usesMobilePicker],
  );
  const selectedLabel = useMemo(
    () => (usesMobilePicker
      ? offerWatchCountryLabel(locale, countryCode)
      : selectedOfferWatchCountryLabel(options, countryCode)),
    [countryCode, locale, options, usesMobilePicker],
  );
  const label = t('offerWatch.countryLabel', 'Krajina');
  const placeholder = t('skills.countryPlaceholder', 'Vyber krajinu');

  if (onOpenMobilePicker) {
    return (
      <OfferWatchMobilePickerTrigger
        id={id}
        label={label}
        valueLabel={selectedLabel}
        placeholder={placeholder}
        onOpen={onOpenMobilePicker}
        disabled={disabled}
        invalid={invalid}
        describedBy={describedBy}
      />
    );
  }

  return (
    <OfferWatchSearchSelect
      id={id}
      label={label}
      valueKey={countryCode}
      valueLabel={selectedLabel}
      placeholder={placeholder}
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

'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  isInactiveOfferDistrictCode,
} from '@/shared/districtRegistry';
import type { OfferCountryCode } from '@/shared/countryRegistry';
import {
  buildOfferWatchDistrictOptions,
  selectedOfferWatchDistrictLabel,
} from '../offerWatchSelectionOptions';
import OfferWatchMobilePickerTrigger from '../mobile/OfferWatchMobilePickerTrigger';
import OfferWatchSearchSelect, { type OfferWatchSearchOption } from './OfferWatchSearchSelect';

type OfferWatchDistrictFieldProps = {
  id: string;
  countryCode: OfferCountryCode;
  districtCode: string;
  onChange: (districtCode: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onOpenMobilePicker?: () => void;
};

export default function OfferWatchDistrictField({
  id,
  countryCode,
  districtCode,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
  onOpenMobilePicker,
}: OfferWatchDistrictFieldProps) {
  const { t } = useLanguage();
  const usesMobilePicker = Boolean(onOpenMobilePicker);
  const allDistrictsLabel = t('offerWatch.allDistricts', 'Všetky okresy');
  const options = useMemo<OfferWatchSearchOption[]>(
    () => (usesMobilePicker
      ? []
      : buildOfferWatchDistrictOptions(countryCode, allDistrictsLabel)),
    [allDistrictsLabel, countryCode, usesMobilePicker],
  );
  const inactive = isInactiveOfferDistrictCode(countryCode, districtCode);
  const selectedLabel = selectedOfferWatchDistrictLabel(
    countryCode,
    districtCode,
    allDistrictsLabel,
  );
  const label = t('offerWatch.districtLabel', 'Okres (voliteľný)');

  if (onOpenMobilePicker) {
    return (
      <OfferWatchMobilePickerTrigger
        id={id}
        label={label}
        valueLabel={selectedLabel}
        placeholder={allDistrictsLabel}
        onOpen={onOpenMobilePicker}
        disabled={disabled}
        invalid={invalid || inactive}
        describedBy={describedBy}
      />
    );
  }

  return (
    <OfferWatchSearchSelect
      id={id}
      label={label}
      valueKey={districtCode}
      valueLabel={selectedLabel}
      placeholder={allDistrictsLabel}
      searchPlaceholder={t('offerWatch.districtSearchPlaceholder', 'Vyhľadaj okres')}
      emptyMessage={t('offerWatch.districtNoResults', 'Nenašiel sa žiadny okres.')}
      options={options}
      onSelect={(option) => onChange(option.key)}
      disabled={disabled}
      invalid={invalid || inactive}
      describedBy={describedBy}
    />
  );
}

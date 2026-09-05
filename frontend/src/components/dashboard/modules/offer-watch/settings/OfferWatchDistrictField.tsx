'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getDistrictOptions,
  getOfferDistrictLabel,
  isInactiveOfferDistrictCode,
} from '@/shared/districtRegistry';
import type { OfferCountryCode } from '@/shared/countryRegistry';
import OfferWatchSearchSelect, { type OfferWatchSearchOption } from './OfferWatchSearchSelect';

type OfferWatchDistrictFieldProps = {
  id: string;
  countryCode: OfferCountryCode;
  districtCode: string;
  onChange: (districtCode: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export default function OfferWatchDistrictField({
  id,
  countryCode,
  districtCode,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
}: OfferWatchDistrictFieldProps) {
  const { t } = useLanguage();
  const allDistrictsLabel = t('offerWatch.allDistricts', 'Všetky okresy');
  const options = useMemo<OfferWatchSearchOption[]>(() => [
    { key: '', label: allDistrictsLabel },
    ...getDistrictOptions(countryCode).map((district) => ({
      key: district.code,
      label: district.label,
      searchText: district.aliases.join(' '),
    })),
  ], [allDistrictsLabel, countryCode]);
  const historicalLabel = getOfferDistrictLabel(countryCode, districtCode);
  const inactive = isInactiveOfferDistrictCode(countryCode, districtCode);
  const selectedLabel = districtCode
    ? historicalLabel || districtCode
    : allDistrictsLabel;

  return (
    <OfferWatchSearchSelect
      id={id}
      label={t('offerWatch.districtLabel', 'Okres (voliteľný)')}
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

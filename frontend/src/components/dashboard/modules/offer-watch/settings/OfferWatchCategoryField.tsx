'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  buildOfferWatchCategoryOptions,
  offerWatchCategoryKey,
} from '../offerWatchSelectionOptions';
import OfferWatchMobilePickerTrigger from '../mobile/OfferWatchMobilePickerTrigger';
import OfferWatchSearchSelect, { type OfferWatchSearchOption } from './OfferWatchSearchSelect';
import { offerWatchSubcategoryLabel } from './offerWatchUi';

type OfferWatchCategoryFieldProps = {
  id: string;
  category: string;
  subcategory: string;
  onChange: (category: string, subcategory: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onOpenMobilePicker?: () => void;
};

export default function OfferWatchCategoryField({
  id,
  category,
  subcategory,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
  onOpenMobilePicker,
}: OfferWatchCategoryFieldProps) {
  const { t } = useLanguage();
  const usesMobilePicker = Boolean(onOpenMobilePicker);
  const options = useMemo<OfferWatchSearchOption[]>(
    () => (usesMobilePicker ? [] : buildOfferWatchCategoryOptions(t)),
    [t, usesMobilePicker],
  );
  const selectedLabel = category && subcategory
    ? offerWatchSubcategoryLabel(t, category, subcategory)
    : '';
  const label = t('offerWatch.categoryLabel', 'Podkategória');
  const placeholder = t('offerWatch.categoryPlaceholder', 'Vyber podkategóriu');

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
      valueKey={offerWatchCategoryKey(category, subcategory)}
      valueLabel={selectedLabel}
      placeholder={placeholder}
      searchPlaceholder={t('offerWatch.categorySearchPlaceholder', 'Začni písať názov podkategórie')}
      startTypingMessage={t('offerWatch.categoryStartTyping', 'Začni písať a vyber podkategóriu zo zoznamu.')}
      emptyMessage={t('offerWatch.categoryNoResults', 'Nenašla sa žiadna podkategória.')}
      options={options}
      onSelect={(option) => {
        const [nextCategory, nextSubcategory] = option.key.split('\u0000');
        if (nextCategory && nextSubcategory) onChange(nextCategory, nextSubcategory);
      }}
      disabled={disabled}
      invalid={invalid}
      describedBy={describedBy}
      requireQuery
    />
  );
}

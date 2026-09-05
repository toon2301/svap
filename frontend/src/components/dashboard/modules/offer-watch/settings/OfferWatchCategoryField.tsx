'use client';

import { useMemo } from 'react';
import { skillsCategories } from '@/constants/skillsCategories';
import { useLanguage } from '@/contexts/LanguageContext';
import OfferWatchSearchSelect, { type OfferWatchSearchOption } from './OfferWatchSearchSelect';
import {
  offerWatchCategoryLabel,
  offerWatchSubcategoryLabel,
} from './offerWatchUi';

type OfferWatchCategoryFieldProps = {
  id: string;
  category: string;
  subcategory: string;
  onChange: (category: string, subcategory: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export default function OfferWatchCategoryField({
  id,
  category,
  subcategory,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
}: OfferWatchCategoryFieldProps) {
  const { t } = useLanguage();
  const options = useMemo<OfferWatchSearchOption[]>(() => (
    Object.entries(skillsCategories).flatMap(([categoryName, subcategories]) =>
      subcategories.map((subcategoryName) => ({
        key: `${categoryName}\u0000${subcategoryName}`,
        label: offerWatchSubcategoryLabel(t, categoryName, subcategoryName),
        secondaryLabel: offerWatchCategoryLabel(t, categoryName),
        searchText: `${categoryName} ${subcategoryName}`,
      })),
    )
  ), [t]);
  const selectedLabel = category && subcategory
    ? offerWatchSubcategoryLabel(t, category, subcategory)
    : '';

  return (
    <OfferWatchSearchSelect
      id={id}
      label={t('offerWatch.categoryLabel', 'Podkategória')}
      valueKey={category && subcategory ? `${category}\u0000${subcategory}` : ''}
      valueLabel={selectedLabel}
      placeholder={t('offerWatch.categoryPlaceholder', 'Vyber podkategóriu')}
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

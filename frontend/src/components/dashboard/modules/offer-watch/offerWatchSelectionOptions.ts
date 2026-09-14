'use client';

import { skillsCategories } from '@/constants/skillsCategories';
import {
  getOfferCountryEntries,
  getOfferCountryFallbackName,
  type OfferCountryCode,
} from '@/shared/countryRegistry';
import {
  getDistrictOptions,
  getOfferDistrictLabel,
} from '@/shared/districtRegistry';
import {
  normalizeOfferWatchSearch,
  offerWatchCategoryLabel,
  offerWatchSubcategoryLabel,
  type OfferWatchTranslate,
} from './settings/offerWatchUi';

export type OfferWatchPickerKind = 'category' | 'country' | 'district';

export type OfferWatchSelectionOption = {
  key: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

const CATEGORY_KEY_SEPARATOR = '\u0000';

export function offerWatchCategoryKey(category: string, subcategory: string): string {
  return category && subcategory
    ? `${category}${CATEGORY_KEY_SEPARATOR}${subcategory}`
    : '';
}

export function parseOfferWatchCategoryKey(
  key: string,
): { category: string; subcategory: string } | null {
  const separatorIndex = key.indexOf(CATEGORY_KEY_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === key.length - 1) return null;
  return {
    category: key.slice(0, separatorIndex),
    subcategory: key.slice(separatorIndex + 1),
  };
}

export function buildOfferWatchCategoryOptions(
  t: OfferWatchTranslate,
): OfferWatchSelectionOption[] {
  return Object.entries(skillsCategories).flatMap(([categoryName, subcategories]) =>
    subcategories.map((subcategoryName) => ({
      key: offerWatchCategoryKey(categoryName, subcategoryName),
      label: offerWatchSubcategoryLabel(t, categoryName, subcategoryName),
      secondaryLabel: offerWatchCategoryLabel(t, categoryName),
      searchText: `${categoryName} ${subcategoryName}`,
    })),
  );
}

export function buildOfferWatchCountryOptions(
  locale: string,
): OfferWatchSelectionOption[] {
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
}

export function offerWatchCountryLabel(
  locale: string,
  countryCode: OfferCountryCode | '',
): string {
  if (!countryCode) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode)
      || getOfferCountryFallbackName(countryCode);
  } catch {
    return getOfferCountryFallbackName(countryCode);
  }
}

export function selectedOfferWatchCountryLabel(
  options: OfferWatchSelectionOption[],
  countryCode: OfferCountryCode | '',
): string {
  return options.find((option) => option.key === countryCode)?.label
    || getOfferCountryFallbackName(countryCode);
}

export function buildOfferWatchDistrictOptions(
  countryCode: OfferCountryCode,
  allDistrictsLabel: string,
): OfferWatchSelectionOption[] {
  return [
    { key: '', label: allDistrictsLabel },
    ...getDistrictOptions(countryCode).map((district) => ({
      key: district.code,
      label: district.label,
      searchText: district.aliases.join(' '),
    })),
  ];
}

export function selectedOfferWatchDistrictLabel(
  countryCode: OfferCountryCode,
  districtCode: string,
  allDistrictsLabel: string,
): string {
  if (!districtCode) return allDistrictsLabel;
  return getOfferDistrictLabel(countryCode, districtCode) || districtCode;
}

export function filterOfferWatchSelectionOptions(
  options: OfferWatchSelectionOption[],
  query: string,
  requireQuery: boolean,
): OfferWatchSelectionOption[] {
  const seenKeys = new Set<string>();
  const uniqueOptions = options.filter((option) => {
    if (seenKeys.has(option.key)) return false;
    seenKeys.add(option.key);
    return true;
  });
  const normalizedQuery = normalizeOfferWatchSearch(query);
  if (!normalizedQuery) return requireQuery ? [] : uniqueOptions;
  return uniqueOptions.filter((option) => normalizeOfferWatchSearch(
    `${option.label} ${option.secondaryLabel || ''} ${option.searchText || ''}`,
  ).includes(normalizedQuery));
}

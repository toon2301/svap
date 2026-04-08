'use client';

import { isValidOfferDistrictSelection } from '@/shared/districtRegistry';

export const isValidDistrictSelection = (params: {
  countryCode?: unknown;
  districtCode?: unknown;
  districtLabel?: unknown;
}): boolean => {
  return isValidOfferDistrictSelection(params);
};

export const scrollToDistrictInput = (): void => {
  setTimeout(() => {
    const districtInput = document.querySelector(
      '[data-offer-district-input="true"]',
    ) as HTMLInputElement | null;
    if (!districtInput) {
      return;
    }
    districtInput.focus();
    districtInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
};

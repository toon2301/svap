'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { OfferCountryCode } from '@/shared/districtRegistry';

type LocationDraft = {
  countryCode: OfferCountryCode;
  districtCode: string;
  district: string;
  location: string;
};

type UseMobileLocationDraftParams = LocationDraft & {
  isOpen: boolean;
  onCountryCodeChange: (value: OfferCountryCode) => void;
  onDistrictCodeChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onClose: () => void;
};

export function useMobileLocationDraft({
  isOpen,
  countryCode,
  districtCode,
  district,
  location,
  onCountryCodeChange,
  onDistrictCodeChange,
  onDistrictChange,
  onLocationChange,
  onClose,
}: UseMobileLocationDraftParams): () => void {
  const snapshotRef = useRef<LocationDraft>({
    countryCode,
    districtCode,
    district,
    location,
  });
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      snapshotRef.current = {
        countryCode,
        districtCode,
        district,
        location,
      };
    }
    wasOpenRef.current = isOpen;
  }, [countryCode, district, districtCode, isOpen, location]);

  return useCallback(() => {
    const snapshot = snapshotRef.current;
    onCountryCodeChange(snapshot.countryCode);
    onDistrictCodeChange(snapshot.districtCode);
    onDistrictChange(snapshot.district);
    onLocationChange(snapshot.location);
    onClose();
  }, [
    onClose,
    onCountryCodeChange,
    onDistrictChange,
    onDistrictCodeChange,
    onLocationChange,
  ]);
}

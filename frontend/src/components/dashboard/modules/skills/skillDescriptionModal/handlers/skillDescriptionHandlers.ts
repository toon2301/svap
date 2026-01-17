'use client';

import { CurrencyOption, SkillImage, OpeningHours, UnitOption, ExperienceValue, DurationOption } from '../types';
import { isValidDistrict, scrollToDistrictInput } from '../validation/districtValidation';

interface HandleSaveParams {
  description: string;
  experienceValue: string;
  experienceUnit: UnitOption;
  tags: string[];
  images: File[];
  priceFrom: string;
  priceCurrency: CurrencyOption;
  location: string;
  district: string;
  detailedDescription: string;
  openingHours: OpeningHours;
  existingImages: SkillImage[];
  initialDescription?: string;
  initialExperience?: ExperienceValue;
  initialTags?: string[];
  initialDetailedDescription?: string;
  initialLocation?: string;
  initialDistrict?: string;
  initialOpeningHours?: OpeningHours;
  initialPriceFrom?: number | null;
  urgency?: 'low' | 'medium' | 'high' | '';
  durationType?: DurationOption | '' | null;
  isHidden?: boolean;
  onSave: (
    description: string,
    experience?: ExperienceValue,
    tags?: string[],
    images?: File[],
    priceFrom?: number | null,
    priceCurrency?: string,
    location?: string,
    detailedDescription?: string,
    openingHours?: OpeningHours,
    district?: string,
    urgency?: 'low' | 'medium' | 'high' | '',
    durationType?: DurationOption | '' | null,
    isHidden?: boolean
  ) => void;
  setError: (error: string) => void;
  setExperienceError: (error: string) => void;
  setPriceError: (error: string) => void;
  t: (key: string, fallback?: string) => string;
}

export const handleSave = ({
  description,
  experienceValue,
  experienceUnit,
  tags,
  images,
  priceFrom,
  priceCurrency,
  location,
  district,
  detailedDescription,
  openingHours,
  existingImages,
  initialDescription,
  initialExperience,
  initialTags,
  initialDetailedDescription,
  initialLocation,
  initialDistrict,
  initialOpeningHours,
  initialPriceFrom,
  urgency,
  durationType,
  isHidden,
  onSave,
  setError,
  setExperienceError,
  setPriceError,
  t,
}: HandleSaveParams): void => {
  const trimmed = description.trim();

  // Detekcia, či ide o editáciu existujúcej karty
  const isEditing =
    existingImages.length > 0 ||
    initialDescription ||
    initialExperience ||
    (initialTags && initialTags.length) ||
    initialDetailedDescription ||
    initialLocation ||
    initialDistrict ||
    (initialOpeningHours && Object.keys(initialOpeningHours).length > 0) ||
    (initialPriceFrom !== null && initialPriceFrom !== undefined && initialPriceFrom > 0);

  // Pri vytváraní novej karty je popis povinný, pri editácii existujúcej karty nie
  if (!isEditing && !trimmed) {
    setError(t('skills.descriptionRequired', 'Popis zručnosti je povinný'));
    return;
  }

  if (trimmed && trimmed.length > 100) {
    setError(t('skills.descriptionTooLong', 'Popis zručnosti môže mať maximálne 100 znakov'));
    return;
  }

  // Validácia experience
  let experience: { value: number; unit: UnitOption } | undefined;
  if (experienceValue.trim()) {
    const numValue = parseFloat(experienceValue.trim());
    if (isNaN(numValue) || numValue <= 0) {
      setExperienceError(t('skills.experiencePositive', 'Dĺžka praxe musí byť kladné číslo'));
      return;
    }
    if (numValue > 100) {
      setExperienceError(t('skills.experienceTooLarge', 'Dĺžka praxe nemôže byť väčšia ako 100'));
      return;
    }
    experience = {
      value: numValue,
      unit: experienceUnit,
    };
  }

  setExperienceError('');

  // Validácia price
  let priceValue: number | null = null;
  if (priceFrom.trim()) {
    const parsed = parseFloat(priceFrom.trim().replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
      setPriceError(t('skills.priceNonNegative', 'Cena musí byť nezáporné číslo'));
      return;
    }
    priceValue = parsed;
  }
  setPriceError('');

  const locationValue = location.trim();
  const districtValue = district.trim();

  // Validácia okresu
  if (districtValue) {
    if (!isValidDistrict(districtValue)) {
      scrollToDistrictInput();
      return;
    }
  }

  const detailedValue = detailedDescription.trim();
  const openingHoursValue = Object.keys(openingHours).length > 0 ? openingHours : undefined;
  
  onSave(
    trimmed,
    experience,
    tags,
    images,
    priceValue,
    priceCurrency,
    locationValue,
    detailedValue,
    openingHoursValue,
    districtValue,
    urgency || 'low',
    durationType || null,
    isHidden
  );
};

export const handleExperienceValueChange = (
  val: string,
  setExperienceValue: (val: string) => void,
  setExperienceError: (error: string) => void
): void => {
  if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
    setExperienceValue(val);
    setExperienceError('');
  }
};

export const handlePriceChange = (
  val: string,
  setPriceFrom: (val: string) => void,
  setPriceError: (error: string) => void
): void => {
  if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0)) {
    setPriceFrom(val);
    setPriceError('');
  }
};

interface HandleLocationBlurParams {
  location: string;
  lastSavedLocationRef: React.MutableRefObject<string>;
  onLocationSave?: (location: string) => Promise<void>;
  setLocation: (location: string) => void;
  setLocationError: (error: string) => void;
  setIsLocationSaving: (saving: boolean) => void;
  t: (key: string, fallback?: string) => string;
}

export const handleLocationBlur = async ({
  location,
  lastSavedLocationRef,
  onLocationSave,
  setLocation,
  setLocationError,
  setIsLocationSaving,
  t,
}: HandleLocationBlurParams): Promise<void> => {
  if (!onLocationSave) {
    return;
  }
  const trimmed = location.trim();
  if (trimmed === lastSavedLocationRef.current) {
    return;
  }
  try {
    setIsLocationSaving(true);
    setLocationError('');
    await onLocationSave(trimmed);
    lastSavedLocationRef.current = trimmed;
    setLocation(trimmed);
  } catch (err: any) {
    const apiMessage = err?.response?.data?.error || err?.response?.data?.detail;
    const fallback = t('skills.locationSaveError', 'Miesto sa nepodarilo uložiť. Skús to znova.');
    setLocationError(apiMessage || fallback);
    setLocation(lastSavedLocationRef.current);
  } finally {
    setIsLocationSaving(false);
  }
};


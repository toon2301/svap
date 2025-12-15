'use client';

export type SkillImage = {
  id?: number;
  image_url?: string | null;
  image?: string | null;
  order?: number;
};

export const CURRENCY_OPTIONS = ['€', 'Kč', '$', 'zł', 'Ft'] as const;
export type CurrencyOption = (typeof CURRENCY_OPTIONS)[number];

export const DURATION_OPTIONS = ['one_time', 'long_term', 'project'] as const;
export type DurationOption = (typeof DURATION_OPTIONS)[number];

export const UNIT_OPTIONS = [
  { value: 'years' as const, label: 'rokov' },
  { value: 'months' as const, label: 'mesiacov' },
] as const;

export type UnitOption = (typeof UNIT_OPTIONS)[number]['value'];

export type ExperienceValue = { value: number; unit: UnitOption };

export const MAX_DETAILED_LENGTH = 1000;

export type DayOpeningHours = {
  enabled: boolean;
  from: string;
  to: string;
};

export type OpeningHours = {
  monday?: DayOpeningHours;
  tuesday?: DayOpeningHours;
  wednesday?: DayOpeningHours;
  thursday?: DayOpeningHours;
  friday?: DayOpeningHours;
  saturday?: DayOpeningHours;
  sunday?: DayOpeningHours;
};

export interface SkillDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  subcategory: string;
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
    durationType?: DurationOption | '' | null
  ) => void;
  initialDescription?: string;
  initialExperience?: ExperienceValue;
  initialTags?: string[];
  initialImages?: SkillImage[];
  onRemoveExistingImage?: (imageId: number) => Promise<SkillImage[] | void>;
  initialPriceFrom?: number | null;
  initialPriceCurrency?: string;
  initialLocation?: string;
  initialDistrict?: string;
  onLocationSave?: (location: string) => Promise<void>;
  initialDetailedDescription?: string;
  initialOpeningHours?: OpeningHours;
  accountType?: 'personal' | 'business';
  isSeeking?: boolean;
  initialUrgency?: 'low' | 'medium' | 'high' | '';
  onUrgencyChange?: (urgency: 'low' | 'medium' | 'high' | '') => void;
  initialDurationType?: DurationOption | '' | null;
  onDurationTypeChange?: (durationType: DurationOption | '') => void;
}

export interface SkillsDescriptionScreenProps {
  category: string;
  subcategory: string;
  onBack: () => void;
  isSeeking?: boolean;
  initialDescription?: string;
  onDescriptionChange?: (description: string) => void;
  initialDetailedDescription?: string;
  onDetailedDescriptionChange?: (description: string) => void;
  initialTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  initialDistrict?: string;
  onDistrictChange?: (district: string) => void;
  initialLocation?: string;
  onLocationChange?: (location: string) => void;
  initialExperience?: { value: number; unit: UnitOption };
  onExperienceChange?: (experience: { value: number; unit: UnitOption } | undefined) => void;
  initialPriceFrom?: number | null;
  initialPriceCurrency?: string;
  onPriceChange?: (priceFrom: number | null, priceCurrency: string) => void;
  initialUrgency?: 'low' | 'medium' | 'high' | '';
  onUrgencyChange?: (urgency: 'low' | 'medium' | 'high' | '') => void;
  initialDurationType?: DurationOption | '' | null;
  onDurationTypeChange?: (durationType: DurationOption | '') => void;
  initialImages?: SkillImage[];
  onImagesChange?: (images: File[]) => void;
  onExistingImagesChange?: (existingImages: SkillImage[]) => void;
  onRemoveExistingImage?: (imageId: number) => Promise<SkillImage[] | void>;
  initialOpeningHours?: OpeningHours;
  onOpeningHoursChange?: (openingHours: OpeningHours) => void;
  accountType?: 'personal' | 'business';
}


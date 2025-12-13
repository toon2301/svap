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


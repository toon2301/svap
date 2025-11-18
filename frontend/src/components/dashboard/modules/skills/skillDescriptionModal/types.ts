'use client';

export type SkillImage = {
  id?: number;
  image_url?: string | null;
  image?: string | null;
  order?: number;
};

export const CURRENCY_OPTIONS = ['€', 'Kč', '$', 'zł', 'Ft'] as const;
export type CurrencyOption = (typeof CURRENCY_OPTIONS)[number];

export const UNIT_OPTIONS = [
  { value: 'years' as const, label: 'rokov' },
  { value: 'months' as const, label: 'mesiacov' },
] as const;

export type UnitOption = (typeof UNIT_OPTIONS)[number]['value'];

export type ExperienceValue = { value: number; unit: UnitOption };

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
    location?: string
  ) => void;
  initialDescription?: string;
  initialExperience?: ExperienceValue;
  initialTags?: string[];
  initialImages?: SkillImage[];
  onRemoveExistingImage?: (imageId: number) => Promise<SkillImage[] | void>;
  initialPriceFrom?: number | null;
  initialPriceCurrency?: string;
  initialLocation?: string;
  onLocationSave?: (location: string) => Promise<void>;
}


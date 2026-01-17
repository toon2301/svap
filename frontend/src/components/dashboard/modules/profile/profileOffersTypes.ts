'use client';

import type { OpeningHours } from '../skills/skillDescriptionModal/types';

export type ExperienceUnit = 'years' | 'months';

export interface OfferExperience {
  value: number;
  unit: ExperienceUnit;
}

export interface OfferImage {
  id: number;
  image_url?: string | null;
  image?: string | null;
  order?: number;
}

export interface Offer {
  id: number;
  category: string;
  subcategory: string;
  description: string;
  detailed_description?: string;
  images?: OfferImage[];
  price_from?: number | null;
  price_currency?: string;
  district?: string;
  location?: string;
  experience?: OfferExperience;
  tags?: string[];
  opening_hours?: OpeningHours;
  // True = karta z časti "Hľadám", False/undefined = karta z časti "Ponúkam"
  is_seeking?: boolean;
  urgency?: 'low' | 'medium' | 'high' | '';
  duration_type?: 'one_time' | 'long_term' | 'project' | '' | null;
  is_hidden?: boolean;
}

export const HOURS_DAYS = [
  { key: 'monday' as const, shortLabel: 'Po' },
  { key: 'tuesday' as const, shortLabel: 'Ut' },
  { key: 'wednesday' as const, shortLabel: 'St' },
  { key: 'thursday' as const, shortLabel: 'Št' },
  { key: 'friday' as const, shortLabel: 'Pi' },
  { key: 'saturday' as const, shortLabel: 'So' },
  { key: 'sunday' as const, shortLabel: 'Ne' },
] as const;

export function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}



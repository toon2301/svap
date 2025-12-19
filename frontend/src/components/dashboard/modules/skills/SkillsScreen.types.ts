'use client';

import type { OpeningHours } from './skillDescriptionModal/types';

export interface SkillItem {
  id?: number;
  category: string;
  subcategory: string;
  description?: string;
  experience?: { value: number; unit: 'years' | 'months' };
  tags?: string[];
  images?: Array<{ id: number; image_url?: string | null; image?: string | null; order?: number }>;
  price_from?: number | null;
  price_currency?: string;
  district?: string;
  location?: string;
  opening_hours?: OpeningHours;
  is_seeking?: boolean;
  urgency?: 'low' | 'medium' | 'high' | '';
}

export interface SkillsScreenProps {
  title: string;
  firstOptionText?: string;
  firstOptionHint?: string;
  onFirstOptionClick?: () => void;
  secondOptionText?: string;
  secondOptionHint?: string;
  onSecondOptionClick?: () => void;
  standardCategories?: SkillItem[];
  onRemoveStandardCategory?: (index: number) => void;
  onEditStandardCategoryDescription?: (index: number) => void;
  onAddCategory?: () => void;
  customCategories?: SkillItem[];
  onRemoveCustomCategory?: (index: number) => void;
  onEditCustomCategoryDescription?: (index: number) => void;
  isSeeking?: boolean;
}

export function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}



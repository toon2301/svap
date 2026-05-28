'use client';

import type { OpeningHours } from './skillDescriptionModal/types';

export interface SkillItem {
  id?: number;
  category: string;
  subcategory: string;
  description?: string;
  experience?: { value: number; unit: 'years' | 'months' };
  tags?: string[];
  images?: Array<{ id: number; image_url?: string | null; image?: string | null; order?: number; status?: string | null }>;
  price_from?: number | null;
  price_currency?: string;
  price_negotiable?: boolean;
  district?: string;
  location?: string;
  opening_hours?: OpeningHours;
  is_seeking?: boolean;
  urgency?: 'low' | 'medium' | 'high' | '';
  is_hidden?: boolean;
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
  onModeSwitch?: () => void;
}

export function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}



import type { Offer } from '../profile/profileOffersTypes';
import type { User } from '../../../types';

export type SearchSkill = Offer & {
  created_at?: string;
  updated_at?: string;
  // Meno používateľa pre kompaktné zobrazenie vo vyhľadávaní (pridáva backend)
  user_display_name?: string | null;
  // ID používateľa pre identifikáciu vlastných ponúk
  user_id?: number | null;
};

export interface SearchUserResult {
  id: number;
  display_name: string;
  district?: string | null;
  location?: string | null;
  is_verified: boolean;
  avatar_url?: string | null;
}

export interface SearchResults {
  skills: SearchSkill[];
  users: SearchUserResult[];
}

export interface SearchModuleProps {
  user: User;
}

export interface SkillResultCardProps {
  skill: SearchSkill;
  t: (key: string, fallback?: string) => string;
}

export interface UserResultCardProps {
  user: SearchUserResult;
  t: (key: string, fallback?: string) => string;
}

export interface ScrollableTextProps {
  text: string;
}

export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  showSkills: boolean;
  setShowSkills: (value: boolean) => void;
  showUsers: boolean;
  setShowUsers: (value: boolean) => void;
  offerType: 'all' | 'offer' | 'seeking';
  setOfferType: (value: 'all' | 'offer' | 'seeking') => void;
  onlyMyLocation: boolean;
  setOnlyMyLocation: (value: boolean) => void;
  priceMin: string;
  setPriceMin: (value: string) => void;
  priceMax: string;
  setPriceMax: (value: string) => void;
  onReset: () => void;
  onApply: () => void;
  t: (key: string, fallback?: string) => string;
}


import type { Offer } from '../profile/profileOffersTypes';
import type { User } from '@/types';

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
  // URL slug profilu používateľa (napr. meno.priezvisko-1)
  slug?: string | null;
  district?: string | null;
  location?: string | null;
  is_verified: boolean;
  avatar_url?: string | null;
}

export interface SearchResults {
  skills: SearchSkill[];
  users: SearchUserResult[];
}

// Payload pre zobrazenie profilu používateľa z výsledkov vyhľadávania
export interface SearchModuleProps {
  user: User;
  // Voliteľný callback pri kliknutí na používateľa vo výsledkoch
  onUserClick?: (userId: number, slug?: string | null, summary?: SearchUserResult) => void;
  // Voliteľný callback pri kliknutí na kartu zručnosti (Ponúkam/Hľadám)
  onSkillClick?: (userId: number, skillId: number, slug?: string | null) => void;
  // true ak je SearchModule použitý v ľavom overlay paneli vedľa navigácie
  isOverlay?: boolean;
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


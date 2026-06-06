// User types
export type SubscriptionTier = 'free' | 'premium';

export type EntitlementFeatureKey =
  | 'can_use_verified_badge'
  | 'can_use_priority_ranking';

export type EntitlementLimitKey = 'max_active_cards' | 'monthly_boosts';

export interface UserEntitlements {
  tier: SubscriptionTier;
  is_premium: boolean;
  features: Record<EntitlementFeatureKey, boolean>;
  limits: Record<EntitlementLimitKey, number>;
}

export type MobileOnboardingStep =
  | 'home'
  | 'profile_icon'
  | 'profile_edit'
  | 'edit_form'
  | 'search'
  | 'help_request';
export type MobileOnboardingStatus = 'in_progress' | 'completed' | 'skipped';

export interface MobileOnboardingState {
  version: 1;
  status: MobileOnboardingStatus;
  step: MobileOnboardingStep;
}

export interface User {
  id: number;
  username: string;
  // URL-friendly identifikátor profilu (napr. meno.priezvisko-1)
  slug?: string | null;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'individual' | 'company' | 'school';
  subscription_tier?: SubscriptionTier;
  entitlements?: UserEntitlements;
  phone?: string;
  phone_visible?: boolean;
  contact_email?: string;
  contact_email_visible?: boolean;
  job_title?: string;
  job_title_visible?: boolean;
  bio?: string;
  avatar?: string; // relative or absolute path (writeable)
  avatar_url?: string; // absolute URL for display
  location?: string;
  district?: string;
  ico?: string;
  ico_visible?: boolean;
  company_name?: string;
  website?: string;
  additional_websites?: string[];
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  gender?: string;
  is_verified: boolean;
  is_public: boolean;
  is_favorited?: boolean;
  completed_cooperations_count?: number;
  unread_skill_request_count?: number;
  mobile_onboarding?: MobileOnboardingState;
  created_at: string;
  updated_at: string;
  profile_completeness: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  user_type: 'individual' | 'company' | 'school';
  company_name?: string;
}

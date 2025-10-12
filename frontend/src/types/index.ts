// User types
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'individual' | 'company' | 'school';
  phone?: string;
  bio?: string;
  avatar?: string; // relative or absolute path (writeable)
  avatar_url?: string; // absolute URL for display
  location?: string;
  company_name?: string;
  website?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  gender?: string;
  is_verified: boolean;
  is_public: boolean;
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
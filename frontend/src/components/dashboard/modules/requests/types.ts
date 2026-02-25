export type SkillRequestStatus =
  | 'pending'
  | 'accepted'
  | 'completion_requested'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type SkillRequestUserSummary = {
  id: number;
  display_name?: string | null;
  slug?: string | null;
  avatar_url?: string | null;
};

export type SkillRequestOfferSummary = {
  id: number;
  subcategory: string;
  is_seeking: boolean;
  is_hidden?: boolean;
  price_from: number | null;
  price_currency: string;
  owner?: {
    id: number | null;
    slug?: string | null;
  } | null;
  already_reviewed?: boolean;
};

export type SkillRequest = {
  id: number;
  status: SkillRequestStatus;
  created_at: string;
  updated_at: string;
  requester: number;
  recipient: number;
  offer: number;

  requester_display_name?: string;
  recipient_display_name?: string;

  offer_is_seeking?: boolean;
  offer_is_hidden?: boolean;
  offer_category?: string;
  offer_subcategory?: string;
  offer_description?: string;

  requester_summary?: SkillRequestUserSummary | null;
  recipient_summary?: SkillRequestUserSummary | null;
  offer_summary?: SkillRequestOfferSummary | null;
};

export type SkillRequestsResponse = {
  received: SkillRequest[];
  sent: SkillRequest[];
};



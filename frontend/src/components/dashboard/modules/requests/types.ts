export type SkillRequestStatus =
  | 'pending'
  | 'accepted'
  | 'completion_requested'
  | 'completed'
  | 'terminated'
  | 'cancelled'
  | 'rejected';

export type SkillRequestTerminationReason =
  | 'no_response'
  | 'no_time'
  | 'changed_circumstances'
  | 'could_not_agree'
  | 'communication_issue'
  | 'meeting_not_happened'
  | 'trust_concerns'
  | 'interaction_unavailable'
  | 'other';

export type SkillRequestUserSummary = {
  id: number;
  display_name?: string | null;
  slug?: string | null;
  avatar_url?: string | null;
};

export type SkillRequestOfferSummary = {
  id: number;
  category?: string;
  subcategory: string;
  description?: string;
  is_seeking: boolean;
  is_hidden?: boolean;
  price_from: number | null;
  price_currency: string;
  price_negotiable?: boolean;
  owner?: {
    id: number | null;
    slug?: string | null;
  } | null;
  already_reviewed?: boolean;
  can_review?: boolean;
};

export type SkillRequest = {
  id: number;
  status: SkillRequestStatus;
  created_at: string;
  updated_at: string;
  requester: number;
  recipient: number;
  offer: number;
  proposed_offer?: number | null;
  proposal_description?: string;
  proposal_price_from?: number | string | null;
  proposal_price_currency?: string;
  proposal_price_negotiable?: boolean;
  proposal_experience_value?: number | null;
  proposal_experience_unit?: 'years' | 'months' | '' | null;
  proposal_experience?: {
    value: number;
    unit: 'years' | 'months';
  } | null;
  conversation_id?: number | null;
  conversation_created?: boolean;

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
  proposed_offer_summary?: SkillRequestOfferSummary | null;
  termination?: {
    reason: SkillRequestTerminationReason;
    description: string;
    terminated_by: number | null;
    terminated_by_display_name?: string;
    created_at: string;
  } | null;
};

export type SkillRequestsResponse = {
  received: SkillRequest[];
  sent: SkillRequest[];
};



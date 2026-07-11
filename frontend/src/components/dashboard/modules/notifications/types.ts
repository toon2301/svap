export type NotificationType =
  | 'skill_request'
  | 'skill_request_accepted'
  | 'skill_request_rejected'
  | 'skill_request_completion_requested'
  | 'skill_request_completed'
  | 'skill_request_terminated'
  | 'review_created'
  | 'review_reply_created'
  | 'review_liked'
  | 'offer_liked'
  | 'portfolio_liked'
  | 'profile_liked'
  | 'group_invitation'
  | string;

export interface NotificationActor {
  id: number;
  display_name: string;
  slug?: string | null;
  user_type?: string | null;
  avatar_url?: string | null;
}

export interface DashboardNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  actor: NotificationActor | null;
  skill_request: number | null;
  conversation: number | null;
  group_invitation: number | null;
  target_url: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

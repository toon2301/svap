export type MessagingUserBrief = {
  id: number;
  display_name: string;
  slug?: string | null;
  user_type?: string | null;
  avatar_url?: string | null;
};

export type ConversationListItem = {
  id: number;
  other_user: MessagingUserBrief | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_read_at: string | null;
  has_unread: boolean;
  updated_at: string;
  created?: boolean;
};

export type MessageItem = {
  id: number;
  conversation: number;
  sender: MessagingUserBrief;
  text: string | null;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
};


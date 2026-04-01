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
  last_message_sender_id?: number | null;
  last_read_at: string | null;
  has_unread: boolean;
  unread_count?: number;
  updated_at: string;
  created?: boolean;
  is_draft?: false;
  target_user_id?: number | null;
};

export type ConversationDraft = {
  id: null;
  other_user: MessagingUserBrief | null;
  last_message_preview: null;
  last_message_at: null;
  last_message_sender_id?: null;
  last_read_at: null;
  has_unread: false;
  unread_count: 0;
  updated_at: null;
  created?: boolean;
  is_draft: true;
  target_user_id: number;
};

export type OpenConversationResult = ConversationListItem | ConversationDraft;

export type MessageItem = {
  id: number;
  conversation: number;
  sender: MessagingUserBrief;
  text: string | null;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
};

export type MessageListPage = {
  results: MessageItem[];
  nextPage: number | null;
  previousPage: number | null;
};

export type DirectMessageStartResult = {
  conversation_id: number;
  conversation_created: boolean;
  message: MessageItem;
};

export type MessagingUnreadSummary = {
  count: number;
};


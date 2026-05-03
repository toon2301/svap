export type MessagingUserBrief = {
  id: number;
  display_name: string;
  slug?: string | null;
  user_type?: string | null;
  avatar_url?: string | null;
};

export type GroupMemberCandidate = MessagingUserBrief & {
  presence_status?: 'online' | 'unknown';
};

export type GroupParticipantBrief = MessagingUserBrief & {
  role: 'owner' | 'member';
  status: 'invited' | 'active' | 'left' | 'removed';
};

export type ConversationListItem = {
  id: number;
  other_user: MessagingUserBrief | null;
  is_group?: boolean;
  name?: string;
  avatar_url?: string | null;
  avatar_members?: MessagingUserBrief[];
  participants?: GroupParticipantBrief[];
  participant_count?: number;
  current_user_role?: 'owner' | 'member' | null;
  current_user_status?: 'invited' | 'active' | 'left' | 'removed' | null;
  has_requestable_offers?: boolean;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_sender_id?: number | null;
  last_message_is_deleted?: boolean;
  last_message_has_image?: boolean;
  last_message_type?: 'user' | 'system' | 'group_invitation' | null;
  last_read_at: string | null;
  is_pinned?: boolean;
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
  is_group?: false;
  has_requestable_offers?: boolean;
  last_message_preview: null;
  last_message_at: null;
  last_message_sender_id?: null;
  last_message_is_deleted?: false;
  last_message_has_image?: false;
  last_message_type?: null;
  last_read_at: null;
  is_pinned?: false;
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
  image_url?: string | null;
  has_image?: boolean;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  message_type?: 'user' | 'system' | 'group_invitation';
  metadata?: Record<string, unknown>;
  group_invitation?: GroupInvitationMessage | null;
};

export type GroupInvitationMessage = {
  id: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  invited_user: MessagingUserBrief;
  invited_by: MessagingUserBrief;
  can_respond: boolean;
};

export type MessageListPage = {
  results: MessageItem[];
  nextPage: number | null;
  previousPage: number | null;
  peerLastReadAt: string | null;
  pinnedMessage: MessageItem | null;
};

export type DirectMessageStartResult = {
  conversation_id: number;
  conversation_created: boolean;
  message: MessageItem;
};

export type MessageSendPayload = {
  text?: string;
  image?: File | null;
};

export type MessagingUnreadSummary = {
  count: number;
};

export type DeleteMessageResult = {
  conversation_id: number;
  message: MessageItem;
  conversation_unread_count?: number;
  total_unread_count?: number;
};

export type HideConversationResult = {
  conversation_id: number;
  hidden_at: string | null;
  conversation_unread_count?: number;
  total_unread_count?: number;
};

export type ConversationPinStateResult = {
  conversation_id: number;
  is_pinned: boolean;
};

export type PinMessageResult = {
  conversation_id: number;
  pinned_message: MessageItem | null;
};

export type GroupConversationCreatePayload = {
  name: string;
  invited_user_ids?: number[];
};

export type GroupConversationUpdatePayload = {
  name?: string;
};


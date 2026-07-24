import { api } from '@/lib/api';
import type {
  ConversationPinStateResult,
  ConversationListItem,
  DeleteMessageResult,
  DeleteMessageRequestResult,
  DirectMessageStartResult,
  GroupConversationCreatePayload,
  GroupConversationUpdatePayload,
  GroupMemberCandidate,
  ForwardMessageResult,
  HideConversationResult,
  MessageRequestMutationResult,
  MessageItem,
  MessageListPage,
  MessageSendPayload,
  MessagingUnreadSummary,
  OpenConversationResult,
  OfferShareSendResult,
  PinMessageResult,
  ProfileShareSendResult,
} from './types';

type Paginated<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
  peer_last_read_at?: string | null;
  pinned_message?: MessageItem | null;
  conversation?: ConversationListItem | null;
};

function normalizeConversationSearchQuery(value?: string): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

const conversationsListInFlight = new Map<string, Promise<ConversationListItem[]>>();

function conversationsListRequestKey(search: string): string {
  return `search:${search.length}:${search}`;
}

export async function createGroupConversation(
  payload: GroupConversationCreatePayload,
): Promise<ConversationListItem> {
  const { data } = await api.post<ConversationListItem>(
    '/auth/messaging/conversations/groups/',
    payload,
  );
  return data;
}

export async function updateGroupConversation(
  conversationId: number,
  payload: GroupConversationUpdatePayload,
): Promise<ConversationListItem> {
  const { data } = await api.patch<ConversationListItem>(
    `/auth/messaging/conversations/${conversationId}/group/`,
    payload,
  );
  return data;
}

export async function inviteUserToGroup(conversationId: number, userId: number): Promise<MessageItem> {
  const { data } = await api.post<MessageItem>(
    `/auth/messaging/conversations/${conversationId}/group/invite/`,
    { user_id: userId },
  );
  return data;
}

export async function respondToGroupInvitation(
  invitationId: number,
  action: 'accept' | 'decline',
): Promise<ConversationListItem> {
  const { data } = await api.post<ConversationListItem>(
    `/auth/messaging/group-invitations/${invitationId}/${action}/`,
    {},
  );
  return data;
}

export async function removeGroupMember(conversationId: number, userId: number): Promise<void> {
  await api.delete(`/auth/messaging/conversations/${conversationId}/group/members/${userId}/`);
}

export async function leaveGroup(conversationId: number): Promise<void> {
  await api.post(`/auth/messaging/conversations/${conversationId}/group/leave/`, {});
}

export async function deleteGroupConversation(conversationId: number): Promise<void> {
  await api.delete(`/auth/messaging/conversations/${conversationId}/group/`);
}

export async function listGroupMemberCandidates({
  search,
  conversationId,
}: {
  search?: string;
  conversationId?: number | null;
} = {}): Promise<GroupMemberCandidate[]> {
  const normalizedSearch = normalizeConversationSearchQuery(search);
  const params: Record<string, string | number> = {};
  if (normalizedSearch) {
    params.q = normalizedSearch;
  }
  if (typeof conversationId === 'number') {
    params.conversation_id = conversationId;
  }

  const { data } = await api.get<{ results?: GroupMemberCandidate[] }>(
    '/auth/messaging/conversations/group-member-candidates/',
    Object.keys(params).length > 0 ? { params } : undefined,
  );
  return Array.isArray(data?.results) ? data.results : [];
}

export function getMessagingErrorCode(err: unknown): string | null {
  const code = (err as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
  return typeof code === 'string' ? code : null;
}

export function getMessagingErrorStatus(err: unknown): number | null {
  const status = (err as { response?: { status?: unknown } })?.response?.status;
  return typeof status === 'number' ? status : null;
}

export function getMessagingErrorMessage(
  err: unknown,
  {
    fallback,
    rateLimitFallback,
    unavailableFallback,
    recipientUnavailableFallback,
    requestPendingFallback,
    requestAcceptRequiredFallback,
  }: {
    fallback: string;
    rateLimitFallback?: string;
    unavailableFallback?: string;
    recipientUnavailableFallback?: string;
    requestPendingFallback?: string;
    requestAcceptRequiredFallback?: string;
  },
): string {
  const error = err as {
    response?: {
      status?: number;
      data?: {
        code?: string;
        message?: string;
        error?: string;
        detail?: string;
      };
    };
    message?: string;
  };
  const status = getMessagingErrorStatus(err);
  const code = getMessagingErrorCode(err);
  if (code === 'message_request_pending' && requestPendingFallback) {
    return requestPendingFallback;
  }
  if (code === 'message_request_accept_required' && requestAcceptRequiredFallback) {
    return requestAcceptRequiredFallback;
  }
  // The backend returns this stable code (with 403 or 404) when the pair can no
  // longer interact — kept deliberately neutral so it does not reveal a block.
  if (code === 'recipient_unavailable') {
    return recipientUnavailableFallback || unavailableFallback || fallback;
  }
  const responseMessage =
    (typeof error?.response?.data?.message === 'string' && error.response.data.message) ||
    (typeof error?.response?.data?.error === 'string' && error.response.data.error) ||
    (typeof error?.response?.data?.detail === 'string' && error.response.data.detail) ||
    (typeof error?.message === 'string' && error.message) ||
    null;

  if (status === 429) {
    return responseMessage || rateLimitFallback || fallback;
  }

  if (status === 403 || status === 404) {
    return responseMessage || unavailableFallback || fallback;
  }

  return responseMessage || fallback;
}

export async function openConversation(targetUserId: number): Promise<OpenConversationResult> {
  const { data } = await api.post<OpenConversationResult>('/auth/messaging/conversations/open/', {
    target_user_id: targetUserId,
  });
  return data;
}

export async function sendDirectMessage(
  targetUserId: number,
  payload: string | MessageSendPayload,
): Promise<DirectMessageStartResult> {
  const requestData =
    typeof payload === 'string'
      ? {
          target_user_id: targetUserId,
          text: payload,
        }
      : buildMessageSendRequestData({
          targetUserId,
          text: payload.text,
          image: payload.image,
        });
  const { data } = await api.post<DirectMessageStartResult>(
    '/auth/messaging/conversations/direct/send/',
    requestData,
  );
  return data;
}

export async function listConversations({
  search,
}: {
  search?: string;
} = {}): Promise<ConversationListItem[]> {
  const normalizedSearch = normalizeConversationSearchQuery(search);
  const requestKey = conversationsListRequestKey(normalizedSearch);
  const inFlight = conversationsListInFlight.get(requestKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    const { data } = await api.get<ConversationListItem[] | Paginated<ConversationListItem>>(
      '/auth/messaging/conversations/',
      normalizedSearch ? { params: { search: normalizedSearch } } : undefined,
    );
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as Paginated<ConversationListItem>).results)) {
      return (data as Paginated<ConversationListItem>).results;
    }
    return [];
  })();

  conversationsListInFlight.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (conversationsListInFlight.get(requestKey) === request) {
      conversationsListInFlight.delete(requestKey);
    }
  }
}

export async function listMessageRequests({
  search,
}: {
  search?: string;
} = {}): Promise<ConversationListItem[]> {
  const normalizedSearch = normalizeConversationSearchQuery(search);
  const { data } = await api.get<ConversationListItem[] | Paginated<ConversationListItem>>(
    '/auth/messaging/conversations/requests/',
    normalizedSearch ? { params: { search: normalizedSearch } } : undefined,
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as Paginated<ConversationListItem>).results)) {
    return (data as Paginated<ConversationListItem>).results;
  }
  return [];
}

export async function getUnreadMessagesSummary(): Promise<MessagingUnreadSummary> {
  const { data } = await api.get<MessagingUnreadSummary>(
    '/auth/messaging/conversations/unread-summary/',
  );
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
  };
}

export async function getMessageRequestsUnseenSummary(): Promise<MessagingUnreadSummary> {
  const { data } = await api.get<MessagingUnreadSummary>(
    '/auth/messaging/conversations/requests/unseen-summary/',
  );
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
  };
}

export async function markMessageRequestsSeen(): Promise<MessagingUnreadSummary> {
  const { data } = await api.post<MessagingUnreadSummary>(
    '/auth/messaging/conversations/requests/mark-seen/',
    {},
  );
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
  };
}

function parsePageNumber(url: string | null | undefined): number | null {
  if (!url) return null;

  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://local.invalid');
    const rawPage = parsed.searchParams.get('page');
    if (!rawPage) return null;
    const page = Number.parseInt(rawPage, 10);
    return Number.isFinite(page) && page > 0 ? page : null;
  } catch {
    return null;
  }
}

export async function listMessages(
  conversationId: number,
  pageSize = 100,
  page?: number,
): Promise<MessageListPage> {
  const { data } = await api.get<Paginated<MessageItem>>(
    `/auth/messaging/conversations/${conversationId}/messages/`,
    { params: { page_size: pageSize, ...(typeof page === 'number' ? { page } : {}) } },
  );

  return {
    results: Array.isArray(data?.results) ? data.results : [],
    nextPage: parsePageNumber(data?.next),
    previousPage: parsePageNumber(data?.previous),
    peerLastReadAt: typeof data?.peer_last_read_at === 'string' ? data.peer_last_read_at : null,
    pinnedMessage:
      data?.pinned_message && typeof data.pinned_message === 'object' ? data.pinned_message : null,
    conversation:
      data?.conversation && typeof data.conversation === 'object'
        ? data.conversation
        : null,
  };
}

function buildMessageSendRequestData({
  targetUserId,
  text,
  image,
}: {
  targetUserId?: number;
  text?: string;
  image?: File | null;
}) {
  if (!image) {
    return targetUserId === undefined ? { text: text ?? '' } : { target_user_id: targetUserId, text: text ?? '' };
  }

  const formData = new FormData();
  if (targetUserId !== undefined) {
    formData.append('target_user_id', String(targetUserId));
  }
  formData.append('text', text ?? '');
  formData.append('image', image, image.name);
  return formData;
}

export async function sendMessage(
  conversationId: number,
  payload: string | MessageSendPayload,
): Promise<MessageItem> {
  const requestData =
    typeof payload === 'string'
      ? { text: payload }
      : buildMessageSendRequestData({
          text: payload.text,
          image: payload.image,
        });
  const { data } = await api.post<MessageItem>(
    `/auth/messaging/conversations/${conversationId}/messages/send/`,
    requestData,
  );
  return data;
}

export async function acceptMessageRequest(
  conversationId: number,
): Promise<MessageRequestMutationResult> {
  const { data } = await api.post<MessageRequestMutationResult>(
    `/auth/messaging/conversations/${conversationId}/requests/accept/`,
    {},
  );
  return data;
}

export async function deleteMessageRequest(
  conversationId: number,
): Promise<DeleteMessageRequestResult> {
  const { data } = await api.post<DeleteMessageRequestResult>(
    `/auth/messaging/conversations/${conversationId}/requests/delete/`,
    {},
  );
  return data;
}

export async function deleteMessage(
  conversationId: number,
  messageId: number,
): Promise<DeleteMessageResult> {
  const { data } = await api.post<DeleteMessageResult>(
    `/auth/messaging/conversations/${conversationId}/messages/${messageId}/delete/`,
    {},
  );
  return data;
}

export async function forwardMessage(
  conversationId: number,
  messageId: number,
  recipientUserIds: number[],
): Promise<ForwardMessageResult> {
  const { data } = await api.post<ForwardMessageResult>(
    `/auth/messaging/conversations/${conversationId}/messages/${messageId}/forward/`,
    { recipient_user_ids: recipientUserIds },
  );
  return {
    sent: Array.isArray(data?.sent) ? data.sent : [],
    failed: Array.isArray(data?.failed) ? data.failed : [],
  };
}

export async function sendProfileShare(
  sharedUserId: number,
  recipientUserIds: number[],
): Promise<ProfileShareSendResult> {
  const { data } = await api.post<ProfileShareSendResult>(
    '/auth/messaging/profile-shares/',
    {
      shared_user_id: sharedUserId,
      recipient_user_ids: recipientUserIds,
    },
  );
  return {
    sent: Array.isArray(data?.sent) ? data.sent : [],
    failed: Array.isArray(data?.failed) ? data.failed : [],
  };
}

export async function sendOfferShare(
  sharedOfferId: number,
  recipientUserIds: number[],
): Promise<OfferShareSendResult> {
  const { data } = await api.post<OfferShareSendResult>(
    '/auth/messaging/offer-shares/',
    {
      shared_offer_id: sharedOfferId,
      recipient_user_ids: recipientUserIds,
    },
  );
  return {
    sent: Array.isArray(data?.sent) ? data.sent : [],
    failed: Array.isArray(data?.failed) ? data.failed : [],
  };
}

export async function hideConversation(
  conversationId: number,
): Promise<HideConversationResult> {
  const { data } = await api.post<HideConversationResult>(
    `/auth/messaging/conversations/${conversationId}/hide/`,
    {},
  );
  return data;
}

export async function updateConversationPinnedState(
  conversationId: number,
  isPinned: boolean,
): Promise<ConversationPinStateResult> {
  const { data } = await api.post<ConversationPinStateResult>(
    `/auth/messaging/conversations/${conversationId}/pin-state/`,
    { is_pinned: isPinned },
  );
  return {
    conversation_id: data?.conversation_id ?? conversationId,
    is_pinned: Boolean(data?.is_pinned),
  };
}

export async function updateConversationPinnedMessage(
  conversationId: number,
  messageId: number | null,
): Promise<PinMessageResult> {
  const { data } = await api.post<PinMessageResult>(
    `/auth/messaging/conversations/${conversationId}/pin/`,
    { message_id: messageId },
  );
  return {
    conversation_id: data?.conversation_id ?? conversationId,
    pinned_message:
      data?.pinned_message && typeof data.pinned_message === 'object' ? data.pinned_message : null,
  };
}

export async function markConversationRead(conversationId: number): Promise<{
  conversation_id: number;
  last_read_at: string | null;
  conversation_unread_count?: number;
  total_unread_count?: number;
}> {
  const { data } = await api.post<{
    conversation_id: number;
    last_read_at: string | null;
    conversation_unread_count?: number;
    total_unread_count?: number;
  }>(
    `/auth/messaging/conversations/${conversationId}/read/`,
    {},
  );
  return data;
}

export async function updateMessagingPresence({
  visible,
  activeConversationId,
}: {
  visible: boolean;
  activeConversationId: number | null;
}): Promise<void> {
  await api.post('/auth/messaging/presence/', {
    visible,
    active_conversation_id: visible ? activeConversationId : null,
  });
}

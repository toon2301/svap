import { api } from '@/lib/api';
import type {
  ConversationListItem,
  DirectMessageStartResult,
  MessageItem,
  MessageListPage,
  MessagingUnreadSummary,
  OpenConversationResult,
} from './types';

type Paginated<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
};

export function getMessagingErrorMessage(
  err: unknown,
  {
    fallback,
    rateLimitFallback,
    unavailableFallback,
  }: {
    fallback: string;
    rateLimitFallback?: string;
    unavailableFallback?: string;
  },
): string {
  const error = err as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        error?: string;
        detail?: string;
      };
    };
    message?: string;
  };
  const status = error?.response?.status;
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
  text: string,
): Promise<DirectMessageStartResult> {
  const { data } = await api.post<DirectMessageStartResult>(
    '/auth/messaging/conversations/direct/send/',
    {
      target_user_id: targetUserId,
      text,
    },
  );
  return data;
}

export async function listConversations(): Promise<ConversationListItem[]> {
  const { data } = await api.get<ConversationListItem[] | Paginated<ConversationListItem>>('/auth/messaging/conversations/');
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
  };
}

export async function sendMessage(conversationId: number, text: string): Promise<MessageItem> {
  const { data } = await api.post<MessageItem>(
    `/auth/messaging/conversations/${conversationId}/messages/send/`,
    { text },
  );
  return data;
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


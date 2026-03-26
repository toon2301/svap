import { api } from '@/lib/api';
import type { ConversationListItem, MessageItem } from './types';

type Paginated<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
};

export async function openConversation(targetUserId: number): Promise<ConversationListItem> {
  const { data } = await api.post<ConversationListItem>('/auth/messaging/conversations/open/', {
    target_user_id: targetUserId,
  });
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

export async function listMessages(conversationId: number, pageSize = 100): Promise<MessageItem[]> {
  const { data } = await api.get<Paginated<MessageItem>>(
    `/auth/messaging/conversations/${conversationId}/messages/`,
    { params: { page_size: pageSize } },
  );
  return Array.isArray(data?.results) ? data.results : [];
}

export async function sendMessage(conversationId: number, text: string): Promise<MessageItem> {
  const { data } = await api.post<MessageItem>(
    `/auth/messaging/conversations/${conversationId}/messages/send/`,
    { text },
  );
  return data;
}

export async function markConversationRead(conversationId: number): Promise<{ conversation_id: number; last_read_at: string | null }> {
  const { data } = await api.post<{ conversation_id: number; last_read_at: string | null }>(
    `/auth/messaging/conversations/${conversationId}/read/`,
    {},
  );
  return data;
}


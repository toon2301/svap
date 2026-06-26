'use client';

import type { MessageItem } from './types';

export const MESSAGING_CONVERSATIONS_REFRESH_EVENT = 'messaging:conversations:refresh';
export const MESSAGING_REALTIME_MESSAGE_EVENT = 'messaging:realtime:message';
export const MESSAGING_REALTIME_READ_EVENT = 'messaging:realtime:read';
export const MESSAGING_REALTIME_DELETED_EVENT = 'messaging:realtime:deleted';
export const MESSAGING_REALTIME_PINNED_MESSAGE_EVENT = 'messaging:realtime:pinned-message';
export const MESSAGING_REALTIME_GROUP_EVENT = 'messaging:realtime:group';
export const MESSAGING_REALTIME_RECONNECTED_EVENT = 'messaging:realtime:reconnected';
export const MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT = 'messaging:conversation:actions:open';
export const MESSAGING_CONVERSATION_UNAVAILABLE_EVENT = 'messaging:conversation:unavailable';

const DEFAULT_PASSIVE_REFRESH_SUPPRESSION_MS = 12_000;

let passiveMessagingRefreshSuppressedUntil = 0;

export type MessagingRealtimeMessagePayload = {
  conversationId: number;
  messageId: number;
  senderId: number;
  createdAt: string;
};

export type MessagingRealtimeReadPayload = {
  conversationId: number;
  peerLastReadAt: string;
  readerId?: number;
};

export type MessagingRealtimeDeletedPayload = {
  conversationId: number;
  messageId: number;
  deletedById?: number;
};

export type MessagingRealtimePinnedMessagePayload = {
  conversationId: number;
  pinnedMessage: MessageItem | null;
  actorId?: number;
};

export type MessagingRealtimeGroupPayload = {
  conversationId: number;
  type: string;
};

export type MessagingConversationUnavailablePayload = {
  conversationId: number;
};

export function suppressPassiveMessagingRefresh(durationMs = DEFAULT_PASSIVE_REFRESH_SUPPRESSION_MS): void {
  passiveMessagingRefreshSuppressedUntil = Math.max(
    passiveMessagingRefreshSuppressedUntil,
    Date.now() + Math.max(0, durationMs),
  );
}

export function isPassiveMessagingRefreshSuppressed(): boolean {
  return Date.now() < passiveMessagingRefreshSuppressedUntil;
}

export function clearPassiveMessagingRefreshSuppression(): void {
  passiveMessagingRefreshSuppressedUntil = 0;
}

export function requestConversationsRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MESSAGING_CONVERSATIONS_REFRESH_EVENT));
}

export function dispatchConversationUnavailable(conversationId: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<MessagingConversationUnavailablePayload>(
      MESSAGING_CONVERSATION_UNAVAILABLE_EVENT,
      {
        detail: { conversationId },
      },
    ),
  );
}

export function dispatchMessagingRealtimeMessage(
  payload: MessagingRealtimeMessagePayload,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<MessagingRealtimeMessagePayload>(MESSAGING_REALTIME_MESSAGE_EVENT, {
      detail: payload,
    }),
  );
}

export function dispatchMessagingRealtimeRead(
  payload: MessagingRealtimeReadPayload,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<MessagingRealtimeReadPayload>(MESSAGING_REALTIME_READ_EVENT, {
      detail: payload,
    }),
  );
}

export function dispatchMessagingRealtimeDeleted(
  payload: MessagingRealtimeDeletedPayload,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<MessagingRealtimeDeletedPayload>(MESSAGING_REALTIME_DELETED_EVENT, {
      detail: payload,
    }),
  );
}

export function dispatchMessagingRealtimePinnedMessage(
  payload: MessagingRealtimePinnedMessagePayload,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<MessagingRealtimePinnedMessagePayload>(
      MESSAGING_REALTIME_PINNED_MESSAGE_EVENT,
      {
        detail: payload,
      },
    ),
  );
}

export function dispatchMessagingRealtimeGroup(payload: MessagingRealtimeGroupPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<MessagingRealtimeGroupPayload>(MESSAGING_REALTIME_GROUP_EVENT, {
      detail: payload,
    }),
  );
}

export function requestOpenConversationActions(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT));
}

/**
 * Signalizuje úspešný reconnect WS po výpadku. Otvorená konverzácia naň
 * reaguje okamžitým refreshom (rovnako ako pri focus/visibilitychange), aby sa
 * zachytili správy doručené tesne pred reconnectom (mimo posledného poll cyklu).
 */
export function dispatchMessagingRealtimeReconnected(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MESSAGING_REALTIME_RECONNECTED_EVENT));
}

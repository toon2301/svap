'use client';

export const MESSAGING_CONVERSATIONS_REFRESH_EVENT = 'messaging:conversations:refresh';
export const MESSAGING_REALTIME_MESSAGE_EVENT = 'messaging:realtime:message';

export type MessagingRealtimeMessagePayload = {
  conversationId: number;
  messageId: number;
  senderId: number;
  createdAt: string;
};

export function requestConversationsRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MESSAGING_CONVERSATIONS_REFRESH_EVENT));
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

'use client';

import type { MessageItem } from './types';

export const INITIAL_MESSAGES_PAGE_SIZE = 100;
export const OLDER_MESSAGES_SCROLL_THRESHOLD_PX = 96;

function messageTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareMessagesNewestFirst(a: MessageItem, b: MessageItem): number {
  const timeDelta = messageTimestamp(b.created_at) - messageTimestamp(a.created_at);
  if (timeDelta !== 0) return timeDelta;
  return b.id - a.id;
}

export function mergeMessagesNewestFirst(
  existing: MessageItem[],
  incoming: MessageItem[],
): MessageItem[] {
  const merged = new Map<number, MessageItem>();

  existing.forEach((message) => {
    merged.set(message.id, message);
  });
  incoming.forEach((message) => {
    merged.set(message.id, message);
  });

  return Array.from(merged.values()).sort(compareMessagesNewestFirst);
}

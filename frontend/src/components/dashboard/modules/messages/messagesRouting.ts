export function parseConversationId(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildMessagesUrl(conversationId?: number | null): string {
  const normalizedId =
    typeof conversationId === 'number' && Number.isInteger(conversationId) && conversationId > 0
      ? conversationId
      : null;

  return normalizedId ? `/dashboard/messages?conversationId=${normalizedId}` : '/dashboard/messages';
}

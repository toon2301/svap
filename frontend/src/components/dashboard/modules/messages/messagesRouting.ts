export function parseConversationId(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseTargetUserId(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildMessagesUrl(
  conversationId?: number | null,
  options?: { targetUserId?: number | null },
): string {
  const normalizedId =
    typeof conversationId === 'number' && Number.isInteger(conversationId) && conversationId > 0
      ? conversationId
      : null;

  if (normalizedId) {
    return `/dashboard/messages?conversationId=${normalizedId}`;
  }

  const normalizedTargetId =
    typeof options?.targetUserId === 'number' &&
    Number.isInteger(options.targetUserId) &&
    options.targetUserId > 0
      ? options.targetUserId
      : null;

  return normalizedTargetId
    ? `/dashboard/messages?targetUserId=${normalizedTargetId}`
    : '/dashboard/messages';
}

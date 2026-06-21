import type { MessagingUserBrief } from './types';

type TranslateFn = (key: string, fallback: string) => string;

/**
 * Zjednotené zobrazenie mena používateľa v chate.
 * - anonymizovaný/zmazaný účet (is_deleted) → "Zmazaný používateľ"
 * - prázdne meno → "Používateľ" (zachová existujúce správanie)
 */
export function messagingUserName(
  user: Pick<MessagingUserBrief, 'display_name' | 'is_deleted'> | null | undefined,
  t: TranslateFn,
): string {
  if (user?.is_deleted) {
    return t('messages.deletedUser', 'Zmazaný používateľ');
  }
  const name = (user?.display_name || '').trim();
  return name || t('messages.unknownUser', 'Používateľ');
}

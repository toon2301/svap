type TranslateFn = (key: string, fallback: string) => string;

/**
 * Zmazaný účet je po anonymizácii premenovaný na "deleted-user-<uuid>" a email
 * na "...@deleted.local" (viď backend accounts/account_deletion.py: first/last
 * name sa vyprázdnia, takže display_name spadne na username). Notifikácie a chat
 * detegujú zmazaný účet cez `is_deleted` flag z BE; requests API tento flag
 * nevracia, preto tu detegujeme z ustáleného vzoru mena/emailu (rovnaký vzor).
 */
export function isDeletedUserName(name?: string | null): boolean {
  const n = (name || '').trim().toLowerCase();
  return n.startsWith('deleted-user-') || n.includes('@deleted.local');
}

/**
 * Zjednotené zobrazenie mena druhej strany v žiadostiach:
 * - zmazaný účet → "Zmazaný používateľ" (rovnaký text ako notifikácie/chat),
 * - prázdne meno → "Používateľ" (zachová pôvodné requests.userFallback správanie),
 * - inak surové meno.
 */
export function requestUserName(
  rawName: string | null | undefined,
  t: TranslateFn,
): string {
  if (isDeletedUserName(rawName)) {
    return t('requests.deletedUser', 'Zmazaný používateľ');
  }
  return (rawName || '').trim() || t('requests.userFallback', 'Používateľ');
}

type TranslateFn = (key: string, fallback: string) => string;

// Presný tvar anonymizovaného mena/emailu (backend accounts/account_deletion.py:
// `deleted-user-{uuid4().hex}` prípadne s doménou `@deleted.local`). uuid4().hex
// je práve 32 hex znakov. Kotvíme CELÝ reťazec, aby sa reálne mená ako
// "deleted-user-support" (nie je hex) či "deleted-user-abc@example" (iná doména)
// NEoznačili omylom za zmazaný účet.
const DELETED_USER_PATTERN = /^deleted-user-[0-9a-f]{32}(@deleted\.local)?$/;

/**
 * Zmazaný účet je po anonymizácii premenovaný na "deleted-user-{uuid}" a email
 * na "...@deleted.local" (viď backend accounts/account_deletion.py: first/last
 * name sa vyprázdnia, takže display_name spadne na username). Notifikácie a chat
 * detegujú zmazaný účet cez `is_deleted` flag z BE; requests API tento flag
 * nevracia, preto tu detegujeme z presného ustáleného vzoru mena/emailu.
 */
export function isDeletedUserName(name?: string | null): boolean {
  return DELETED_USER_PATTERN.test((name || '').trim().toLowerCase());
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

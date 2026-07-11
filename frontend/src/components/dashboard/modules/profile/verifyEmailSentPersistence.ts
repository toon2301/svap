'use client';

/**
 * Per-používateľ / per-zariadenie persistencia stavu „verifikačný email odoslaný"
 * (vzor ako seenBadgePersistence.ts). Ukladá timestamp posledného odoslania, aby
 * po navigácii preč/späť alebo refreshi ostala zobrazená hláška „Skontroluj email"
 * namiesto pôvodného tlačidla.
 *
 * TTL (10 min): po ňom sa stav sám vyčistí a používateľ môže odoslať znova
 * z pôvodného tlačidla. Cooldown (60 s): kratšie okno, počas ktorého je tlačidlo
 * „Odoslať znova" zablokované (countdown). Cooldown < TTL, oba sú odvodené z toho
 * istého timestampu.
 */

const KEY_PREFIX = 'swaply:verify-email-sent';

export const VERIFY_EMAIL_SENT_TTL_MS = 10 * 60 * 1000;
export const VERIFY_EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;

function storageKey(userId: number | null): string | null {
  if (userId == null) return null;
  return `${KEY_PREFIX}:${userId}`;
}

/**
 * Vráti timestamp (ms) posledného odoslania, alebo null ak neexistuje / expiroval.
 * Expirovaný záznam rovno odstráni (self-cleanup).
 */
export function loadVerifyEmailSentAt(userId: number | null): number | null {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (Date.now() - value >= VERIFY_EMAIL_SENT_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function saveVerifyEmailSentAt(userId: number | null, sentAt: number): void {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(Math.floor(sentAt)));
  } catch {
    // best-effort – persistencia nesmie zhodiť UI
  }
}

export function clearVerifyEmailSent(userId: number | null): void {
  const key = storageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // best-effort
  }
}

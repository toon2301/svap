'use client';

/**
 * Per-používateľ / per-zariadenie persistencia „videného" baseline pre nav-badge
 * počítadlá v ľavej navigácii (správy, upozornenia).
 *
 * Ukladá LEN acknowledged baseline = koľko neprečítaných položiek už používateľ
 * „videl" vstupom do danej sekcie. Badge zobrazuje `raw - baseline`, takže po
 * vstupe do sekcie zhasne a — vďaka localStorage — sa už neobjaví ani po tvrdom
 * refreshi. NOVÁ položka zvýši `raw` nad baseline → badge sa vráti.
 *
 * ZÁMERNE nemení server read-stav ani per-položkové počítadlá (per-konverzácia
 * badge v zozname, „bold" jednotlivé upozornenia ostávajú do otvorenia položky).
 */

const KEY_PREFIX = 'swaply:seen-badge';

function storageKey(scope: string, userId: number | null): string | null {
  if (userId == null) return null;
  return `${KEY_PREFIX}:${scope}:${userId}`;
}

export function loadSeenBaseline(scope: string, userId: number | null): number | null {
  const key = storageKey(scope, userId);
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
  } catch {
    return null;
  }
}

export function saveSeenBaseline(scope: string, userId: number | null, baseline: number): void {
  const key = storageKey(scope, userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(Math.max(0, Math.floor(baseline))));
  } catch {
    // best-effort – badge persistencia nesmie zhodiť UI
  }
}

'use client';

/**
 * DOČASNÁ DIAGNOSTIKA (vetva 134-diag) – NEZLUČOVAŤ DO main.
 *
 * Zbiera krátke riadky o ceste „udalosť z WebSocketu -> obnova zoznamu upozornení“ a ukazuje ich
 * na obrazovke (NotifDiagOverlay), lebo na iPhone nie je dostupná konzola. Zapisuje len typy udalostí,
 * počty, id a hlavičky odpovede – žiadne texty ani osobné údaje.
 */

const MAX_LINES = 60;
const listeners = new Set<() => void>();
let lines: string[] = [];
let snapshot = '';

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function stamp(): string {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

export function diag(message: string): void {
  if (typeof window === 'undefined') return;
  lines = [...lines, `${stamp()} ${message}`].slice(-MAX_LINES);
  snapshot = lines.join('\n');
  listeners.forEach((listener) => listener());
}

export function subscribeDiag(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDiagSnapshot(): string {
  return snapshot;
}

/** Posledný záznam o načítaní zoznamu z Resource Timing: `transferSize` 0 pri neprázdnom tele = z cache. */
export function lastListResourceInfo(): string {
  try {
    const entries = performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/auth/notifications/') && !entry.name.includes('unread'));
    const entry = entries[entries.length - 1] as PerformanceResourceTiming | undefined;
    if (!entry) return 'perf=none';
    return `perf transfer=${entry.transferSize} body=${entry.encodedBodySize} dur=${Math.round(entry.duration)}ms`;
  } catch {
    return 'perf=err';
  }
}

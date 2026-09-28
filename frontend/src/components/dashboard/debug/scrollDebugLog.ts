'use client';

/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Záznam ladiaceho pásika scrollu: zapnutie cez adresu, kruhový buffer
 * v sessionStorage a externý store, z ktorého číta panel.
 *
 * Zapnutie sa drží v sessionStorage – appka si adresu priebežne prepisuje,
 * takže `?debugscroll=1` by po prvom prechode zmizol. Záznam prežije reload
 * (aj stránka, ktorá sa pri chybe znovu načíta, ostane zdokumentovaná).
 *
 * Počas 4 s okna po kliku sa panel neprekresľuje a nič sa neukladá – render
 * panela ani zápis do úložiska nesmú meniť časovanie meraného prechodu.
 * Všetko dobehne na konci okna.
 */

export const SCROLL_DEBUG_FLAG_KEY = 'svaply.debugscroll';
export const SCROLL_DEBUG_LOG_KEY = 'svaply.debugscroll.log';
export const SCROLL_DEBUG_MAX_LINES = 300;
const MAX_LINE_LENGTH = 240;
const PERSIST_DEBOUNCE_MS = 500;

let lines: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

let held = false;
let notifyPending = false;
let notifyQueued = false;
let persistDirty = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

let clickNo = 0;
let clickAt: number | null = null;

function sessionStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Prečíta `?debugscroll=1|0` a stav uloží; bez parametra platí uložený stav.
 * Vracia, či je pásik zapnutý.
 */
export function resolveScrollDebugFlag(search: string = typeof window === 'undefined' ? '' : window.location.search): boolean {
  const param = new URLSearchParams(search).get('debugscroll');
  const store = sessionStore();
  try {
    if (param === '1') store?.setItem(SCROLL_DEBUG_FLAG_KEY, '1');
  } catch {
    // Úložisko nedostupné (súkromný režim) – platí aspoň parameter.
  }
  if (param === '1') return true;
  if (param === '0') {
    // Vypnutie zmaže príznak aj záznam – v pamäti, v úložisku aj čakajúce uloženie.
    forgetScrollDebug();
    return false;
  }
  try {
    return store?.getItem(SCROLL_DEBUG_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Príznak len podľa sessionStorage, bez adresy – pre stránku obnovenú
 * z bfcache, ktorej adresa je stará. Nedostupné úložisko nič nedokazuje,
 * vtedy platí zapnuté.
 */
export function isScrollDebugFlagStored(): boolean {
  try {
    const store = sessionStore();
    return store ? store.getItem(SCROLL_DEBUG_FLAG_KEY) === '1' : true;
  } catch {
    return true;
  }
}

/** Čas pre všetky záznamy – rovnaká os ako rAF, Resource Timing aj hooky. */
export function debugNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/** Nový klik = nové číslo Cn; od neho sa počítajú časy ďalších riadkov. */
export function startDebugClick(t: number = debugNow()): number {
  clickNo += 1;
  clickAt = t;
  return clickNo;
}

export function currentDebugClick(): { n: number; at: number | null } {
  return { n: clickNo, at: clickAt };
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = sessionStore()?.getItem(SCROLL_DEBUG_LOG_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      lines = parsed.filter((line): line is string => typeof line === 'string').slice(-SCROLL_DEBUG_MAX_LINES);
    }
  } catch {
    lines = [];
  }
}

function notifyNow(): void {
  notifyPending = false;
  listeners.forEach((listener) => listener());
}

function scheduleNotify(): void {
  if (held) {
    notifyPending = true;
    return;
  }
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    if (held) notifyPending = true;
    else notifyNow();
  });
}

/** Okamžite zapíše záznam do sessionStorage (pagehide, skrytie stránky, Vymazať). */
export function flushScrollDebugLog(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  persistDirty = false;
  try {
    sessionStore()?.setItem(SCROLL_DEBUG_LOG_KEY, JSON.stringify(lines));
  } catch {
    // Plné/nedostupné úložisko – záznam ostane aspoň v pamäti.
  }
}

function schedulePersist(): void {
  persistDirty = true;
  if (held || persistTimer) return;
  persistTimer = setTimeout(flushScrollDebugLog, PERSIST_DEBOUNCE_MS);
}

/**
 * Počas okna po kliku zadrží prekreslenie panela aj ukladanie; potom dobehnú.
 *
 * Už nabitý časovač ukladania sa ruší – riadok CLICK ho nabije ešte pred
 * vstupom do okna a zápis do sessionStorage by padol doprostred merania.
 * `persistDirty` ostáva, takže sa uloží po okne.
 */
export function holdScrollDebugOutput(hold: boolean): void {
  held = hold;
  if (hold) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = null;
    return;
  }
  if (notifyPending) scheduleNotify();
  if (persistDirty) schedulePersist();
}

function append(newLines: string[]): void {
  ensureLoaded();
  const next = lines.concat(newLines.map((line) => line.slice(0, MAX_LINE_LENGTH)));
  lines = next.length > SCROLL_DEBUG_MAX_LINES ? next.slice(next.length - SCROLL_DEBUG_MAX_LINES) : next;
  schedulePersist();
  scheduleNotify();
}

/** Riadok s predponou `Cn +ms` (čas od posledného kliku; pred prvým od štartu stránky). */
export function logDebugLine(text: string, t: number = debugNow()): void {
  append([`C${clickNo} +${Math.round(t - (clickAt ?? 0))} ${text}`]);
}

/** Riadok bez predpony – hlavička štartu stránky. */
export function logDebugRaw(text: string): void {
  append([text]);
}

export function clearScrollDebugLog(): void {
  lines = [];
  loaded = true;
  flushScrollDebugLog();
  scheduleNotify();
}

/** Koniec ladenia: záznam aj príznak zmiznú z pamäte aj zo sessionStorage. */
export function forgetScrollDebug(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  persistDirty = false;
  lines = [];
  loaded = true;
  try {
    sessionStore()?.removeItem(SCROLL_DEBUG_LOG_KEY);
    sessionStore()?.removeItem(SCROLL_DEBUG_FLAG_KEY);
  } catch {
    // úložisko nedostupné – v pamäti je záznam aj tak preč
  }
  scheduleNotify();
}

export function subscribeScrollDebugLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snímka pre `useSyncExternalStore` – rovnaká referencia, kým nepribudne riadok. */
export function getScrollDebugLines(): string[] {
  ensureLoaded();
  return lines;
}

const EMPTY: string[] = [];
export function getServerScrollDebugLines(): string[] {
  return EMPTY;
}

/** Text pre Kopírovať: hlavička, prostredie aktuálnej stránky a celý záznam. */
export function formatScrollDebugCopy(
  environment: string,
  all: string[] = getScrollDebugLines(),
  isoNow: string = new Date().toISOString(),
): string {
  return [`debugscroll · ${isoNow} · riadkov: ${all.length}`, environment, ...all].join('\n');
}

/** Len pre testy – vyčistí stav v pamäti; `keepStorage` simuluje reload. */
export function resetScrollDebugLogForTests({ keepStorage = false }: { keepStorage?: boolean } = {}): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  lines = [];
  loaded = false;
  listeners.clear();
  held = false;
  notifyPending = false;
  notifyQueued = false;
  persistDirty = false;
  clickNo = 0;
  clickAt = null;
  if (!keepStorage) {
    try {
      sessionStore()?.removeItem(SCROLL_DEBUG_LOG_KEY);
    } catch {
      // nič
    }
  }
}

'use client';

import { getCurrentAccountId } from '@/lib/currentAccount';

export const SEARCH_SCROLL_HISTORY_KEY = '__svaplySearchScroll';
export const SEARCH_SCROLL_STORAGE_KEY = 'svaplySearchScrollV1';
export const SEARCH_SCROLL_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 10;

export type SearchScrollSnapshot = {
  id: string;
  viewerId: number;
  url: string;
  top: number;
  savedAt: number;
};

let memory: SearchScrollSnapshot[] = [];
let memoryIsAuthoritative = false;
let abandonedIds: string[] = [];
let carried: { id: string; url: string } | null = null;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

/** Keep every URL filter, tab and page isolated, without putting results into storage. */
function currentSearchUrl(): string | null {
  return window.location.pathname === '/search'
    ? `${window.location.pathname}${window.location.search}${window.location.hash}` : null;
}

function entryId(state: unknown): string | null {
  const marker = record(record(state)[SEARCH_SCROLL_HISTORY_KEY]);
  return marker.version === 1 && typeof marker.id === 'string' && marker.id.length < 100
    ? marker.id : null;
}

function validSnapshot(value: unknown): value is SearchScrollSnapshot {
  const item = record(value);
  return typeof item.id === 'string' && item.id.length > 0 && item.id.length < 100
    && typeof item.viewerId === 'number' && Number.isInteger(item.viewerId) && item.viewerId > 0
    && typeof item.url === 'string' && /^\/search(?:[?#]|$)/.test(item.url) && item.url.length <= 4096
    && typeof item.top === 'number' && Number.isFinite(item.top) && item.top >= 0
    && typeof item.savedAt === 'number' && item.savedAt <= Date.now()
    && Date.now() - item.savedAt < SEARCH_SCROLL_TTL_MS;
}

function snapshots(): SearchScrollSnapshot[] {
  let stored: unknown = [];
  try {
    if (!memoryIsAuthoritative) {
      stored = JSON.parse(window.sessionStorage.getItem(SEARCH_SCROLL_STORAGE_KEY) || '[]');
    }
  } catch { /* Private mode or corrupt storage must not break navigation. */ }
  const entries = [...memory, ...(Array.isArray(stored) ? stored : [])]
    .filter(validSnapshot).filter((item) => !abandonedIds.includes(item.id));
  return Array.from(new Map(entries.map((item) => [item.id, item])).values())
    .sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_ENTRIES);
}

function save(entries: SearchScrollSnapshot[]): void {
  memory = entries;
  try {
    window.sessionStorage.setItem(SEARCH_SCROLL_STORAGE_KEY, JSON.stringify(entries));
    memoryIsAuthoritative = false;
  } catch {
    // A readable but unwritable store can contain abandoned entries: do not merge them back.
    memoryIsAuthoritative = true;
  }
}

/** Capture before push: a later unmount may already belong to the profile history entry. */
export function rememberSearchScroll(): string | undefined {
  if (typeof window === 'undefined') return;
  const url = currentSearchUrl();
  const viewerId = getCurrentAccountId();
  const main = document.querySelector<HTMLElement>('[data-search-scroll-root]');
  if (!url || url.length > 4096 || !viewerId || !Number.isInteger(viewerId) || !main) return;
  const top = Math.max(0, Math.round(main.scrollTop));
  if (!Number.isFinite(top)) return;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    window.history.replaceState({
      ...record(window.history.state),
      [SEARCH_SCROLL_HISTORY_KEY]: { version: 1, id },
    }, '', window.location.href);
  } catch { return; }
  save([{ id, viewerId, url, top, savedAt: Date.now() }, ...snapshots()].slice(0, MAX_ENTRIES));
  return id;
}

/** A module listener preserves popstate metadata if Next replaces state before mounting. */
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    const id = entryId(event.state);
    const url = currentSearchUrl();
    carried = id && url ? { id, url } : null;
  }, true);
}

/** Unknown/auth-changing viewers cannot consume another account's pending scroll. */
export function readSearchScroll(viewerId: number | null | undefined): SearchScrollSnapshot | null {
  if (typeof window === 'undefined' || !viewerId || !Number.isInteger(viewerId) || viewerId < 0) return null;
  const url = currentSearchUrl();
  const carriedId = carried?.url === url ? carried.id : null;
  // A known viewer has reached this entry: discard the transient handoff even if ownership mismatches.
  carried = null;
  if (!url) return null;
  const currentId = entryId(window.history.state);
  const id = currentId ?? carriedId;
  const snapshot = snapshots().find((item) => item.id === id && item.url === url && item.viewerId === viewerId) ?? null;
  if (snapshot && !currentId) {
    // Adopt the popstate marker into this actual entry once; never lend it to a fresh same-URL push.
    try {
      window.history.replaceState({
        ...record(window.history.state),
        [SEARCH_SCROLL_HISTORY_KEY]: { version: 1, id: snapshot.id },
      }, '', window.location.href);
    } catch { /* This attempt can still restore; a later fresh entry must not borrow it. */ }
  }
  return snapshot;
}

/** Abandon only this attempt; an older cleanup must never remove a newer capture. */
export function forgetSearchScroll(id: string): void {
  if (typeof window === 'undefined') return;
  abandonedIds = [id, ...abandonedIds].slice(0, MAX_ENTRIES);
  save(snapshots().filter((item) => item.id !== id));
  if (carried?.id === id) carried = null;
}

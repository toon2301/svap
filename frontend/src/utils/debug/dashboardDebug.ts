'use client';

export type DashboardDebugPayload = Record<string, unknown>;

export interface DashboardDebugEntry {
  timestamp: string;
  event: string;
  path: string;
  payload: DashboardDebugPayload;
}

const STORAGE_KEY = '__dashboard_debug_log__';
const MAX_ENTRIES = 200;

declare global {
  interface Window {
    __dashboardDebug?: {
      getLog: () => DashboardDebugEntry[];
      clear: () => void;
    };
  }
}

function shouldDebug(): boolean {
  return typeof window !== 'undefined' && process.env.NODE_ENV !== 'production';
}

function readLog(): DashboardDebugEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entries: DashboardDebugEntry[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // ignore debug storage failures
  }
}

function ensureWindowApi(): void {
  if (typeof window === 'undefined' || window.__dashboardDebug) return;

  window.__dashboardDebug = {
    getLog: () => readLog(),
    clear: () => writeLog([]),
  };
}

export function dashboardDebug(event: string, payload: DashboardDebugPayload = {}): void {
  if (!shouldDebug()) return;

  ensureWindowApi();

  const entry: DashboardDebugEntry = {
    timestamp: new Date().toISOString(),
    event,
    path: `${window.location.pathname}${window.location.search}`,
    payload,
  };

  const entries = readLog();
  entries.push(entry);
  writeLog(entries);

  console.log('[dashboard-debug]', entry);
}

export function clearDashboardDebugLog(): void {
  if (!shouldDebug()) return;
  ensureWindowApi();
  writeLog([]);
}

'use client';

export type DashboardDebugPayload = Record<string, unknown>;

export interface DashboardDebugEntry {
  timestamp: string;
  event: string;
  path: string;
  payload: DashboardDebugPayload;
}

const STORAGE_KEY = '__dashboard_debug_log__';
const ENABLED_KEY = '__dashboard_debug_enabled__';
const MAX_ENTRIES = 200;
const QUERY_PARAM = 'dashboardDebug';

type DashboardDebugApi = {
  getLog: () => DashboardDebugEntry[];
  clear: () => void;
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
};

declare global {
  interface Window {
    __dashboardDebug?: DashboardDebugApi;
  }
}

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function readEnabledFlag(): boolean {
  if (!hasWindow()) return false;

  try {
    return window.sessionStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeEnabledFlag(enabled: boolean): void {
  if (!hasWindow()) return;

  try {
    if (enabled) {
      window.sessionStorage.setItem(ENABLED_KEY, '1');
    } else {
      window.sessionStorage.removeItem(ENABLED_KEY);
    }
  } catch {
    // ignore debug storage failures
  }
}

function syncEnabledFlagFromQueryParam(): void {
  if (!hasWindow()) return;

  try {
    const raw = new URLSearchParams(window.location.search).get(QUERY_PARAM);
    if (!raw) return;

    const normalized = raw.trim().toLowerCase();
    if (['1', 'true', 'on', 'enable', 'enabled'].includes(normalized)) {
      writeEnabledFlag(true);
      return;
    }

    if (['0', 'false', 'off', 'disable', 'disabled'].includes(normalized)) {
      writeEnabledFlag(false);
    }
  } catch {
    // ignore malformed search params
  }
}

export function isDashboardDebugEnabled(): boolean {
  initializeDashboardDebug();
  return hasWindow() && (process.env.NODE_ENV !== 'production' || readEnabledFlag());
}

function readLog(): DashboardDebugEntry[] {
  if (!hasWindow()) return [];

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
  if (!hasWindow()) return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // ignore debug storage failures
  }
}

function ensureWindowApi(): void {
  if (!hasWindow() || window.__dashboardDebug) return;

  window.__dashboardDebug = {
    getLog: () => readLog(),
    clear: () => writeLog([]),
    enable: () => writeEnabledFlag(true),
    disable: () => writeEnabledFlag(false),
    isEnabled: () => isDashboardDebugEnabled(),
  };
}

function initializeDashboardDebug(): void {
  if (!hasWindow()) return;

  syncEnabledFlagFromQueryParam();
  ensureWindowApi();
}

export function isDashboardDebugOptInEnabled(): boolean {
  initializeDashboardDebug();
  return hasWindow() && readEnabledFlag();
}

export function dashboardDebug(event: string, payload: DashboardDebugPayload = {}): void {
  initializeDashboardDebug();
  if (!isDashboardDebugEnabled()) return;

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
  initializeDashboardDebug();
  writeLog([]);
}

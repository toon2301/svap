'use client';

import type { ErrorInfo } from 'react';

type DebugPrimitive = string | number | boolean | null;
type DebugPayload =
  | DebugPrimitive
  | DebugPayload[]
  | {
      [key: string]: DebugPayload;
    };

export interface ErrorDebugBreadcrumb {
  timestamp: string;
  event: string;
  route: string;
  payload: Record<string, DebugPayload>;
}

export interface ErrorDebugReport {
  capturedAt: string;
  route: string;
  errorName: string;
  errorMessage: string;
  errorStack: string | null;
  componentStack: string | null;
  breadcrumbs: ErrorDebugBreadcrumb[];
}

type ErrorDebugApi = {
  clear: () => void;
  getBreadcrumbs: () => ErrorDebugBreadcrumb[];
  getReport: () => ErrorDebugReport | null;
  isEnabled: () => boolean;
};

declare global {
  interface Window {
    __errorDebug?: ErrorDebugApi;
  }
}

const ENABLED_KEY = '__error_debug_enabled__';
const BREADCRUMBS_KEY = '__error_debug_breadcrumbs__';
const REPORT_KEY = '__error_debug_report__';
const MAX_BREADCRUMBS = 40;
const QUERY_PARAM = 'errorDebug';

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

function sanitizePathname(pathname: string): string {
  return pathname
    .replace(/(\/dashboard\/users\/)[^/?#]+/g, '$1[identifier]')
    .replace(/(\/dashboard\/offers\/)[^/?#]+(\/reviews)/g, '$1[offerId]$2');
}

function sanitizeSearch(search: string): string {
  if (!search) return '';

  try {
    const params = new URLSearchParams(search);
    if (Array.from(params.keys()).length === 0) return '';

    const sanitized = new URLSearchParams();
    params.forEach((_value, key) => {
      sanitized.set(key, '*');
    });

    const next = sanitized.toString();
    return next ? `?${next}` : '';
  } catch {
    return '';
  }
}

function getCurrentRoute(): string {
  if (!hasWindow()) return '';
  return `${sanitizePathname(window.location.pathname)}${sanitizeSearch(window.location.search)}`;
}

function sanitizeString(value: string): string {
  return value.length > 400 ? `${value.slice(0, 400)}...` : value;
}

function sanitizePayloadValue(value: unknown, depth = 0): DebugPayload {
  if (value == null) return null;
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return sanitizeString(value);

  if (Array.isArray(value)) {
    if (depth >= 2) return value.length;
    return value.slice(0, 10).map((item) => sanitizePayloadValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= 2) return '[object]';

    const result: Record<string, DebugPayload> = {};
    Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .forEach(([key, nestedValue]) => {
        result[key] = sanitizePayloadValue(nestedValue, depth + 1);
      });
    return result;
  }

  return String(value);
}

function readBreadcrumbs(): ErrorDebugBreadcrumb[] {
  if (!hasWindow()) return [];

  try {
    const raw = window.sessionStorage.getItem(BREADCRUMBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBreadcrumbs(breadcrumbs: ErrorDebugBreadcrumb[]): void {
  if (!hasWindow()) return;

  try {
    window.sessionStorage.setItem(BREADCRUMBS_KEY, JSON.stringify(breadcrumbs.slice(-MAX_BREADCRUMBS)));
  } catch {
    // ignore debug storage failures
  }
}

function readReport(): ErrorDebugReport | null {
  if (!hasWindow()) return null;

  try {
    const raw = window.sessionStorage.getItem(REPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ErrorDebugReport) : null;
  } catch {
    return null;
  }
}

function writeReport(report: ErrorDebugReport | null): void {
  if (!hasWindow()) return;

  try {
    if (!report) {
      window.sessionStorage.removeItem(REPORT_KEY);
      return;
    }
    window.sessionStorage.setItem(REPORT_KEY, JSON.stringify(report));
  } catch {
    // ignore debug storage failures
  }
}

function ensureWindowApi(): void {
  if (!hasWindow() || window.__errorDebug) return;

  window.__errorDebug = {
    clear: () => clearErrorDebugData(),
    getBreadcrumbs: () => readBreadcrumbs(),
    getReport: () => readReport(),
    isEnabled: () => isErrorDebugEnabled(),
  };
}

export function initializeErrorDebug(): void {
  if (!hasWindow()) return;

  syncEnabledFlagFromQueryParam();
  ensureWindowApi();
}

export function isErrorDebugOptInEnabled(): boolean {
  initializeErrorDebug();
  return hasWindow() && readEnabledFlag();
}

export function isErrorDebugEnabled(): boolean {
  initializeErrorDebug();
  return hasWindow() && (process.env.NODE_ENV === 'development' || readEnabledFlag());
}

export function pushErrorDebugBreadcrumb(
  event: string,
  payload: Record<string, unknown> = {},
): void {
  initializeErrorDebug();
  if (!isErrorDebugEnabled()) return;

  const breadcrumbs = readBreadcrumbs();
  breadcrumbs.push({
    timestamp: new Date().toISOString(),
    event,
    route: getCurrentRoute(),
    payload: sanitizePayloadValue(payload) as Record<string, DebugPayload>,
  });
  writeBreadcrumbs(breadcrumbs);
}

export function captureErrorDebugReport(
  error: Error,
  errorInfo?: ErrorInfo,
): ErrorDebugReport | null {
  initializeErrorDebug();
  if (!isErrorDebugEnabled()) return null;

  const report: ErrorDebugReport = {
    capturedAt: new Date().toISOString(),
    route: getCurrentRoute(),
    errorName: error.name || 'Error',
    errorMessage: error.message || 'Unknown error',
    errorStack: error.stack ?? null,
    componentStack: errorInfo?.componentStack ?? null,
    breadcrumbs: readBreadcrumbs(),
  };

  writeReport(report);
  return report;
}

export function getErrorDebugReport(): ErrorDebugReport | null {
  initializeErrorDebug();
  return readReport();
}

export function formatErrorDebugReport(report: ErrorDebugReport | null): string {
  if (!report) return '';
  return JSON.stringify(report, null, 2);
}

export function clearErrorDebugData(): void {
  initializeErrorDebug();
  writeBreadcrumbs([]);
  writeReport(null);
}

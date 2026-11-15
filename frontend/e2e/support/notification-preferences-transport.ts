import type { Page } from '@playwright/test';
import {
  NOTIFICATION_PREFERENCE_KEYS, type NotificationPreferences, type PreferenceTransport,
} from './notification-preferences-roundtrip';

/**
 * Skutočný same-origin fetch z izolovanej stránky. Cookie a CSRF ostávajú v
 * prehliadači; do Node sa vráti iba HTTP stav a sedem validovaných booleanov.
 */
export function notificationPreferencesTransport(page: Page, timeoutMs: number): PreferenceTransport {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('API skúška vyžaduje pôvodný konečný actionTimeout.');
  return async (method, values) => {
    const keys = values ? Object.keys(values) : [];
    if (!['GET', 'PATCH'].includes(method) || (method === 'GET' && values !== undefined)
      || (method === 'PATCH' && (!keys.length || keys.some(key => !NOTIFICATION_PREFERENCE_KEYS.includes(key as typeof NOTIFICATION_PREFERENCE_KEYS[number])
        || typeof values?.[key as keyof NotificationPreferences] !== 'boolean')))) {
      throw new Error('Neplatný vstup transportu volieb.');
    }
    try {
      return await page.evaluate(async ({ method, values, timeoutMs, allowedKeys }) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          const headers: Record<string, string> = {};
          if (method === 'PATCH') {
            const cookie = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1];
            if (!cookie) return { status: 0, data: null };
            headers['X-CSRFToken'] = decodeURIComponent(cookie);
            headers['Content-Type'] = 'application/json';
          }
          const response = await fetch('/api/auth/push/preferences/', {
            method, credentials: 'include', headers, signal: controller.signal, redirect: 'error', cache: 'no-store',
            body: method === 'PATCH' ? JSON.stringify(values) : undefined,
          });
          if (response.status !== 200) return { status: response.status, data: null };
          const raw = await response.json().catch(() => null);
          const valid = raw && typeof raw === 'object' && !Array.isArray(raw)
            && allowedKeys.every(key => Object.prototype.hasOwnProperty.call(raw, key) && typeof raw[key] === 'boolean');
          const data = valid ? Object.fromEntries(allowedKeys.map(key => [key, raw[key]])) : null;
          return { status: response.status, data };
        } catch { return { status: 0, data: null }; }
        finally { window.clearTimeout(timer); }
      }, { method, values, timeoutMs, allowedKeys: [...NOTIFICATION_PREFERENCE_KEYS] });
    } catch { throw new Error(`Prehliadač nedokončil ${method} volieb.`); }
  };
}

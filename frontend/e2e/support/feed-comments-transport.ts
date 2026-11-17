import type { Page } from '@playwright/test';
import { POSTS_PATH, type CommentTransport } from './feed-comments-session';

/** Len vybrané polia vlastného podkladu a počty zhôd; cookies a cudzie komentáre neopustia stránku. */
export function feedCommentsTransport(page: Page, timeoutMs: number): CommentTransport {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Chýba konečný actionTimeout komentárovej skúšky.');
  return async (method, path, body, expected) => {
    if (!/^\/api\/auth\/feed\/posts\/(?:\d+\/(?:comments\/)?)?$/.test(path)
      || !['GET', 'POST', 'DELETE'].includes(method) || (method === 'POST' && path !== POSTS_PATH)) {
      throw new Error('Transport odmietol nepovolenú cestu alebo metódu.');
    }
    try {
      return await page.evaluate(async ({ method, path, body, expected, timeoutMs }) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          const headers: Record<string, string> = {};
          if (method !== 'GET') {
            const csrf = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1];
            if (!csrf) return { status: 0, data: null };
            headers['X-CSRFToken'] = decodeURIComponent(csrf); headers['Content-Type'] = 'application/json';
          }
          const response = await fetch(path, { method, credentials: 'include', headers, cache: 'no-store', redirect: 'error',
            signal: controller.signal, body: body === undefined ? undefined : JSON.stringify(body) });
          if (![200, 201].includes(response.status)) return { status: response.status, data: null };
          const raw = await response.json().catch(() => null);
          if (expected) {
            const valid = raw && typeof raw === 'object' && Array.isArray(raw.results);
            const matches = valid ? raw.results.filter((item: { text?: unknown }) => item?.text === expected.text) : [];
            return { status: response.status, data: { contractValid: Boolean(valid), matchedCount: matches.length,
              matchedExpectedId: matches.some((item: { id?: unknown }) => item.id === expected.id) } };
          }
          const valid = raw && typeof raw === 'object' && !Array.isArray(raw);
          return { status: response.status, data: valid ? { id: raw.id, caption: raw.caption, can_manage: raw.can_manage } : null };
        } catch { return { status: 0, data: null }; }
        finally { window.clearTimeout(timer); }
      }, { method, path, body, expected, timeoutMs });
    } catch { throw new Error(`Prehliadač nedokončil ${method} komentárovej skúšky.`); }
  };
}

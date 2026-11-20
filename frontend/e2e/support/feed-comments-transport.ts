import type { Page } from '@playwright/test';
import { POSTS_PATH, type CommentTransport } from './feed-comments-session';

/** Len vybrané polia vlastného podkladu a počty zhôd; cookies a cudzie komentáre neopustia stránku. */
export function feedCommentsTransport(page: Page, timeoutMs: number, includeCaption = true): CommentTransport {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Chýba konečný actionTimeout komentárovej skúšky.');
  return async (method, path, body, expected) => {
    if (!/^\/api\/auth\/feed\/posts\/(?:\d+\/(?:comments\/(?:\d+\/)?)?)?$/.test(path)
      || !['GET', 'POST', 'DELETE'].includes(method) || (method === 'POST' && path !== POSTS_PATH)
      || (method === 'DELETE' && !/^\/api\/auth\/feed\/posts\/\d+\/(?:comments\/\d+\/)?$/.test(path))) {
      throw new Error('Transport odmietol nepovolenú cestu alebo metódu.');
    }
    try {
      return await page.evaluate(async ({ method, path, body, expected, timeoutMs, includeCaption }) => {
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
          if (method === 'GET' && path === '/api/auth/feed/posts/') {
            const valid = raw && Array.isArray(raw.results);
            return { status: response.status, data: valid ? { candidates: raw.results.flatMap((post: {
              id?: unknown; can_manage?: unknown; post_type?: unknown; images?: Array<{ thumbnail_url?: unknown; large_url?: unknown }>;
              comments_count?: unknown;
            }, index: number) => post?.can_manage === true && post.post_type === 'free_post'
              && Number.isSafeInteger(post.id) && Number(post.id) > 0 && typeof post.comments_count === 'number'
              && post.comments_count >= 3 && Array.isArray(post.images)
              && post.images.some(photo => typeof photo?.thumbnail_url === 'string' && photo.thumbnail_url.length > 0
                || typeof photo?.large_url === 'string' && photo.large_url.length > 0)
              ? [{ id: post.id, index }] : []) } : null };
          }
          if (method === 'GET' && path.endsWith('/comments/') && !expected) {
            return { status: response.status, data: { rootCount: Array.isArray(raw?.results) ? raw.results.length : null } };
          }
          if (expected) {
            const valid = raw && typeof raw === 'object' && Array.isArray(raw.results);
            const matches = valid ? raw.results.filter((item: { text?: unknown }) => item?.text === expected.text) : [];
            const owned = matches.filter((item: { id?: unknown; can_edit?: unknown; can_delete?: unknown }) =>
              Number.isSafeInteger(item.id) && Number(item.id) > 0 && item.can_edit === true && item.can_delete === true);
            return { status: response.status, data: { contractValid: Boolean(valid), matchedCount: matches.length,
              matchedExpectedId: matches.some((item: { id?: unknown }) => item.id === expected.id),
              matchedOwnedExpectedId: owned.some((item: { id?: unknown }) => item.id === expected.id),
              ownedMatchId: matches.length === 1 && owned.length === 1 ? owned[0].id : null } };
          }
          const valid = raw && typeof raw === 'object' && !Array.isArray(raw);
          return { status: response.status, data: valid ? { id: raw.id, ...(includeCaption ? { caption: raw.caption } : {}), can_manage: raw.can_manage,
            hasPhoto: Array.isArray(raw.images) && raw.images.some((photo: { thumbnail_url?: unknown; large_url?: unknown }) =>
              typeof photo?.thumbnail_url === 'string' && photo.thumbnail_url.length > 0
              || typeof photo?.large_url === 'string' && photo.large_url.length > 0), commentsCount: raw.comments_count } : null };
        } catch { return { status: 0, data: null }; }
        finally { window.clearTimeout(timer); }
      }, { method, path, body, expected, timeoutMs, includeCaption });
    } catch { throw new Error(`Prehliadač nedokončil ${method} komentárovej skúšky.`); }
  };
}

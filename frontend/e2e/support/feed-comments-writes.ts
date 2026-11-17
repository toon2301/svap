import type { BrowserContext } from '@playwright/test';
import { categoryReplyCompleted } from './notification-category-writes';
import { COMMENTS_ORIGIN, POSTS_PATH, type FeedCommentsSession } from './feed-comments-session';

/** Stráži jeden podklad, jeden komentár, jeho UI zmazanie a jedno upratanie podkladu. */
export class FeedCommentsWriteAudit {
  private phase: 'ui' | 'cleanup' | 'sealed' = 'ui';
  private posts = 0;
  private comments = 0;
  private uiDeletes = 0;
  private cleanups = 0;
  private rejected = 0;
  private cleanupRejected = false;
  private pending = new Set<object>();
  private uncertain = false;
  constructor(private readonly session: FeedCommentsSession) {}

  allow(method: string, path: string, payload: unknown, request: object): boolean {
    let allowed = false;
    try {
      const data = payload as Record<string, unknown> | null;
      if (this.phase === 'ui' && method === 'POST' && path === POSTS_PATH) {
        this.posts += 1;
        allowed = this.posts === 1 && Boolean(data && !Array.isArray(data) && Object.keys(data).length === 4
          && data.post_type === 'free_post' && data.caption === this.session.postCaption
          && Array.isArray(data.tagged_user_ids) && data.tagged_user_ids.length === 0 && data.will_attach_photo === false);
      } else if (this.phase === 'ui' && this.session.postId !== null && method === 'POST'
        && path === this.session.commentsPath()) {
        this.comments += 1;
        allowed = this.comments === 1 && Boolean(data && !Array.isArray(data) && Object.keys(data).length === 1
          && data.text === this.session.commentText);
      } else if (this.phase === 'ui' && this.session.postId !== null && this.session.commentId !== null && method === 'DELETE'
        && path === `${this.session.commentsPath()}${this.session.commentId}/`) {
        this.uiDeletes += 1; allowed = this.uiDeletes === 1;
      } else if (this.phase === 'cleanup' && this.session.postId !== null && method === 'DELETE'
        && path === `${POSTS_PATH}${this.session.postId}/`) {
        this.cleanups += 1; allowed = this.cleanups === 1;
      }
    } catch { /* Do chyby sa nesmie dostať payload. */ }
    if (allowed) this.pending.add(request);
    else { this.rejected += 1; if (this.phase === 'cleanup') this.cleanupRejected = true; }
    return allowed;
  }

  responded(request: object, completed: boolean): void {
    if (this.pending.delete(request) && !completed) this.uncertain = true;
  }
  finished(request: object): void { if (this.pending.delete(request)) this.uncertain = true; }
  beginCleanup(): void { if (this.pending.size) this.uncertain = true; this.phase = 'cleanup'; }
  seal(): void { this.phase = 'sealed'; }
  assertSafe(): void {
    if (this.pending.size || this.uncertain) throw new Error('Zápis komentárovej skúšky nie je potvrdene ukončený.');
  }
  assertUIComplete(): void {
    this.assertSafe();
    if (this.posts !== 1 || this.comments !== 1 || this.uiDeletes !== 1 || this.rejected) {
      throw new Error('UI nevykonalo presne očakávané zápisy komentárovej skúšky.');
    }
  }
  assertCleanupComplete(): void {
    this.assertSafe();
    if (this.cleanups !== 1 || this.cleanupRejected) throw new Error('Upratanie podkladu neprebehlo jediným bezpečným zápisom.');
  }
  evidence(): string {
    return `[E2E-COMMENTS-AUDIT] post=${this.posts} comment=${this.comments} uiDelete=${this.uiDeletes} cleanupDelete=${this.cleanups} rejected=${this.rejected} pending=${this.pending.size} uncertain=${this.uncertain}`;
  }
}

/** Ochrana sa vzťahuje aj na samostatnú API stránku, nielen na viditeľné UI. */
export async function guardFeedCommentWrites(context: BrowserContext, audit: FeedCommentsWriteAudit): Promise<void> {
  context.on('response', response => {
    let duration: unknown;
    try { duration = response.headers()['x-app-duration-ms']; } catch { /* Bez dôkazu nie je 5xx potvrdené. */ }
    audit.responded(response.request(), categoryReplyCompleted(response.status(), duration));
  });
  context.on('requestfinished', request => audit.finished(request));
  context.on('requestfailed', request => audit.finished(request));
  await context.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(); const url = new URL(request.url()); const method = request.method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) { await route.fallback(); return; }
    if (url.origin === COMMENTS_ORIGIN && method === 'POST'
      && ['/api/token/refresh/', '/api/auth/token/refresh/'].includes(url.pathname)) { await route.fallback(); return; }
    let payload: unknown = null;
    try { payload = request.postDataJSON(); } catch { /* DELETE telo nemá. */ }
    if (audit.allow(method, url.origin === COMMENTS_ORIGIN ? url.pathname : '', payload, request)) { await route.fallback(); return; }
    await route.abort();
  });
}

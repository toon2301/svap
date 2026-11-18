import { test as commentsTest } from '../support/feed-comments-test';
import { COMMENT_MODES, COMMENTS_PRIVATE_MARKER as PRIVATE, syntheticCommentsPage, type CommentMode } from './feed-comments-page';
import { COMMENTS_ORIGIN, POSTS_PATH } from '../support/feed-comments-session';

/** Účty, env aj skutočná sieť chýbajú. Vlastný podklad aj komentár sú iba v pamäti tejto fixture. */
const test = commentsTest.extend<{ commentMode: CommentMode; _syntheticFeed: void }>({
  commentMode: ['normal', { option: true }],
  _syntheticFeed: [async ({ context, page, commentMode }, runFixture) => {
    let post: { id: number; caption: string; can_manage: boolean } | null = null;
    let comments: Array<{ id: number; text: string; can_edit: boolean; can_delete: boolean }> = [];
    let postsCreated = 0; let commentsCreated = 0; let commentsDeleted = 0; let postsDeleted = 0;
    let csrf = 0; let unexpected = 0; let writesWithCsrf = 0; let touch = 0; let mouse = 0;
    let initialEmptyVisible = false; let initialListCount = -1;
    await page.exposeFunction('recordCommentPointer', (trusted: boolean, pointer: string) => {
      if (trusted && pointer === 'touch') touch += 1;
      if (trusted && pointer === 'mouse') mouse += 1;
    });
    await context.route('**/*', async route => {
      const request = route.request(); const url = new URL(request.url()); const method = request.method();
      const reply = (status: number, data?: unknown) => route.fulfill({ status,
        headers: { 'X-App-Duration-Ms': '1' }, contentType: 'application/json', body: data === undefined ? '' : JSON.stringify(data) });
      if (url.origin !== COMMENTS_ORIGIN) { unexpected += 1; await route.abort(); return; }
      if (method !== 'GET' && request.headers()['x-csrftoken']) writesWithCsrf += 1;
      if (method === 'GET' && url.pathname === '/api/auth/csrf-token/') {
        csrf += 1; await route.fulfill({ status: 200, contentType: 'application/json',
          headers: { 'Set-Cookie': `csrftoken=${PRIVATE}; Path=/; Secure; SameSite=Lax` }, body: JSON.stringify({ csrf_token: PRIVATE }) });
      } else if (method === 'GET' && url.pathname === '/dashboard') {
        await route.fulfill({ status: 200, contentType: 'text/html', body: syntheticCommentsPage(commentMode) });
      } else if (url.pathname === POSTS_PATH && method === 'POST') {
        if (commentMode === 'empty-feed') {
          initialEmptyVisible = await page.getByTestId('feed-empty-state').isVisible();
          initialListCount = await page.getByTestId('feed-list').count();
        }
        postsCreated += 1; const payload = request.postDataJSON();
        post = { id: 101, caption: payload.caption, can_manage: true };
        await reply(201, { ...post, can_manage: commentMode !== 'post-create-invalid', private: PRIVATE });
      } else if (url.pathname === POSTS_PATH && method === 'GET') {
        await reply(200, { results: post ? [post] : [], next: null });
      } else if (url.pathname === `${POSTS_PATH}101/comments/` && method === 'POST') {
        commentsCreated += 1; const payload = request.postDataJSON();
        const created = { id: 201, text: payload.text, can_edit: true, can_delete: true };
        comments.push(created);
        if (commentMode === 'comment-network') { await route.abort(); return; }
        await reply(commentMode === 'ui-create-status' ? 500 : 201,
          commentMode === 'ui-create-status' ? { private: PRIVATE } : { ...created, private: PRIVATE });
      } else if (url.pathname === `${POSTS_PATH}101/comments/` && method === 'GET') {
        await reply(200, { results: comments, count: comments.length, next: null, private: PRIVATE });
      } else if (url.pathname === `${POSTS_PATH}101/comments/201/` && method === 'DELETE') {
        commentsDeleted += 1;
        if (['ui-delete-status', 'ui-delete-before-create'].includes(commentMode)) { await reply(500, { private: PRIVATE }); return; }
        comments = []; await reply(204);
      } else if (url.pathname === `${POSTS_PATH}101/` && method === 'DELETE') {
        postsDeleted += 1;
        if (commentMode === 'post-delete-status') { await reply(500, { private: PRIVATE }); return; }
        if (commentMode !== 'post-delete-ignored') { post = null; comments = []; }
        await reply(204);
      } else if (url.pathname === `${POSTS_PATH}101/` && method === 'GET') {
        await reply(post ? 200 : 404, post ? { ...post, private: PRIVATE } : { private: PRIVATE });
      } else if (url.pathname === '/favicon.ico') await reply(204);
      else { unexpected += 1; await route.abort(); }
    });
    try { await runFixture(); } finally {
      if (commentMode === 'empty-feed') console.log(`[COMMENTS-EMPTY-FEED] visible=${initialEmptyVisible} lists=${initialListCount}`);
      console.log(`[COMMENTS-SELFTEST] mode=${commentMode} postExists=${post !== null} commentsLeft=${comments.length} postsCreated=${postsCreated} commentsCreated=${commentsCreated} commentsDeleted=${commentsDeleted} postsDeleted=${postsDeleted} csrf=${csrf} writesWithCsrf=${writesWithCsrf} touch=${touch} mouse=${mouse} unexpected=${unexpected}`);
    }
  }, { auto: true }],
});

for (const mode of COMMENT_MODES) test.describe(`[${mode}]`, () => {
  test.use({ commentMode: mode });
  test('vlastný komentár a bezpečné upratanie podkladu', async ({ page, createAndDeleteOwnComment }) => {
    await createAndDeleteOwnComment();
    if (mode === 'body-timeout') {
      console.log('[COMMENTS-SELFTEST-PHASE] body-timeout');
      await page.waitForTimeout(20000); // Výhradne lokálny úmyselný timeout.
    }
  });
});

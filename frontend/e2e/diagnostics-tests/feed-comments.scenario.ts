import { test as commentsTest } from '../support/feed-comments-test';
import { COMMENT_MODES, COMMENTS_PRIVATE_MARKER as PRIVATE, syntheticCommentsPage, type CommentMode } from './feed-comments-page';
import { COMMENTS_ORIGIN, POSTS_PATH } from '../support/feed-comments-session';
import { test as readTest } from '../support/diagnostic-test';
import { findNotificationCommentAuthor, openCommentAuthorProfileFromOverlay } from '../support/comment-author-profile';
import { AUTHOR_MODES, AUTHOR_PRECHECK_MODES } from './feed-comments-page';

/** Účty, env aj skutočná sieť chýbajú. Vlastný podklad aj komentár sú iba v pamäti tejto fixture. */
const test = commentsTest.extend<{ commentMode: CommentMode; _syntheticFeed: void }>({
  commentMode: ['normal', { option: true }],
  _syntheticFeed: [async ({ context, page, commentMode }, runFixture) => {
    const photoMode = commentMode.startsWith('photo-');
    let post: { id: number; caption: string; can_manage: boolean; post_type?: string; images?: unknown[]; comments_count?: number } | null =
      photoMode ? { id: 101, caption: 'Pôvodný podklad', can_manage: true, post_type: 'free_post',
        images: [...(['photo-pending-first', 'photo-pending-ready'].includes(commentMode) ? [{ id: 300, status: 'pending' }] : []),
          { id: 301, thumbnail_url: '/synteticka-fotka.png' }], comments_count: 3 } : null;
    const rootsCandidate = { id: 103, caption: 'Príspevok s odpoveďami', can_manage: true, post_type: 'free_post',
      images: [{ id: 303, thumbnail_url: '/ina-fotka.png' }], comments_count: 3 };
    let comments: Array<{ id: number; text: string; can_edit: boolean; can_delete: boolean }> = photoMode
      ? [1, 2, 3].map(id => ({ id, text: 'Pôvodný komentár', can_edit: false, can_delete: false })) : [];
    let postsCreated = 0; let commentsCreated = 0; let commentsDeleted = 0; let postsDeleted = 0;
    let csrf = 0; let unexpected = 0; let writesWithCsrf = 0; let touch = 0; let mouse = 0;
    let initialEmptyVisible = false; let initialListCount = -1;
    let dashboardLoads = 0;
    let commentDeleteStatus: number | null = null;
    context.on('response', response => {
      const url = new URL(response.url());
      if (response.request().method() === 'DELETE' && url.origin === COMMENTS_ORIGIN
        && url.pathname === `${POSTS_PATH}101/comments/201/`) commentDeleteStatus = response.status();
    });
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
        dashboardLoads += 1;
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
        const reordered = commentMode === 'photo-reordered' && dashboardLoads > 1 && post;
        const readyPost = commentMode === 'photo-pending-ready' && dashboardLoads > 1 && post
          ? { ...post, images: [{ id: 300, thumbnail_url: '/prave-schvalena-fotka.png' }, { id: 301, thumbnail_url: '/synteticka-fotka.png' }] } : post;
        await reply(200, { results: reordered ? [{ ...post, id: 102, can_manage: false,
          images: [{ id: 302, thumbnail_url: '/ina-synteticka-fotka.png' }] }, post]
          : commentMode === 'photo-root-candidate' ? [rootsCandidate, post] : readyPost ? [readyPost] : [], next: null });
      } else if (commentMode === 'photo-root-candidate' && url.pathname === `${POSTS_PATH}103/` && method === 'GET') {
        await reply(200, rootsCandidate);
      } else if (commentMode === 'photo-root-candidate' && url.pathname === `${POSTS_PATH}103/comments/` && method === 'GET') {
        await reply(200, { results: [{ id: 1, replies: [{ id: 2 }, { id: 3 }] }], count: 3 });
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
        if (commentMode === 'ui-delete-status-503') { await reply(503, { private: PRIVATE }); return; }
        if (commentMode === 'ui-delete-status-no-response') { await route.abort(); return; }
        comments = comments.filter(item => item.id !== 201); await reply(204);
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
      console.log(`[COMMENTS-SELFTEST] mode=${commentMode} postExists=${post !== null} commentsLeft=${comments.length} postsCreated=${postsCreated} commentsCreated=${commentsCreated} commentsDeleted=${commentsDeleted} postsDeleted=${postsDeleted} csrf=${csrf} writesWithCsrf=${writesWithCsrf} touch=${touch} mouse=${mouse} unexpected=${unexpected} commentDeleteStatus=${commentDeleteStatus ?? 'none'}`);
    }
  }, { auto: true }],
});

for (const mode of AUTHOR_MODES) readTest.describe(`[${mode}]`, () => {
  readTest('meno komentujúceho otvorí profil bez prekrývajúceho detailu', async ({ context, page }, testInfo) => {
    readTest.skip(testInfo.project.name === 'webkit-mobile', 'Preklik z okna je desktopový scenár.');
    await context.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: `
      <!doctype html><meta charset="utf-8"><div data-testid="feed-post-overlay">
      <button data-testid="feed-comment-author-201">${PRIVATE}</button></div><script>
      document.querySelector('button').onclick=()=>{
        history.pushState({},'',${JSON.stringify(mode === 'author-wrong-url' ? '/dashboard'
          : mode === 'author-other-profile' ? '/dashboard/users/iny-skusobny-profil' : '/dashboard/users/skusobny-profil')});
        ${mode === 'author-overlay-stuck' ? '' : "document.querySelector('[data-testid=feed-post-overlay]').remove();"}
      };</script>` }));
    await page.goto('/dashboard/feed/101');
    await openCommentAuthorProfileFromOverlay(page, { commentId: 201, identifier: 'skusobny-profil' });
  });
});

for (const mode of AUTHOR_PRECHECK_MODES) readTest.describe(`[${mode}]`, () => {
  readTest('výber autora rozlišuje zaniknuté dáta od chyby servera', async ({ context, page }) => {
    await context.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/dashboard') { await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><p>Skúška</p>' }); return; }
      const post = /^\/api\/auth\/feed\/posts\/(101|102)\/$/.exec(path);
      const comments = /^\/api\/auth\/feed\/posts\/(101|102)\/comments\/$/.exec(path);
      const id = comments?.[1];
      const status = post && mode === 'author-post-gone' ? 404 : comments && mode === 'author-http-error' ? 500 : 200;
      const data = post ? {} : mode === 'author-bad-data' ? { private: PRIVATE }
        : { results: mode === 'author-next-candidate' && id === '102'
          ? [{ id: 202, author: { id: 10, slug: 'skusobny-profil' } }] : [] };
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto('/dashboard');
    const select = () => findNotificationCommentAuthor(page, ['/dashboard/feed/101?comment=201', '/dashboard/feed/102?comment=202']);
    if (mode === 'author-http-error' || mode === 'author-bad-data') {
      let error: unknown; try { await select(); } catch (caught) { error = caught; }
      if (!(error instanceof Error) || !error.message.includes(mode === 'author-http-error' ? 'HTTP 500' : 'neplatný zoznam')) {
        throw new Error('Chyba servera alebo kontraktu sa nesmie zameniť za chýbajúce dáta.');
      }
    } else {
      const target = await select();
      const correct = mode === 'author-next-candidate'
        ? target?.index === 1 && target.commentId === 202 && target.identifier === 'skusobny-profil' : target === null;
      if (!correct) throw new Error('Výber dostupného autora nezodpovedá dátam.');
    }
  });
});

for (const mode of COMMENT_MODES) test.describe(`[${mode}]`, () => {
  test.use({ commentMode: mode, reusePhotoPost: mode.startsWith('photo-') });
  test('vlastný komentár a bezpečné upratanie podkladu', async ({ page, createAndDeleteOwnComment }) => {
    await createAndDeleteOwnComment();
    if (mode === 'body-timeout') {
      console.log('[COMMENTS-SELFTEST-PHASE] body-timeout');
      await page.waitForTimeout(20000); // Výhradne lokálny úmyselný timeout.
    }
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { FeedCommentsSession, POSTS_PATH, type CommentTransport } from '../support/feed-comments-session';
import { FeedCommentsWriteAudit } from '../support/feed-comments-writes';
import { requireSingleCommentRun } from '../support/feed-comments-options';

const PRIVATE = 'SYNTHETIC_PRIVATE_FEED_NEVER_PRINT';

/** Syntetický vlastný podklad; transport nikdy neprijíma účty alebo env. */
function harness() {
  let post: Record<string, unknown> | null = null;
  let deleteMode: 'normal' | 'status' | 'ignored' | 'throw' = 'normal';
  let prepareMode: 'normal' | 'bad' | 'status' | 'throw' = 'normal';
  let readMode: 'normal' | 'foreign' | 'missing' | 'throw' | 'bad-final' = 'normal';
  let safe = true; let finalSafe = true; let deleted = false;
  const calls: string[] = []; const reports: string[] = [];
  const transport: CommentTransport = async (method, path, body, expected) => {
    calls.push(method);
    if (path.endsWith('/comments/')) return { status: 200, data: { contractValid: true,
      matchedCount: expected?.id === 21 ? 1 : 0, matchedExpectedId: expected?.id === 21 } };
    if (method === 'POST') {
      if (prepareMode === 'throw') throw new Error(PRIVATE);
      post = { id: 11, caption: body?.caption, can_manage: true };
      if (prepareMode === 'bad') return { status: 201, data: { private: PRIVATE } };
      return { status: prepareMode === 'status' ? 500 : 201, data: { ...post, private: PRIVATE } };
    }
    if (method === 'DELETE') {
      deleted = true;
      if (deleteMode === 'throw') throw new Error(PRIVATE);
      if (deleteMode === 'status') return { status: 500, data: { private: PRIVATE } };
      if (deleteMode !== 'ignored') post = null;
      return { status: 204, data: null };
    }
    if (readMode === 'throw') throw new Error(PRIVATE);
    if (readMode === 'foreign') return { status: 200, data: { ...post, caption: PRIVATE } };
    if (readMode === 'missing' || (!post && !(deleted && readMode === 'bad-final'))) return { status: 404, data: null };
    return { status: 200, data: post ?? { private: PRIVATE } };
  };
  const session = new FeedCommentsSession(transport, 'synteticky-marker', {
    begin: () => {}, beforeDelete: async () => { if (!safe) throw new Error(PRIVATE); },
    afterDelete: async () => { if (!finalSafe) throw new Error(PRIVATE); }, report: state => { reports.push(state); },
  });
  return { session, calls, reports, exists: () => post !== null, setDelete: (value: typeof deleteMode) => { deleteMode = value; },
    setPrepare: (value: typeof prepareMode) => { prepareMode = value; }, setRead: (value: typeof readMode) => { readMode = value; },
    unsafe: () => { safe = false; }, unsafeFinal: () => { finalSafe = false; } };
}

async function failsSafely(body: () => Promise<unknown>, critical = false) {
  let caught: unknown;
  try { await body(); } catch (error) { caught = error; }
  assert.ok(caught instanceof Error); assert.ok(!caught.message.includes(PRIVATE));
  if (critical) assert.match(caught.message, /ZÁVAŽNÉ/);
}

test('jeden vlastný podklad sa overí, zmaže a následným GET potvrdí ako neprítomný', async () => {
  const h = harness(); await h.session.prepare();
  assert.equal(h.session.postId, 11); await h.session.cleanup();
  assert.deepEqual(h.calls, ['POST', 'GET', 'DELETE', 'GET']);
  assert.equal(h.exists(), false); assert.deepEqual(h.reports, ['verified']);
});

test('skúška bez pokusu o vytvorenie nič nemaže', async () => {
  const h = harness(); await h.session.cleanup();
  assert.equal(h.calls.length, 0); assert.deepEqual(h.reports, ['not-needed']);
});

test('druhý pokus o vytvorenie podkladu je zakázaný, prvý sa stále uprace', async () => {
  const h = harness(); await h.session.prepare();
  await failsSafely(() => h.session.prepare()); await h.session.cleanup();
  assert.equal(h.calls.filter(value => value === 'POST').length, 1); assert.equal(h.exists(), false);
});

for (const mode of ['bad', 'throw'] as const) test(`nepotvrdený podklad ${mode} nesmie viesť k zmazaniu cudzieho ID`, async () => {
  const h = harness(); h.setPrepare(mode);
  await failsSafely(() => h.session.prepare()); await failsSafely(() => h.session.cleanup(), true);
  assert.ok(!h.calls.includes('DELETE')); assert.deepEqual(h.reports, ['failed']);
});

test('vlastné ID z chybovej odpovede sa zaregistruje pred tvrdením o HTTP stave', async () => {
  const h = harness(); h.setPrepare('status'); await failsSafely(() => h.session.prepare());
  await h.session.cleanup(); assert.equal(h.exists(), false); assert.deepEqual(h.reports, ['verified']);
});

for (const mode of ['foreign', 'missing', 'throw'] as const) test(`neoverené vlastníctvo ${mode} zakáže DELETE`, async () => {
  const h = harness(); await h.session.prepare(); h.setRead(mode);
  await failsSafely(() => h.session.cleanup(), true); assert.ok(!h.calls.includes('DELETE'));
});

for (const mode of ['status', 'ignored', 'throw'] as const) test(`chyba upratania ${mode} nesmie byť úspešný návrat`, async () => {
  const h = harness(); await h.session.prepare(); h.setDelete(mode);
  await failsSafely(() => h.session.cleanup(), true);
  assert.equal(h.calls.at(-1), 'GET'); assert.deepEqual(h.reports, ['failed']);
});

test('chyba záverečného GET ostáva FAIL aj po DELETE 204', async () => {
  const h = harness(); await h.session.prepare(); h.setRead('bad-final');
  await failsSafely(() => h.session.cleanup(), true); assert.equal(h.exists(), false);
});

test('neistý zápis nesmie spustiť zmazanie rodičovského príspevku', async () => {
  const h = harness(); await h.session.prepare(); h.unsafe();
  await failsSafely(() => h.session.cleanup(), true); assert.ok(!h.calls.includes('DELETE'));
});

test('asynchrónna záverečná poistka sa musí dočkať a môže zakázať potvrdenie', async () => {
  const h = harness(); await h.session.prepare(); h.unsafeFinal();
  await failsSafely(() => h.session.cleanup(), true); assert.equal(h.exists(), false);
});

test('prijme sa iba nový vlastný komentár so správnym textom a oboma oprávneniami', async () => {
  const h = harness(); await h.session.prepare();
  for (const item of [null, { id: 21, text: PRIVATE, can_edit: true, can_delete: true },
    { id: 21, text: h.session.commentText, can_edit: false, can_delete: true }]) {
    assert.throws(() => h.session.takeComment(item), error => error instanceof Error && !error.message.includes(PRIVATE));
  }
  h.session.takeComment({ id: 21, text: h.session.commentText, can_edit: true, can_delete: true });
  await h.session.verifyComment(true); await h.session.cleanup();
});

test('GET nesmie potvrdiť neprítomnosť, keď sa vlastný komentár stále nachádza', async () => {
  const h = harness(); await h.session.prepare();
  h.session.takeComment({ id: 21, text: h.session.commentText, can_edit: true, can_delete: true });
  await failsSafely(() => h.session.verifyComment(false)); await h.session.cleanup();
});

test('audit povolí len jeden podklad, komentár, UI zmazanie a upratanie podkladu', async () => {
  const h = harness(); const audit = new FeedCommentsWriteAudit(h.session);
  const post = {}; const comment = {}; const remove = {}; const cleanup = {};
  assert.equal(audit.allow('POST', POSTS_PATH, { post_type: 'free_post', caption: h.session.postCaption,
    tagged_user_ids: [], will_attach_photo: false }, post), true);
  audit.responded(post, true); await h.session.prepare();
  assert.equal(audit.allow('POST', h.session.commentsPath(), { text: h.session.commentText }, comment), true);
  audit.responded(comment, true);
  h.session.takeComment({ id: 21, text: h.session.commentText, can_edit: true, can_delete: true });
  assert.equal(audit.allow('DELETE', `${h.session.commentsPath()}21/`, null, remove), true); audit.responded(remove, true);
  audit.assertUIComplete(); audit.beginCleanup();
  assert.equal(audit.allow('DELETE', `${POSTS_PATH}11/`, null, cleanup), true); audit.responded(cleanup, true);
  audit.assertCleanupComplete(); audit.seal();
  assert.equal(audit.allow('POST', h.session.commentsPath(), { text: h.session.commentText }, {}), false);
});

test('cudzí zápis, duplicitný podklad a neukončená požiadavka nemôžu prejsť ako bezpečné', async () => {
  const h = harness(); const audit = new FeedCommentsWriteAudit(h.session);
  assert.equal(audit.allow('DELETE', `${POSTS_PATH}99/`, null, {}), false);
  const body = { post_type: 'free_post', caption: h.session.postCaption, tagged_user_ids: [], will_attach_photo: false };
  assert.equal(audit.allow('POST', POSTS_PATH, body, {}), true);
  assert.equal(audit.allow('POST', POSTS_PATH, body, {}), false);
  audit.beginCleanup(); assert.throws(() => audit.assertSafe());
});

test('CLI opakovanie sa odmietne bez vypísania zadanej hodnoty', () => {
  assert.doesNotThrow(() => requireSingleCommentRun(['--repeat-each=1']));
  for (const args of [['--repeat-each=2'], ['--repeat-each', '2'], [`--repeat-each=${PRIVATE}`]]) {
    assert.throws(() => requireSingleCommentRun(args), error => error instanceof Error
      && error.message.includes('E2E_COMMENTS_REPEATS_REJECTED') && !error.message.includes(PRIVATE));
  }
});

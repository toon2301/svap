import assert from 'node:assert/strict';
import test from 'node:test';
import { FeedCommentsSession, POSTS_PATH, type CommentTransport } from '../support/feed-comments-session';
import { FeedCommentsWriteAudit } from '../support/feed-comments-writes';

const PRIVATE = 'SYNTHETIC_PRIVATE_REUSE_NEVER_PRINT';

/** Existujúci príspevok a tri cudzie pôvodné komentáre sa nikdy nemenia. */
function harness() {
  let own = false; let owned = true; let deleteStatus = 204; let ignoreDelete = false; let duplicate = false;
  let candidates: unknown = [{ id: 11, imageId: 31 }]; let photo = true; let manage = true; let roots = 3; let safe = true;
  let imageIds = [31];
  const calls: string[] = []; const reports: string[] = [];
  const api: CommentTransport = async (method, path, _body, expected) => {
    calls.push(`${method} ${path}`);
    if (path === POSTS_PATH) return { status: 200, data: { candidates, private: PRIVATE } };
    if (path === `${POSTS_PATH}11/`) return { status: 200, data: { id: 11, can_manage: manage,
      hasPhoto: photo, commentsCount: 3, imageIds, private: PRIVATE } };
    if (method === 'DELETE') {
      if (deleteStatus === 204 && !ignoreDelete) own = false;
      return { status: deleteStatus, data: null };
    }
    if (!expected) return { status: 200, data: { rootCount: roots } };
    return { status: 200, data: { contractValid: true, matchedCount: own ? duplicate ? 2 : 1 : 0,
      matchedExpectedId: own && expected.id === 21, matchedOwnedExpectedId: own && owned && expected.id === 21,
      ownedMatchId: own && owned ? 21 : null, private: PRIVATE } };
  };
  const session = new FeedCommentsSession(api, 'iba-skusobny-marker', {
    begin: () => {}, beforeDelete: () => { if (!safe) throw Error(PRIVATE); }, afterDelete: () => {},
    report: state => { reports.push(state); },
  }, true);
  return { session, calls, reports, add(register = true) {
    session.noteCommentAttempt(); own = true;
    if (register) session.takeComment({ id: 21, text: session.commentText, can_edit: true, can_delete: true });
  }, remove: () => { own = false; }, exists: () => own,
  change(value: { candidates?: unknown; photo?: boolean; manage?: boolean; roots?: number; safe?: boolean;
    owned?: boolean; duplicate?: boolean; deleteStatus?: number; ignoreDelete?: boolean; imageIds?: readonly number[] }) {
    if ('candidates' in value) candidates = value.candidates;
    if ('photo' in value) photo = value.photo!; if ('manage' in value) manage = value.manage!;
    if ('roots' in value) roots = value.roots!; if ('safe' in value) safe = value.safe!;
    if ('owned' in value) owned = value.owned!; if ('duplicate' in value) duplicate = value.duplicate!;
    if ('deleteStatus' in value) deleteStatus = value.deleteStatus!; if ('ignoreDelete' in value) ignoreDelete = value.ignoreDelete!;
    if ('imageIds' in value) imageIds = [...value.imageIds!];
  } };
}

test('fotografický podklad sa iba číta a po UI zmazaní sa pôvodný príspevok nemaže', async () => {
  const h = harness(); await h.session.prepare(); h.add(); h.remove(); await h.session.cleanup();
  assert.equal(h.session.sourceImageId, 31); assert.deepEqual(h.reports, ['verified']);
  assert.ok(h.calls.every(call => call.startsWith('GET ')));
});

test('návrat po chybe odstráni iba jediný overený nový komentár a ponechá príspevok', async () => {
  const h = harness(); await h.session.prepare(); h.add(); await h.session.cleanup();
  assert.equal(h.exists(), false); assert.deepEqual(h.reports, ['verified']);
  assert.deepEqual(h.calls.filter(call => call.startsWith('DELETE ')), [`DELETE ${POSTS_PATH}11/comments/21/`]);
});

test('chybná odpoveď vytvorenia nezabráni identifikácii vlastnej jedinečnej značky pri uprataní', async () => {
  const h = harness(); await h.session.prepare(); h.add(false); await h.session.cleanup();
  assert.equal(h.exists(), false); assert.equal(h.session.commentId, 21); assert.deepEqual(h.reports, ['verified']);
});

for (const [name, invalid] of [
  ['prázdny zoznam', { candidates: [] }], ['neplatné ID', { candidates: [{ id: -1, imageId: 31 }] }],
  ['neplatné ID fotky', { candidates: [{ id: 11, imageId: -1 }] }], ['chýbajúca fotka', { photo: false }],
  ['fotka iného príspevku', { imageIds: [32] }],
  ['cudzí príspevok', { manage: false }], ['málo komentárov', { roots: 2 }],
] as const) {
  test(`neplatný podklad sa odmietne pred zápisom: ${name}`, async () => {
    const h = harness(); h.change(invalid); await assert.rejects(h.session.prepare()); await h.session.cleanup();
    assert.ok(h.calls.every(call => call.startsWith('GET '))); assert.deepEqual(h.reports, ['not-needed']);
  });
}

for (const [name, invalid] of [
  ['cudzie vlastníctvo', { owned: false }], ['duplicitná značka', { duplicate: true }],
  ['neistý zápis', { safe: false }], ['DELETE 500', { deleteStatus: 500 }], ['ignorovaný DELETE', { ignoreDelete: true }],
] as const) test(`upratanie nesmie zamaskovať chybu: ${name}`, async () => {
  const h = harness(); await h.session.prepare(); h.add(); h.change(invalid);
  await assert.rejects(h.session.cleanup(), error => error instanceof Error && error.message.includes('ZÁVAŽNÉ') && !error.message.includes(PRIVATE));
  assert.equal(h.exists(), true); assert.deepEqual(h.reports, ['failed']);
  assert.ok(!h.calls.includes(`DELETE ${POSTS_PATH}11/`));
  assert.ok(h.calls.filter(call => call.startsWith('DELETE ')).length <= 1);
});

test('úspešné zmazanie nesmie zakryť zmenu počtu pôvodných komentárov', async () => {
  const h = harness(); await h.session.prepare(); h.add(); h.change({ roots: 2 });
  await assert.rejects(h.session.cleanup(), /ZÁVAŽNÉ/); assert.deepEqual(h.reports, ['failed']);
  assert.ok(!h.calls.includes(`DELETE ${POSTS_PATH}11/`));
});

test('strážca opakovane použitého podkladu zakazuje vytvorenie aj zmazanie príspevku a cudzieho komentára', async () => {
  const h = harness(); await h.session.prepare(); const audit = new FeedCommentsWriteAudit(h.session);
  assert.equal(audit.allow('POST', POSTS_PATH, {}, {}), false);
  h.add(); audit.beginCleanup();
  assert.equal(audit.allow('DELETE', `${POSTS_PATH}11/`, null, {}), false);
  assert.equal(audit.allow('DELETE', `${POSTS_PATH}11/comments/22/`, null, {}), false);
  const own = {}; assert.equal(audit.allow('DELETE', `${POSTS_PATH}11/comments/21/`, null, own), true);
  audit.responded(own, true); assert.throws(() => audit.assertCleanupComplete());
});

test('audit pri existujúcom príspevku vyžaduje presne jedno UI pridanie a zmazanie, nie nový príspevok', async () => {
  const h = harness(); await h.session.prepare(); const audit = new FeedCommentsWriteAudit(h.session);
  const create = {}; assert.equal(audit.allow('POST', h.session.commentsPath(), { text: h.session.commentText }, create), true);
  audit.responded(create, true); h.add();
  const remove = {}; assert.equal(audit.allow('DELETE', `${h.session.commentsPath()}21/`, null, remove), true);
  audit.responded(remove, true); audit.assertUIComplete(); audit.beginCleanup(); audit.assertCleanupComplete();
  assert.match(audit.evidence(), /post=0 comment=1 uiDelete=1 cleanupDelete=0 rejected=0 pending=0 uncertain=false$/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCommentFault, commentFailurePhases, type CommentFaultMode, type CommentObservation } from './feed-comments-control';

const cases: Array<{ mode: CommentFaultMode; created: number; deleted: number; cleanup: number; phases: string[] }> = [
  { mode: 'ui-create-status', created: 1, deleted: 0, cleanup: 1, phases: ['pridanie vlastného komentára'] },
  { mode: 'ui-delete-status', created: 1, deleted: 1, cleanup: 1, phases: ['zmazanie vlastného komentára'] },
  { mode: 'missing-row', created: 1, deleted: 0, cleanup: 1, phases: ['pridanie vlastného komentára'] },
  { mode: 'body-timeout', created: 1, deleted: 1, cleanup: 1, phases: ['telo skúšky'] },
  { mode: 'post-delete-status', created: 1, deleted: 1, cleanup: 1, phases: ['upratanie podkladu'] },
  { mode: 'post-delete-ignored', created: 1, deleted: 1, cleanup: 1, phases: ['upratanie podkladu'] },
  { mode: 'comment-network', created: 1, deleted: 0, cleanup: 0, phases: ['pridanie vlastného komentára', 'upratanie podkladu'] },
  { mode: 'post-create-invalid', created: 0, deleted: 0, cleanup: 0, phases: ['príprava vlastného podkladu', 'upratanie podkladu'] },
];

for (const item of cases) test(`kontrola ${item.mode} vyžaduje správne operácie aj fázu`, () => {
  const uncertain = ['post-delete-status', 'post-delete-ignored', 'comment-network', 'post-create-invalid'].includes(item.mode);
  const state: CommentObservation = { status: item.mode === 'body-timeout' ? 'timedOut' : 'failed', phases: item.phases,
    exists: uncertain, comments: item.mode === 'comment-network' ? 1 : 0, postsCreated: 1, commentsCreated: item.created,
    commentsDeleted: item.deleted, postsDeleted: item.cleanup, csrf: 1,
    writesWithCsrf: 1 + item.created + item.deleted + item.cleanup, touch: 0, mouse: 2 * (item.created + item.deleted),
    unexpected: 0, cleanup: uncertain ? 'failed' : 'verified' };
  assert.doesNotThrow(() => assertCommentFault(item.mode, state));
  for (const field of ['postsCreated', 'commentsCreated', 'commentsDeleted', 'postsDeleted', 'csrf', 'writesWithCsrf',
    'unexpected', 'comments', 'touch', 'mouse'] as const) {
    assert.throws(() => assertCommentFault(item.mode, { ...state, [field]: state[field] + 1 }));
  }
  assert.throws(() => assertCommentFault(item.mode, { ...state, phases: [] }));
  assert.throws(() => assertCommentFault(item.mode, { ...state, phases: ['otvorenie detailu'] }));
  assert.throws(() => assertCommentFault(item.mode, { ...state, status: 'passed' }));
  assert.throws(() => assertCommentFault(item.mode, { ...state, exists: !state.exists }));
  assert.throws(() => assertCommentFault(item.mode, { ...state, cleanup: state.cleanup === 'failed' ? 'verified' : 'failed' }));
});

test('výber fázy nevracia súkromný text ani neznámu chybu', () => {
  const privateText = 'SYNTHETIC_PRIVATE_CONTROL_NEVER_PRINT';
  for (const phase of ['otvorenie Nástenky', 'príprava vlastného podkladu', 'otvorenie detailu', 'pridanie vlastného komentára',
    'GET po pridaní', 'zmazanie vlastného komentára', 'GET po zmazaní']) {
    const phases = commentFailurePhases({ errors: [{ message: `${privateText}; krok: ${phase}.` }] });
    assert.ok(!JSON.stringify(phases).includes(privateText), 'Fáza nesmie obsahovať pôvodný súkromný text.');
    assert.deepEqual(phases, [phase]);
  }
  assert.deepEqual(commentFailurePhases({ errors: [{ message: privateText }] }), []);
});

test('fáza upratania a timeoutu sa odlišuje od obyčajného pádu UI', () => {
  assert.deepEqual(commentFailurePhases({ errors: [{ message: 'krok: pridanie vlastného komentára.' },
    { message: 'ZÁVAŽNÉ: upratanie komentárovej skúšky nebolo potvrdené.' }] }),
  ['pridanie vlastného komentára', 'upratanie podkladu']);
  const stdout = [{ text: '[COMMENTS-SELFTEST-PHASE] body-timeout' }];
  assert.deepEqual(commentFailurePhases({ status: 'timedOut', stdout }), ['telo skúšky']);
  assert.deepEqual(commentFailurePhases({ status: 'timedOut' }), []);
  assert.deepEqual(commentFailurePhases({ status: 'failed', stdout }), []);
});

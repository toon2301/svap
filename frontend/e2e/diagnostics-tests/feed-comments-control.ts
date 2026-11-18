import assert from 'node:assert/strict';

export const COMMENT_FAULT_MODES = ['ui-create-status', 'ui-delete-status', 'missing-row', 'body-timeout',
  'post-delete-status', 'post-delete-ignored', 'comment-network', 'post-create-invalid'] as const;
export type CommentFaultMode = typeof COMMENT_FAULT_MODES[number];
export type CommentResult = { status?: string; stdout?: Array<{ text?: string }>; errors?: Array<{ message?: string }> };
export type CommentObservation = { status?: string; phases: string[]; exists: boolean; comments: number;
  postsCreated: number; commentsCreated: number; commentsDeleted: number; postsDeleted: number;
  csrf: number; writesWithCsrf: number; touch: number; mouse: number; unexpected: number; cleanup?: string };

/** Z pôvodných chýb vyberie iba pevné fázy, nikdy nevracia text servera alebo stránky. */
export function commentFailurePhases(result: CommentResult): string[] {
  const errors = (result.errors ?? []).map(item => item.message ?? '').join('');
  const output = (result.stdout ?? []).map(item => item.text ?? '').join('');
  const phases = ['otvorenie Nástenky', 'príprava vlastného podkladu', 'otvorenie detailu', 'pridanie vlastného komentára',
    'GET po pridaní', 'zmazanie vlastného komentára', 'GET po zmazaní'].filter(value => errors.includes(`krok: ${value}.`));
  if (errors.includes('ZÁVAŽNÉ: upratanie komentárovej skúšky nebolo potvrdené.')) phases.push('upratanie podkladu');
  if (result.status === 'timedOut' && output.includes('[COMMENTS-SELFTEST-PHASE] body-timeout')) phases.push('telo skúšky');
  return phases;
}

type Expected = { created: number; deleted: number; cleanupDeletes: number; phases: readonly string[] };
const EXPECTED: Record<CommentFaultMode, Expected> = {
  'ui-create-status': { created: 1, deleted: 0, cleanupDeletes: 1, phases: ['pridanie vlastného komentára'] },
  'ui-delete-status': { created: 1, deleted: 1, cleanupDeletes: 1, phases: ['zmazanie vlastného komentára'] },
  'missing-row': { created: 1, deleted: 0, cleanupDeletes: 1, phases: ['pridanie vlastného komentára'] },
  'body-timeout': { created: 1, deleted: 1, cleanupDeletes: 1, phases: ['telo skúšky'] },
  'post-delete-status': { created: 1, deleted: 1, cleanupDeletes: 1, phases: ['upratanie podkladu'] },
  'post-delete-ignored': { created: 1, deleted: 1, cleanupDeletes: 1, phases: ['upratanie podkladu'] },
  'comment-network': { created: 1, deleted: 0, cleanupDeletes: 0, phases: ['pridanie vlastného komentára', 'upratanie podkladu'] },
  'post-create-invalid': { created: 0, deleted: 0, cleanupDeletes: 0, phases: ['príprava vlastného podkladu', 'upratanie podkladu'] },
};

/** FAIL musí vzniknúť v správnej fáze a až po presnom počte operácií vloženej chyby. */
export function assertCommentFault(mode: CommentFaultMode, state: CommentObservation): void {
  const expected = EXPECTED[mode];
  assert.equal(state.status, mode === 'body-timeout' ? 'timedOut' : 'failed');
  assert.deepEqual(state.phases, expected.phases, 'Chyba nevznikla v očakávanej fáze.');
  assert.equal(state.postsCreated, 1); assert.equal(state.csrf, 1);
  assert.equal(state.commentsCreated, expected.created); assert.equal(state.commentsDeleted, expected.deleted);
  assert.equal(state.postsDeleted, expected.cleanupDeletes);
  assert.equal(state.writesWithCsrf, 1 + expected.created + expected.deleted + expected.cleanupDeletes);
  assert.equal(state.touch + state.mouse, 2 * (expected.created + expected.deleted));
  assert.equal(state.unexpected, 0);
  const uncertain = ['post-delete-status', 'post-delete-ignored', 'comment-network', 'post-create-invalid'].includes(mode);
  assert.equal(state.cleanup, uncertain ? 'failed' : 'verified'); assert.equal(state.exists, uncertain);
  assert.equal(state.comments, mode === 'comment-network' ? 1 : 0);
}

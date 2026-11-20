import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { CommentMode } from './feed-comments-page';
import { CAROUSEL_CASES, type CarouselMode } from './feed-comment-source-cases';
import { assertCommentFault, COMMENT_FAULT_MODES, commentFailurePhases } from './feed-comments-control';
import type { CommentResult as Result } from './feed-comments-control';

type Variant = { projectName?: string; results?: Result[] };
type Suite = { suites?: Suite[]; specs?: Array<{ tests?: Variant[] }> };
type Report = Suite & { privacySafe?: boolean; guardRejected?: boolean;
  stats?: { expected?: number; unexpected?: number; skipped?: number; flaky?: number } };

/** Bez siete, env, relácie alebo zápisov na hostiteľský zdrojový strom. */
function run(mode: CommentMode | CarouselMode, extra: string[] = []) {
  const root = path.resolve(__dirname, '../..').replaceAll('\\', '/');
  fs.mkdirSync(path.join(root, 'e2e/.auth'), { recursive: true });
  const libraries = fs.realpathSync(path.join(root, 'node_modules')).replaceAll('\\', '/');
  const version = JSON.parse(fs.readFileSync(path.join(libraries, '@playwright/test/package.json'), 'utf8')).version;
  const child = spawnSync('docker', ['run', '--rm', '--init', '--pull=never', '--ipc=host', '--network=none',
    '-v', `${root}/e2e:/work/e2e:ro`, '-v', `${libraries}:/work/node_modules:ro`,
    '-v', `${root}/package.json:/work/package.json:ro`, '-v', `${root}/tsconfig.json:/work/tsconfig.json:ro`,
    '--tmpfs', '/work/e2e/.auth:ro,nosuid,nodev,noexec,size=4k,mode=000', '-w', '/work',
    `mcr.microsoft.com/playwright:v${version}-noble`, 'node', 'e2e/diagnostics-tests/feed-comments-local-runner.mjs', 'test',
    '--config=e2e/diagnostics-tests/feed-comments.playwright.config.ts', '--workers=1', '--retries=0', `--grep=\\[${mode}\\]`, ...extra],
  { encoding: 'utf8', timeout: 70000, maxBuffer: 8 * 1024 * 1024 });
  assert.ok(!child.error, 'Lokálny komentárový proces sa nedokončil.');
  assert.ok(!/SYNTHETIC_PRIVATE/.test(child.stdout + child.stderr), 'Súkromný marker nesmie byť vo výpise.');
  let report: Report;
  try { report = JSON.parse(child.stdout); } catch { throw new Error('Lokálna komentárová kontrola nevrátila report.'); }
  assert.equal(report.privacySafe, true, 'Surové texty alebo prílohy porušili ochranu údajov.');
  const variants: Variant[] = [];
  const visit = (suite: Suite) => { for (const spec of suite.specs ?? []) variants.push(...spec.tests ?? []);
    for (const nested of suite.suites ?? []) visit(nested); };
  visit(report);
  if (report.stats?.unexpected) for (const variant of variants) for (const result of variant.results ?? []) {
    const errors = (result.errors ?? []).map(item => item.message ?? '').join('');
    const phase = commentFailurePhases(result).join('|') || 'nezistené';
    const known = errors.includes('chránenú konfiguráciu') ? 'config' : errors.includes('workers=1') ? 'options'
      : errors.includes('upratanie komentárovej') ? 'cleanup' : errors.includes('Príprava CSRF') ? 'csrf' : 'ui';
    console.log(`[COMMENTS-LOCAL-FAILURE] project=${variant.projectName} status=${result.status} category=${known} phase=${phase}`);
    for (const row of result.stdout ?? []) for (const line of (row.text ?? '').split('\n')) {
      if (/^\[(?:E2E-COMMENTS-(?:CLEANUP|AUDIT)|COMMENTS-SELFTEST)\] [a-zA-Z0-9= -]+$/.test(line)) console.log(line);
    }
  }
  return { code: child.status, report, variants };
}

for (const scenario of CAROUSEL_CASES) test(`karusel podkladu: ${scenario.name}`, () => {
  const { code, report, variants } = run(scenario.mode);
  assert.equal(code, 0); assert.equal(report.stats?.expected, 3); assert.equal(report.stats?.unexpected, 0);
  assert.equal(report.stats?.skipped, 0); assert.equal(variants.length, 3);
  for (const variant of variants) {
    assert.equal(variant.results?.length, 1); assert.equal(variant.results[0].status, 'passed');
  }
});

function observation(result: Result) {
  const output = (result.stdout ?? []).map(row => row.text ?? '').join('');
  const match = /\[COMMENTS-SELFTEST\] mode=([a-z0-9-]+) postExists=(true|false) commentsLeft=(\d+) postsCreated=(\d+) commentsCreated=(\d+) commentsDeleted=(\d+) postsDeleted=(\d+) csrf=(\d+) writesWithCsrf=(\d+) touch=(\d+) mouse=(\d+) unexpected=(\d+) commentDeleteStatus=(none|\d+)/.exec(output);
  assert.ok(match, 'Chýba stav po uprataní.');
  return { status: result.status, phases: commentFailurePhases(result), exists: match[2] === 'true', comments: +match[3], postsCreated: +match[4], commentsCreated: +match[5],
    commentsDeleted: +match[6], postsDeleted: +match[7], csrf: +match[8], writesWithCsrf: +match[9],
    touch: +match[10], mouse: +match[11], unexpected: +match[12],
    commentDeleteStatus: match[13] === 'none' ? null : +match[13],
    cleanup: /\[E2E-COMMENTS-CLEANUP\] state=(verified|failed|not-needed)/.exec(output)?.[1] };
}

for (const mode of ['normal', 'empty-feed'] as const) test(mode === 'normal'
  ? 'riadne UI pridanie a zmazanie plus upratanie podkladu v troch projektoch'
  : 'prázdna Nástenka nevyžaduje staršie príspevky pred prípravou vlastného podkladu', () => {
  const { code, report, variants } = run(mode);
  assert.equal(code, 0); assert.equal(report.stats?.expected, 3); assert.equal(report.stats?.unexpected, 0);
  assert.equal(report.stats?.skipped, 0); assert.equal(variants.length, 3);
  for (const variant of variants) {
    assert.equal(variant.results?.length, 1); const result = variant.results[0]; assert.equal(result.status, 'passed');
    const state = observation(result);
    if (mode === 'empty-feed') assert.ok((result.stdout ?? []).some(row => row.text?.includes('[COMMENTS-EMPTY-FEED] visible=true lists=0')));
    assert.equal(state.exists, false); assert.equal(state.comments, 0); assert.equal(state.cleanup, 'verified');
    assert.equal(state.postsCreated, 1); assert.equal(state.commentsCreated, 1); assert.equal(state.commentsDeleted, 1);
    assert.equal(state.postsDeleted, 1); assert.equal(state.csrf, 1); assert.equal(state.writesWithCsrf, 4);
    assert.equal(state.unexpected, 0);
    assert.equal(state.commentDeleteStatus, 204);
    assert.equal(state.touch, variant.projectName === 'webkit-mobile' ? 4 : 0);
    assert.equal(state.mouse, variant.projectName === 'webkit-mobile' ? 0 : 4);
  }
});

for (const mode of COMMENT_FAULT_MODES) test(`riadená chyba ${mode} nezmení výsledok na PASS`, () => {
  for (const project of ['webkit-desktop', 'webkit-mobile', 'chromium-desktop']) {
    const { code, report, variants } = run(mode, [`--project=${project}`]);
    assert.equal(code, 1); assert.equal(report.stats?.unexpected, 1); assert.equal(variants.length, 1);
    const result = variants[0].results?.[0]; assert.ok(result); const state = observation(result);
    assertCommentFault(mode, state);
    console.log(`[COMMENTS-CONTROL] mode=${mode} project=${project} verified=true`);
  }
});

test('predčasný pád pred komentárom nesmie nahradiť skúšku DELETE 500', () => {
  for (const project of ['webkit-desktop', 'webkit-mobile', 'chromium-desktop']) {
    const { code, report, variants } = run('ui-delete-before-create', [`--project=${project}`]);
    assert.equal(code, 1); assert.equal(report.stats?.unexpected, 1); assert.equal(variants.length, 1);
    const state = observation(variants[0].results![0]);
    assert.equal(state.status, 'failed'); assert.equal(state.cleanup, 'verified'); assert.equal(state.exists, false);
    assert.equal(state.postsCreated, 1); assert.equal(state.commentsCreated, 0); assert.equal(state.commentsDeleted, 0);
    assert.equal(state.postsDeleted, 1); assert.equal(state.comments, 0); assert.equal(state.csrf, 1);
    assert.equal(state.writesWithCsrf, 2); assert.equal(state.unexpected, 0);
    assert.equal(state.commentDeleteStatus, null);
    assert.equal(state.touch, project === 'webkit-mobile' ? 1 : 0);
    assert.equal(state.mouse, project === 'webkit-mobile' ? 0 : 1);
    assert.deepEqual(state.phases, ['otvorenie detailu']);
    assert.throws(() => assertCommentFault('ui-delete-status', state));
  }
});

for (const mode of ['ui-delete-status-503', 'ui-delete-status-no-response'] as const) test(`iná odpoveď ${mode} nesmie nahradiť DELETE 500`, () => {
  for (const project of ['webkit-desktop', 'webkit-mobile', 'chromium-desktop']) {
    const { code, report, variants } = run(mode, [`--project=${project}`]);
    assert.equal(code, 1); assert.equal(report.stats?.unexpected, 1); assert.equal(variants.length, 1);
    const state = observation(variants[0].results![0]); const missing = mode === 'ui-delete-status-no-response';
    assert.equal(state.status, 'failed'); assert.equal(state.commentDeleteStatus, missing ? null : 503);
    assert.equal(state.postsCreated, 1); assert.equal(state.commentsCreated, 1); assert.equal(state.commentsDeleted, 1);
    assert.equal(state.postsDeleted, missing ? 0 : 1); assert.equal(state.comments, missing ? 1 : 0);
    assert.equal(state.cleanup, missing ? 'failed' : 'verified'); assert.equal(state.exists, missing);
    assert.equal(state.csrf, 1); assert.equal(state.writesWithCsrf, missing ? 3 : 4); assert.equal(state.unexpected, 0);
    assert.equal(state.touch, project === 'webkit-mobile' ? 4 : 0); assert.equal(state.mouse, project === 'webkit-mobile' ? 0 : 4);
    assert.deepEqual(state.phases, missing ? ['zmazanie vlastného komentára', 'upratanie podkladu'] : ['zmazanie vlastného komentára']);
    // Skutočné upratanie ostáva overené vyššie; tu izolujeme výhradne klasifikáciu HTTP stavu.
    const classification = { ...state, phases: ['zmazanie vlastného komentára'], exists: false, comments: 0,
      postsDeleted: 1, writesWithCsrf: 4, cleanup: 'verified', commentDeleteStatus: 500 };
    assert.doesNotThrow(() => assertCommentFault('ui-delete-status', classification));
    assert.throws(() => assertCommentFault('ui-delete-status', { ...classification, commentDeleteStatus: state.commentDeleteStatus }),
      error => error instanceof assert.AssertionError && error.operator === 'strictEqual'
        && error.expected === 500 && error.actual === state.commentDeleteStatus
        && error.message.startsWith('DELETE komentára musí potvrdiť presne HTTP 500.'));
  }
});

test('CLI opakovanie sa odmietne pred spustením fixture', () => {
  const { code, report, variants } = run('normal', ['--repeat-each=2']);
  assert.equal(code, 1); assert.equal(report.guardRejected, true); assert.equal(variants.length, 0);
});

test('zlyhané upratanie zastaví zostávajúce projekty pred zápisom', () => {
  const { code, report, variants } = run('post-delete-status');
  assert.equal(code, 1); assert.equal(report.stats?.unexpected, 1); assert.equal(variants.length, 3);
  const first = variants.find(item => item.projectName === 'webkit-desktop');
  assert.equal(first?.results?.[0]?.status, 'failed'); assertCommentFault('post-delete-status', observation(first!.results![0]));
  for (const variant of variants.filter(item => item !== first)) for (const result of variant.results ?? []) {
    assert.equal(result.status, 'skipped');
    assert.ok(!(result.stdout ?? []).some(row => row.text?.includes('[COMMENTS-SELFTEST]')));
  }
});

for (const mode of ['photo-reuse', 'photo-reordered', 'photo-clipped', 'photo-pending-first', 'photo-pending-ready', 'photo-root-candidate'] as const) test(mode === 'photo-reordered'
  ? 'nový príspevok nad podkladom po obnovení stránky nezmení zvolenú kartu'
  : mode === 'photo-pending-first' ? 'rozpracovaná prvá fotka nevylúči dostupnú ďalšiu fotku ani podklad'
  : mode === 'photo-pending-ready' ? 'schválenie prvej fotky počas prípravy nezmení identitu vybraného podkladu'
  : mode === 'photo-root-candidate' ? 'súčet s odpoveďami nebráni výberu ďalšieho podkladu s tromi koreňmi'
  : mode === 'photo-reuse' ? 'fotka a tri pôvodné komentáre ostanú po mobilnom UI pridaní a zmazaní zachované'
  : 'čiastočne orezaný nový komentár musí zlyhať pred ďalším klikom a stále sa upratať', () => {
  const { code, report, variants } = run(mode, ['--project=webkit-mobile']);
  assert.equal(variants.length, 1); assert.equal(report.stats?.skipped, 0);
  assert.equal(code, mode !== 'photo-clipped' ? 0 : 1);
  const result = variants[0].results![0]; const state = observation(result);
  assert.equal(state.status, mode !== 'photo-clipped' ? 'passed' : 'failed');
  assert.equal(state.exists, true); assert.equal(state.comments, 3); assert.equal(state.cleanup, 'verified');
  assert.equal(state.postsCreated, 0); assert.equal(state.postsDeleted, 0);
  assert.equal(state.commentsCreated, 1); assert.equal(state.commentsDeleted, 1);
  assert.equal(state.writesWithCsrf, 2); assert.equal(state.unexpected, 0);
  assert.equal(state.touch, ['photo-pending-first', 'photo-pending-ready'].includes(mode) ? 6 : mode !== 'photo-clipped' ? 4 : 2); assert.equal(state.mouse, 0);
  if (mode === 'photo-clipped') assert.deepEqual(state.phases, ['pridanie vlastného komentára']);
});

for (const mode of ['author-ok', 'author-overlay-stuck', 'author-wrong-url', 'author-other-profile'] as const) {
  test(`desktopový preklik autora rozlišuje stav ${mode}`, () => {
    for (const project of ['webkit-desktop', 'chromium-desktop']) {
      const { code, report, variants } = run(mode, [`--project=${project}`]);
      assert.equal(code, mode === 'author-ok' ? 0 : 1); assert.equal(variants.length, 1);
      assert.equal(report.stats?.skipped, 0);
      const result = variants[0].results![0];
      assert.equal(result.status, mode === 'author-ok' ? 'passed' : 'failed');
      if (mode !== 'author-ok') {
        const errors = (result.errors ?? []).map(error => error.message ?? '').join('');
        assert.ok(errors.includes(mode === 'author-overlay-stuck' ? 'zatvorenie detailu nad profilom' : 'adresa profilu'));
      }
    }
  });
}

for (const mode of ['author-deleted-comment', 'author-next-candidate', 'author-post-gone', 'author-http-error', 'author-bad-data'] as const) {
  test(`výber autora správne vyhodnotí stav ${mode}`, () => {
    const { code, report, variants } = run(mode, ['--project=webkit-desktop']);
    assert.equal(code, 0); assert.equal(report.stats?.expected, 1); assert.equal(report.stats?.skipped, 0);
    assert.equal(variants.length, 1); assert.equal(variants[0].results?.[0]?.status, 'passed');
  });
}

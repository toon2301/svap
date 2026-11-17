import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { COMMENT_MODES, type CommentMode } from './feed-comments-page';

type Result = { status?: string; stdout?: Array<{ text?: string }>; errors?: Array<{ message?: string }> };
type Variant = { projectName?: string; results?: Result[] };
type Suite = { suites?: Suite[]; specs?: Array<{ tests?: Variant[] }> };
type Report = Suite & { privacySafe?: boolean; guardRejected?: boolean;
  stats?: { expected?: number; unexpected?: number; skipped?: number; flaky?: number } };

/** Bez siete, env, relácie alebo zápisov na hostiteľský zdrojový strom. */
function run(mode: CommentMode, extra: string[] = []) {
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
    const phases = ['otvorenie Nástenky', 'príprava vlastného podkladu', 'otvorenie detailu', 'pridanie vlastného komentára',
      'GET po pridaní', 'zmazanie vlastného komentára', 'GET po zmazaní'];
    const phase = phases.find(value => errors.includes(`krok: ${value}.`)) ?? 'nezistené';
    const known = errors.includes('chránenú konfiguráciu') ? 'config' : errors.includes('workers=1') ? 'options'
      : errors.includes('upratanie komentárovej') ? 'cleanup' : errors.includes('Príprava CSRF') ? 'csrf' : 'ui';
    console.log(`[COMMENTS-LOCAL-FAILURE] project=${variant.projectName} status=${result.status} category=${known} phase=${phase}`);
    for (const row of result.stdout ?? []) for (const line of (row.text ?? '').split('\n')) {
      if (/^\[(?:E2E-COMMENTS-(?:CLEANUP|AUDIT)|COMMENTS-SELFTEST)\] [a-zA-Z0-9= -]+$/.test(line)) console.log(line);
    }
  }
  return { code: child.status, report, variants };
}

function observation(result: Result) {
  const output = (result.stdout ?? []).map(row => row.text ?? '').join('');
  const match = /\[COMMENTS-SELFTEST\] mode=([a-z-]+) postExists=(true|false) commentsLeft=(\d+) postsCreated=(\d+) commentsCreated=(\d+) commentsDeleted=(\d+) postsDeleted=(\d+) csrf=(\d+) writesWithCsrf=(\d+) touch=(\d+) mouse=(\d+) unexpected=(\d+)/.exec(output);
  assert.ok(match, 'Chýba stav po uprataní.');
  return { exists: match[2] === 'true', comments: +match[3], postsCreated: +match[4], commentsCreated: +match[5],
    commentsDeleted: +match[6], postsDeleted: +match[7], csrf: +match[8], writesWithCsrf: +match[9],
    touch: +match[10], mouse: +match[11], unexpected: +match[12],
    cleanup: /\[E2E-COMMENTS-CLEANUP\] state=(verified|failed|not-needed)/.exec(output)?.[1] };
}

test('riadne UI pridanie a zmazanie plus upratanie podkladu v troch projektoch', () => {
  const { code, report, variants } = run('normal');
  assert.equal(code, 0); assert.equal(report.stats?.expected, 3); assert.equal(report.stats?.unexpected, 0);
  assert.equal(report.stats?.skipped, 0); assert.equal(variants.length, 3);
  for (const variant of variants) {
    assert.equal(variant.results?.length, 1); const result = variant.results[0]; assert.equal(result.status, 'passed');
    const state = observation(result);
    assert.equal(state.exists, false); assert.equal(state.comments, 0); assert.equal(state.cleanup, 'verified');
    assert.equal(state.postsCreated, 1); assert.equal(state.commentsCreated, 1); assert.equal(state.commentsDeleted, 1);
    assert.equal(state.postsDeleted, 1); assert.equal(state.csrf, 1); assert.equal(state.writesWithCsrf, 4);
    assert.equal(state.unexpected, 0);
    assert.equal(state.touch, variant.projectName === 'webkit-mobile' ? 4 : 0);
    assert.equal(state.mouse, variant.projectName === 'webkit-mobile' ? 0 : 4);
  }
});

for (const mode of COMMENT_MODES.filter(value => value !== 'normal')) test(`riadená chyba ${mode} nezmení výsledok na PASS`, () => {
  for (const project of ['webkit-desktop', 'webkit-mobile', 'chromium-desktop']) {
    const { code, report, variants } = run(mode, [`--project=${project}`]);
    assert.equal(code, 1); assert.equal(report.stats?.unexpected, 1); assert.equal(variants.length, 1);
    const result = variants[0].results?.[0]; assert.ok(result); const state = observation(result);
    assert.equal(state.unexpected, 0);
    const uncertain = ['post-delete-status', 'post-delete-ignored', 'comment-network', 'post-create-invalid'].includes(mode);
    assert.equal(state.cleanup, uncertain ? 'failed' : 'verified'); assert.equal(state.exists, uncertain);
    assert.equal(state.comments, mode === 'comment-network' ? 1 : 0);
    if (mode === 'body-timeout') assert.equal(result.status, 'timedOut');
    if (['comment-network', 'post-create-invalid'].includes(mode)) assert.equal(state.postsDeleted, 0);
    console.log(`[COMMENTS-CONTROL] mode=${mode} project=${project} verified=true`);
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
  assert.equal(first?.results?.[0]?.status, 'failed'); assert.equal(observation(first!.results![0]).cleanup, 'failed');
  for (const variant of variants.filter(item => item !== first)) for (const result of variant.results ?? []) {
    assert.equal(result.status, 'skipped');
    assert.ok(!(result.stdout ?? []).some(row => row.text?.includes('[COMMENTS-SELFTEST]')));
  }
});

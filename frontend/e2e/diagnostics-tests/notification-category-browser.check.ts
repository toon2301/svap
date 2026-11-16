import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { CATEGORY_MODES, type CategoryMode } from './notification-category-page';

type Result = { status?: string; stdout?: Array<{ text?: string }>; attachments?: Array<{ name?: string }> };
type Variant = { projectName?: string; results?: Result[] };
type Suite = { suites?: Suite[]; specs?: Array<{ tests?: Variant[] }> };
type Report = Suite & { stats?: { expected?: number; unexpected?: number; skipped?: number; flaky?: number };
  guardRejected?: boolean;
  config?: { maxFailures?: number; workers?: number };
  localPrivacy?: { safe: boolean; pageSnapshots: number; media: number; privateMarker: boolean } };

/** Bez siete, env a auth; surový report ostáva iba v pamäti a nevypisuje sa ani pri chybe. */
function run(mode: CategoryMode, extra: string[] = []) {
  const frontend = path.resolve(__dirname, '../..').replaceAll('\\', '/');
  const libraries = fs.realpathSync(path.join(frontend, 'node_modules')).replaceAll('\\', '/');
  const version = JSON.parse(fs.readFileSync(path.join(libraries, '@playwright/test/package.json'), 'utf8')).version;
  const child = spawnSync('docker', ['run', '--rm', '--init', '--pull=never', '--ipc=host', '--network=none',
    '-v', `${frontend}/e2e:/work/e2e:ro`, '-v', `${libraries}:/work/node_modules:ro`,
    '-v', `${frontend}/package.json:/work/package.json:ro`, '-v', `${frontend}/tsconfig.json:/work/tsconfig.json:ro`,
    '--tmpfs', '/work/e2e/.auth:ro,nosuid,nodev,noexec,size=4k,mode=000', '-w', '/work',
    `mcr.microsoft.com/playwright:v${version}-noble`, 'node', 'e2e/diagnostics-tests/notification-category-local-runner.mjs', 'test',
    '--config=e2e/diagnostics-tests/notification-category.playwright.config.ts',
    '--workers=1', '--retries=0', `--grep=\\[${mode}\\]`, ...extra],
  { encoding: 'utf8', timeout: 40_000, maxBuffer: 8 * 1024 * 1024 });
  assert.ok(!child.error, 'Kontrolný proces sa nedokončil.');
  for (const output of [child.stdout, child.stderr]) {
    assert.ok(!output.includes('SYNTHETIC_PRIVATE_CATEGORY_NEVER_PRINT'), 'Súkromný marker nesmie byť vo výpise.');
  }
  let report: Report;
  try { report = JSON.parse(child.stdout); } catch { throw new Error('Riadená UI kontrola nevrátila platný report.'); }
  assert.ok(report.localPrivacy?.safe, 'Prílohy alebo výpis riadenej kontroly porušili ochranu údajov.');
  assert.equal(report.localPrivacy.pageSnapshots, 0);
  assert.equal(report.localPrivacy.media, 0);
  assert.equal(report.localPrivacy.privateMarker, false);
  const variants: Variant[] = [];
  const visit = (suite: Suite) => {
    for (const spec of suite.specs ?? []) variants.push(...spec.tests ?? []);
    for (const child of suite.suites ?? []) visit(child);
  };
  visit(report);
  for (const variant of variants) for (const result of variant.results ?? []) {
    assert.ok(!(result.attachments ?? []).some(item => ['screenshot', 'trace', 'video'].includes(item.name ?? '')));
  }
  return { code: child.status, report, variants };
}

/** Len konečný príznak a počty, nikdy hodnoty siedmich volieb alebo cookie. */
function observation(result: Result) {
  const text = (result.stdout ?? []).map(row => row.text ?? '').join('');
  const match = /\[CATEGORY-SELFTEST\] mode=([a-z-]+) restored=(true|false) gets=(\d+) ui=(\d+) restore=(\d+) docs=(\d+) csrf=(\d+) csrfPresent=(true|false) single=(\d+) other=(\d+) seven=(\d+) touch=(\d+) mouse=(\d+) unexpected=(\d+)/.exec(text);
  assert.ok(match, 'Chýba bezpečný stav po fixture teardown.');
  return { mode: match[1], restored: match[2] === 'true', gets: +match[3], ui: +match[4], restore: +match[5],
    docs: +match[6], csrf: +match[7], csrfPresent: match[8] === 'true', single: +match[9], other: +match[10],
    seven: +match[11], touch: +match[12], mouse: +match[13], unexpected: +match[14],
    cleanup: /\[E2E-CATEGORY\] restored=(verified|failed) fields=7/.exec(text)?.[1] };
}

for (const mode of ['normal-on', 'normal-off'] as const) {
  test(`oba WebKity: ${mode}, jeden UI PATCH, GET, F5, skutočný pointer a návrat`, () => {
    const { code, report, variants } = run(mode);
    assert.equal(code, 0); assert.equal(report.stats?.expected, 2); assert.equal(report.stats?.unexpected, 0);
    assert.equal(report.stats?.skipped, 0); assert.equal(variants.length, 2);
    for (const variant of variants) {
      assert.equal(variant.results?.length, 1); const attempt = variant.results[0];
      assert.equal(attempt.status, 'passed'); const state = observation(attempt);
      assert.equal(state.restored, true); assert.equal(state.cleanup, 'verified');
      assert.equal(state.gets, 6); assert.equal(state.ui, 1); assert.equal(state.restore, 1);
      assert.equal(state.single, 1); assert.equal(state.other, 0); assert.equal(state.seven, 1);
      assert.equal(state.docs, 2); assert.equal(state.csrf, 1); assert.equal(state.csrfPresent, true);
      assert.equal(state.unexpected, 0);
      assert.equal(state.touch, variant.projectName === 'webkit-mobile' ? 1 : 0);
      assert.equal(state.mouse, variant.projectName === 'webkit-desktop' ? 1 : 0);
    }
  });
}

for (const mode of CATEGORY_MODES.filter(mode => !mode.startsWith('normal-'))) {
  test(`riadený prípad ${mode}: oba WebKity a overenie návratu`, () => {
    for (const project of ['webkit-desktop', 'webkit-mobile']) {
      const { code, report, variants } = run(mode, [`--project=${project}`]);
      assert.equal(code, 1, 'Riadená chyba sa nesmie zmeniť na zelený výsledok.');
      assert.equal(report.stats?.unexpected, 1); assert.equal(report.stats?.skipped, 0);
      assert.equal(variants.length, 1); assert.equal(variants[0].results?.length, 1);
      const attempt = variants[0].results[0]; const state = observation(attempt);
      assert.equal(state.unexpected, 0);
      if (mode === 'master-off') {
        assert.equal(state.ui + state.restore + state.single + state.other + state.seven, 0);
        assert.equal(state.docs, 0); assert.equal(state.gets, 1); assert.equal(state.cleanup, undefined);
      } else {
        assert.equal(state.restore, 1); assert.equal(state.seven, 1); assert.equal(state.csrfPresent, true);
        assert.ok(state.gets >= 3);
        const unsafe = mode.startsWith('restore-') || mode.startsWith('change-redirect-')
          || ['change-network', 'change-proxy'].includes(mode);
        assert.equal(state.cleanup, unsafe ? 'failed' : 'verified');
        assert.equal(state.restored, !['restore-status', 'restore-ignored'].includes(mode));
        if (mode === 'bad-payload') { assert.equal(state.other, 1); assert.equal(state.ui, 0); }
        if (mode === 'duplicate') { assert.equal(state.single, 2); assert.equal(state.ui, 1); }
        if (mode === 'body-timeout') assert.equal(attempt.status, 'timedOut');
      }
      console.log(`[CATEGORY-SELFTEST-CHECK] mode=${mode} project=${project} status=verified`);
    }
  });
}

test('nebezpečné workers, retry, repeat a max-failures sa odmietnu pred API', () => {
  for (const option of ['--workers=2', '--retries=1', '--repeat-each=2', '--max-failures=0']) {
    const { code, report, variants } = run('normal-on', ['--project=webkit-desktop', option]);
    console.log(`[CATEGORY-GUARD] option=${option} effectiveMaxFailures=${report.config?.maxFailures} exit=${code}`);
    for (const variant of variants) for (const attempt of variant.results ?? []) {
      const output = (attempt.stdout ?? []).map(row => row.text ?? '').join('');
      console.log(/\[E2E-CATEGORY-RUN\][^\n]+/.exec(output)?.[0] ?? '[CATEGORY-GUARD] run=not-started');
    }
    assert.equal(code, 1);
    if (option === '--repeat-each=2') { assert.equal(report.guardRejected, true); assert.equal(variants.length, 0); }
    for (const variant of variants) for (const attempt of variant.results ?? []) {
      if (attempt.status === 'skipped') continue;
      const state = observation(attempt);
      assert.equal(state.gets + state.ui + state.restore + state.csrf + state.docs, 0);
    }
  }
});

test('prvý zlyhaný návrat zastaví druhý projekt ešte pred API', () => {
  const { code, report, variants } = run('restore-status');
  assert.equal(code, 1); assert.equal(report.stats?.unexpected, 1); assert.equal(variants.length, 2);
  const first = variants.find(row => row.projectName === 'webkit-desktop');
  assert.equal(first?.results?.[0].status, 'failed'); assert.equal(observation(first.results[0]).cleanup, 'failed');
  const second = variants.find(row => row.projectName === 'webkit-mobile');
  assert.ok(second, 'Povinný druhý projekt musí byť vo výbere.');
  for (const attempt of second?.results ?? []) {
    assert.equal(attempt.status, 'skipped');
    assert.doesNotMatch((attempt.stdout ?? []).map(row => row.text ?? '').join(''), /\[(?:CATEGORY-SELFTEST|E2E-CATEGORY)\]/);
  }
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

type Result = { status?: string; stdout?: Array<{ text?: string }>; attachments?: Array<{ name?: string }>;
  errors?: Array<{ message?: string; stack?: string }> };
type Variant = { projectName?: string; results?: Result[] };
type Suite = { suites?: Suite[]; specs?: Array<{ tests?: Variant[] }> };

/** Report ostáva v pamäti; ani pri chybe sa nevypíšu jeho texty alebo prílohy. */
function run(extra: string[] = []) {
  const frontend = path.resolve(__dirname, '../..');
  const libraries = fs.realpathSync(path.join(frontend, 'node_modules'));
  const version = JSON.parse(fs.readFileSync(path.join(libraries, '@playwright/test/package.json'), 'utf8')).version;
  const child = spawnSync('docker', ['run', '--rm', '--init', '--ipc=host', '--pull=never', '--network=none',
    '-v', `${frontend}:/work`, '-v', `${libraries}:/work/node_modules:ro`, '-w', '/work',
    `mcr.microsoft.com/playwright:v${version}-noble`, 'node', 'node_modules/@playwright/test/cli.js', 'test',
    '--config=e2e/diagnostics-tests/notification-preferences.playwright.config.ts', '--workers=1', '--retries=0', ...extra],
  { encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  assert.ok(!child.error, 'Kontrolný podproces sa nedokončil.');
  assert.ok(![child.stdout, child.stderr].some(output => output.includes('SYNTHETIC_PRIVATE_PREFS_NEVER_PRINT')),
    'Súkromná kontrolná hodnota nesmie byť v reporte ani v stderr.');
  let report: Suite & { stats?: { expected?: number; unexpected?: number; skipped?: number; flaky?: number } };
  try { report = JSON.parse(child.stdout); } catch { throw new Error('Kontrola nevrátila platný report.'); }
  const variants: Variant[] = [];
  const visit = (suite: Suite) => {
    for (const spec of suite.specs ?? []) variants.push(...spec.tests ?? []);
    for (const nested of suite.suites ?? []) visit(nested);
  };
  visit(report);
  for (const variant of variants) for (const attempt of variant.results ?? []) {
    assert.ok(!(attempt.attachments ?? []).some(item => ['screenshot', 'trace', 'video'].includes(item.name ?? '')));
    const output = (attempt.stdout ?? []).map(item => item.text ?? '').join('');
    assert.ok(!output.includes('SYNTHETIC_PRIVATE_PREFS_NEVER_PRINT'));
    for (const error of attempt.errors ?? []) assert.ok(!error.message?.includes('SYNTHETIC_PRIVATE_PREFS_NEVER_PRINT'));
  }
  return { code: child.status, report, variants };
}

/** Z riadeného reportu sa odčíta len príznak návratu a počty sieťových volaní. */
function observation(result: Result) {
  const output = (result.stdout ?? []).map(item => item.text ?? '').join('');
  const match = /^\[PREFERENCES-SELFTEST\] mode=(normal|restore-status|restore-shape) restored=(true|false) gets=(\d+) patches=(\d+) csrf=(\d+) csrfPresent=(true|false) unexpected=(\d+)$/m.exec(output);
  assert.ok(match, 'Chýba bezpečná kontrola stavu po teardown.');
  return { mode: match[1], restored: match[2] === 'true', gets: Number(match[3]), patches: Number(match[4]),
    csrf: Number(match[5]), csrfPresent: match[6] === 'true', unexpected: Number(match[7]) };
}

test('finally obnoví voľby aj po chybe a timeoute; zlyhanie obnovy ostane FAIL', () => {
  const { code, report, variants } = run();
  assert.equal(code, 1, 'Riadené chyby sa nesmú zmeniť na zelený výsledok.');
  assert.deepEqual(report.stats && { passed: report.stats.expected, failed: report.stats.unexpected,
    skipped: report.stats.skipped, flaky: report.stats.flaky }, { passed: 3, failed: 12, skipped: 0, flaky: 0 });
  assert.equal(variants.length, 15);
  for (const project of ['webkit-desktop', 'webkit-mobile', 'chromium-desktop']) {
    const active = variants.filter(item => item.projectName === project);
    assert.equal(active.length, 5);
    const observations = active.map(item => {
      assert.equal(item.results?.length, 1);
      const attempt = item.results[0];
      const observed = observation(attempt);
      assert.equal(observed.unexpected, 0);
      assert.equal(observed.gets, 3);
      assert.equal(observed.patches, 2);
      assert.equal(observed.csrf, 1);
      assert.equal(observed.csrfPresent, true);
      const output = (attempt.stdout ?? []).map(item => item.text ?? '').join('');
      assert.match(output, new RegExp(`\\[E2E-PREFERENCES\\] restored=${observed.mode === 'normal' ? 'verified' : 'failed'} fields=7`));
      return { ...observed, status: attempt.status };
    });
    assert.equal(observations.filter(item => item.mode === 'normal' && item.restored).length, 3);
    assert.equal(observations.filter(item => item.mode === 'restore-status' && !item.restored && item.status === 'failed').length, 1);
    assert.equal(observations.filter(item => item.mode === 'restore-shape' && item.restored && item.status === 'failed').length, 1);
    assert.equal(observations.filter(item => item.status === 'timedOut' && item.restored).length, 1);
  }
  console.log('[PREFERENCES-SELFTEST] projects=3 passed=3 controlledFailures=12 skipped=0');
});

test('workers=2 odmietne zápis ešte pred prvým API volaním', () => {
  const { code, report, variants } = run(['--workers=2', '--project=chromium-desktop', '--grep=riadny návrat']);
  assert.equal(code, 1);
  assert.equal(report.stats?.unexpected, 1);
  assert.equal(variants.length, 1);
  const observed = observation(variants[0].results![0]);
  assert.equal(observed.gets + observed.patches + observed.csrf, 0);
  assert.equal(observed.unexpected, 0);
});

test('zlyhanie obnovy v prvom projekte zastaví ďalšie dva ešte pred prípravou API', () => {
  const { code, report, variants } = run(['--max-failures=1', '--grep=zlyhanie fixture zostane FAIL']);
  assert.equal(code, 1);
  assert.equal(report.stats?.unexpected, 1);
  assert.equal(report.stats?.expected, 0);
  assert.equal(variants.length, 3);
  const first = variants.find(item => item.projectName === 'webkit-desktop');
  assert.equal(first?.results?.length, 1);
  assert.equal(first.results[0].status, 'failed');
  const observed = observation(first.results[0]);
  assert.equal(observed.mode, 'restore-status');
  assert.equal(observed.restored, false);
  assert.equal(observed.gets, 3);
  assert.equal(observed.patches, 2);
  for (const variant of variants.filter(item => item.projectName !== 'webkit-desktop')) {
    for (const attempt of variant.results ?? []) {
      assert.equal(attempt.status, 'skipped');
      const output = (attempt.stdout ?? []).map(item => item.text ?? '').join('');
      assert.doesNotMatch(output, /\[(?:PREFERENCES-SELFTEST|E2E-PREFERENCES)\]/);
    }
  }
});

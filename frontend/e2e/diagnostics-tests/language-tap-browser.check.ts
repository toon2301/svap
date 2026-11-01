import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/** Výstup podprocesu sa spracuje v pamäti; surové chyby a report sa nevypisujú. */
test('izolovaná diagnostika ťuku funguje vo všetkých troch prehliadačoch', () => {
  const frontend = path.resolve(__dirname, '../..');
  const libraries = fs.realpathSync(path.join(frontend, 'node_modules'));
  const version = JSON.parse(fs.readFileSync(path.join(libraries, '@playwright/test/package.json'), 'utf8')).version;
  const result = spawnSync('docker', [
    'run', '--rm', '--init', '--ipc=host', '--pull=never',
    '-v', `${frontend}:/work`, '-v', `${libraries}:/work/node_modules:ro`, '-w', '/work',
    `mcr.microsoft.com/playwright:v${version}-noble`,
    'node', 'node_modules/@playwright/test/cli.js', 'test',
    '--config=e2e/diagnostics-tests/language-tap.playwright.config.ts', '--workers=1', '--retries=0',
  ], { cwd: frontend, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
  assert(!result.error, 'Podproces diagnostiky sa nepodarilo dokončiť.');
  type Suite = { suites?: Suite[]; specs?: Array<{ tests?: Array<{
    projectName?: string; results?: Array<{
      status?: string; errors?: Array<{ stack?: string; message?: string }>; stdout?: Array<{ text?: string }>;
    }>;
  }> }> };
  let report: Suite & { stats?: { expected?: number; unexpected?: number; skipped?: number; flaky?: number } };
  try { report = JSON.parse(result.stdout); } catch { throw new Error('Diagnostika nevrátila platný report.'); }
  if (result.status !== 0) {
    const walk = (suite: Suite): void => {
      for (const spec of suite.specs ?? []) for (const variant of spec.tests ?? []) {
        for (const attempt of variant.results ?? []) {
          if (attempt.status === 'passed') continue;
          const line = (attempt.errors ?? []).map((error) =>
            /language-tap\.scenario\.ts:(\d+)/.exec(error.stack ?? error.message ?? '')?.[1]).find(Boolean) ?? 'n/a';
          const project = ['webkit-desktop', 'webkit-mobile', 'chromium-desktop'].includes(variant.projectName ?? '')
            ? variant.projectName : 'other';
          const stages = (attempt.stdout ?? []).flatMap((item) => item.text?.split('\n') ?? [])
            .filter((value) => /^\[LANGUAGE-TAP-SELFTEST-STAGE\] phase=(start|gesture|cancel|unrelated|limit|reload)$/.test(value));
          console.log(`[LANGUAGE-TAP-SELFTEST-FAIL] project=${project} line=${line}`);
          if (stages.length) console.log(stages[stages.length - 1]);
        }
      }
      for (const child of suite.suites ?? []) walk(child);
    };
    walk(report);
  }
  assert.equal(result.status, 0, 'Izolované gestá musia prejsť vo všetkých projektoch.');
  assert.equal(report.stats?.expected, 3);
  assert.equal(report.stats?.unexpected, 0);
  assert.equal(report.stats?.skipped, 0);
  assert.equal(report.stats?.flaky, 0);
  console.log('[LANGUAGE-TAP-SELFTEST] projects=3 passed=3 failed=0 skipped=0');
});

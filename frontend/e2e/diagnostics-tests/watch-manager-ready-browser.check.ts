import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

type Suite = { suites?: Suite[]; specs?: Array<{ tests?: Array<{ projectName?: string;
  results?: Array<{ status?: string; errors?: Array<{ stack?: string; message?: string }> }> }> }> };

/** Surový syntetický report zostane v pamäti; výstup obsahuje iba projekt a riadok. */
test('pomocník 328 odmietne loading aj nesprávny limit a overí stavy 0, 4, 5 bez Railway', () => {
  const frontend = path.resolve(__dirname, '../..');
  const libraries = fs.realpathSync(path.join(frontend, 'node_modules'));
  const version = JSON.parse(fs.readFileSync(path.join(libraries, '@playwright/test/package.json'), 'utf8')).version;
  const result = spawnSync('docker', ['run', '--rm', '--init', '--ipc=host', '--pull=never',
    '-v', `${frontend}:/work`, '-v', `${libraries}:/work/node_modules:ro`, '-w', '/work',
    `mcr.microsoft.com/playwright:v${version}-noble`, 'node', 'node_modules/@playwright/test/cli.js', 'test',
    '--config=e2e/diagnostics-tests/watch-manager-ready.playwright.config.ts', '--workers=1', '--retries=0',
  ], { cwd: frontend, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  assert.ok(!result.error, 'Izolovaný browser podproces sa nepodarilo dokončiť.');
  let report: Suite & { stats?: { expected?: number; unexpected?: number; skipped?: number; flaky?: number } };
  try { report = JSON.parse(result.stdout); } catch { throw new Error('Izolovaný test nevrátil platný report.'); }
  if (result.status !== 0) {
    const visit = (suite: Suite): void => {
      for (const spec of suite.specs ?? []) for (const variant of spec.tests ?? []) for (const attempt of variant.results ?? []) {
        if (attempt.status === 'passed') continue;
        const project = ['webkit-desktop', 'webkit-mobile', 'chromium-desktop'].includes(variant.projectName ?? '') ? variant.projectName : 'other';
        const line = (attempt.errors ?? []).map(error => /watch-manager-ready\.scenario\.ts:(\d+)/.exec(error.stack ?? error.message ?? '')?.[1]).find(Boolean) ?? 'n/a';
        console.log(`[WATCH-MANAGER-SELFTEST-FAIL] project=${project} line=${line}`);
      }
      for (const child of suite.suites ?? []) visit(child);
    };
    visit(report);
  }
  assert.equal(result.status, 0, 'Izolované kontroly správy sledovaní musia prejsť.');
  assert.deepEqual(report.stats && { passed: report.stats.expected, failed: report.stats.unexpected,
    skipped: report.stats.skipped, flaky: report.stats.flaky }, { passed: 27, failed: 0, skipped: 0, flaky: 0 });
  console.log('[WATCH-MANAGER-SELFTEST] projects=3 passed=27 failed=0 skipped=0');
});

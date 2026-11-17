import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

/** Surové reporty ostávajú v pamäti; prílohy sa skontrolujú pred zánikom kontajnera. */
try {
  assert.equal(process.platform, 'linux');
  assert.equal(Object.values(os.networkInterfaces()).flat().filter(row => row && !row.internal).length, 0);
  assert.equal(fs.existsSync('/work/.env.e2e'), false);
  assert.equal(fs.existsSync('/work/e2e/.auth/user.json'), false);
  const args = process.argv.slice(2);
  assert.equal(args[0], 'test');
  assert.equal(args.filter(arg => arg.startsWith('--config=')).join(''), '--config=e2e/diagnostics-tests/feed-comments.playwright.config.ts');
  const child = spawnSync(process.execPath, ['/work/node_modules/@playwright/test/cli.js', ...args], {
    cwd: '/work', encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, PLAYWRIGHT_NO_COPY_PROMPT: '1' },
  });
  assert.ok(!child.error); assert.ok(!/SYNTHETIC_PRIVATE/.test(child.stdout + child.stderr));
  if ((child.stdout + child.stderr).includes('E2E_COMMENTS_REPEATS_REJECTED')) {
    assert.equal(child.status, 1); assert.ok(!(child.stdout + child.stderr).includes('[COMMENTS-SELFTEST]'));
    console.log(JSON.stringify({ guardRejected: true, suites: [], privacySafe: true })); process.exitCode = 1;
  } else {
    const report = JSON.parse(child.stdout);
    let contexts = 0;
    const visit = suite => {
      for (const spec of suite.specs ?? []) for (const variant of spec.tests ?? []) for (const result of variant.results ?? []) {
        for (const attachment of result.attachments ?? []) {
          assert.ok(!['screenshot', 'trace', 'video'].includes(attachment.name));
          if (!String(attachment.contentType).startsWith('text/')) continue;
          let content = '';
          if (attachment.path) {
            const location = fs.realpathSync(attachment.path);
            assert.ok(location.startsWith('/tmp/feed-comments-selftest/')); assert.ok(fs.statSync(location).size < 1024 * 1024);
            content = fs.readFileSync(location, 'utf8');
          } else if (attachment.body) content = Buffer.from(attachment.body, 'base64').toString('utf8');
          assert.ok(!/SYNTHETIC_PRIVATE|^# Page snapshot\b|^```yaml/m.test(content));
          if (attachment.name === 'error-context') contexts += 1;
        }
      }
      for (const nested of suite.suites ?? []) visit(nested);
    };
    visit(report); report.privacySafe = true; report.checkedContexts = contexts;
    console.log(JSON.stringify(report)); process.exitCode = child.status ?? 2;
  }
} catch {
  console.log(JSON.stringify({ privacySafe: false, reason: 'LOCAL_COMMENTS_CONTROL_FAILED' })); process.exitCode = 2;
}

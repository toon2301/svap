import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

/** Kontroluje sa obsah, nie samotná existencia metadátovej prílohy error-context. */
function privateContent(text) {
  return /SYNTHETIC_PRIVATE|^# Page snapshot\b|^```yaml/m.test(text);
}

try {
  if (process.argv[2] === '--privacy-self-check') {
    assert.equal(privateContent('SYNTHETIC_PRIVATE_VALUE'), true);
    assert.equal(privateContent('# Page snapshot\nobsah'), true);
    assert.equal(privateContent('```yaml\nobsah'), true);
    assert.equal(privateContent('# Test info\n# Error details\nPevná chyba.'), false);
    assert.equal(privateContent('# Test source\nKód bez údajov účtu.'), false);
    console.log(JSON.stringify({ ok: true, privacyChecks: 5 }));
  } else {
    assert.equal(process.platform, 'linux');
    assert.equal(Object.values(os.networkInterfaces()).flat().filter(row => row && !row.internal).length, 0);
    assert.equal(fs.existsSync('/work/.env.e2e'), false);
    assert.equal(fs.existsSync('/work/e2e/.auth/user.json'), false);
    const args = process.argv.slice(2);
    assert.equal(args[0], 'test');
    assert.equal(args.filter(arg => arg.startsWith('--config=')).join(''),
      '--config=e2e/diagnostics-tests/notification-category.playwright.config.ts');
    const child = spawnSync(process.execPath, ['/work/node_modules/@playwright/test/cli.js', ...args], {
      cwd: '/work', encoding: 'utf8', timeout: 30_000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, PLAYWRIGHT_NO_COPY_PROMPT: '1' },
    });
    assert.ok(!child.error);
    assert.ok(!/SYNTHETIC_PRIVATE/.test(child.stdout + child.stderr));
    if ((child.stdout + child.stderr).includes('E2E_CATEGORY_REPEATS_REJECTED')) {
      assert.notEqual(child.status, 0);
      assert.ok(!(child.stdout + child.stderr).includes('[CATEGORY-SELFTEST]'));
      console.log(JSON.stringify({ guardRejected: true, suites: [], localPrivacy: {
        safe: true, checkedContexts: 0, pageSnapshots: 0, media: 0, privateMarker: false,
      } }));
      process.exitCode = 1;
    } else {
      const report = JSON.parse(child.stdout);
      const safety = { safe: true, checkedContexts: 0, pageSnapshots: 0, media: 0, privateMarker: false };
      function visit(suite) {
        for (const spec of suite.specs ?? []) for (const variant of spec.tests ?? []) for (const result of variant.results ?? []) {
          for (const attachment of result.attachments ?? []) {
            if (['screenshot', 'trace', 'video'].includes(attachment.name)) safety.media += 1;
            if (!String(attachment.contentType).startsWith('text/')) continue;
            let content = '';
            if (attachment.path) {
              const location = fs.realpathSync(attachment.path);
              assert.ok(location.startsWith('/tmp/notification-category-selftest/'));
              assert.ok(fs.statSync(location).size < 1024 * 1024);
              content = fs.readFileSync(location, 'utf8');
            } else if (attachment.body) content = Buffer.from(attachment.body, 'base64').toString('utf8');
            if (attachment.name === 'error-context') safety.checkedContexts += 1;
            if (/^# Page snapshot\b|^```yaml/m.test(content)) safety.pageSnapshots += 1;
            if (/SYNTHETIC_PRIVATE/.test(content)) safety.privateMarker = true;
            if (privateContent(content)) safety.safe = false;
          }
        }
        for (const childSuite of suite.suites ?? []) visit(childSuite);
      }
      visit(report);
      safety.safe &&= safety.media === 0;
      if (!safety.safe) {
        // Nič zo súkromného reportu sa pri chybe nesmie dostať ani do stdout rodiča.
        console.log(JSON.stringify({ localPrivacy: safety })); process.exitCode = 2;
      } else {
        report.localPrivacy = safety;
        console.log(JSON.stringify(report)); process.exitCode = child.status ?? 2;
      }
    }
  }
} catch {
  console.log(JSON.stringify({ localPrivacy: { safe: false }, reason: 'LOCAL_CATEGORY_CONTROL_FAILED' }));
  process.exitCode = 2;
}

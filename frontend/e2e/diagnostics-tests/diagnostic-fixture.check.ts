import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

type RunResult = {
  status?: string;
  stdout?: Array<{ text?: string }>;
  attachments?: Array<{ name?: string; contentType?: string; path?: string }>;
  errors?: Array<{ message?: string }>;
};
type CollectedTest = { projectName?: string; expectedStatus?: string; results?: RunResult[] };
type Suite = { suites?: Suite[]; specs?: Array<{ tests?: CollectedTest[] }> };
type Report = { suites?: Suite[]; stats?: { expected?: number; unexpected?: number; skipped?: number; flaky?: number } };

/** Vyberie iba testové výsledky, nie texty chýb ani celé reporty. */
function collect(suites: Suite[]): CollectedTest[] {
  return suites.flatMap((suite) => [
    ...(suite.specs ?? []).flatMap((spec) => spec.tests ?? []),
    ...collect(suite.suites ?? []),
  ]);
}

test('izolovaný fixture zachová PASS/FAIL/SKIP a zachytí iba pôvodný pád', () => {
  const frontend = path.resolve(__dirname, '../..');
  const docker = process.env.E2E_DIAGNOSTICS_DOCKER === '1';
  const args = [
    '--config=e2e/diagnostics-tests/diagnostics-fixture.playwright.config.ts',
    '--workers=1', '--retries=0',
  ];
  const libraries = fs.realpathSync(path.join(frontend, 'node_modules'));
  const version = JSON.parse(fs.readFileSync(path.join(libraries, '@playwright/test/package.json'), 'utf8')).version;
  // Oddelená pracovná kópia môže mať junction node_modules. Docker dostane jeho
  // skutočný cieľ explicitne a read-only; npx nesmie nič doinštalovať zo siete.
  const command = docker ? 'docker' : process.execPath;
  const commandArgs = docker ? [
    'run', '--rm', '--init', '--ipc=host',
    '-v', `${frontend}:/work`, '-v', `${libraries}:/work/node_modules:ro`, '-w', '/work',
    `mcr.microsoft.com/playwright:v${version}-noble`,
    'node', 'node_modules/@playwright/test/cli.js', 'test', ...args,
  ] : [path.join(frontend, 'node_modules/@playwright/test/cli.js'), 'test', ...args];
  const child = spawnSync(command, commandArgs,
    { cwd: frontend, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });

  // Ani pri chybe podprocesu sa nevypisuje jeho stdout/stderr alebo nespracovaný report.
  assert(!child.error, 'Self-test podproces sa nepodarilo dokončiť.');
  assert(child.status === 1, 'Úmyselný beforeEach pád musí zachovať návratový kód 1.');
  let report: Report;
  try { report = JSON.parse(child.stdout) as Report; } catch {
    throw new Error('Self-test nevrátil platný JSON report.');
  }
  assert(report.stats?.expected === 3, 'Self-test musí mať tri úspešné varianty.');
  assert(report.stats?.unexpected === 3, 'Self-test musí zachovať tri neúspešné varianty.');
  assert(report.stats?.skipped === 3, 'Self-test musí zachovať tri preskočené varianty.');
  assert(report.stats?.flaky === 0, 'Self-test nesmie mať automatické opakovania.');

  const tests = collect(report.suites ?? []);
  assert(tests.length === 9, 'Self-test musí obsahovať presne deväť variantov.');
  let evidenceBlocks = 0;
  for (const project of ['webkit-desktop', 'webkit-mobile', 'chromium-desktop']) {
    const variants = tests.filter((candidate) => candidate.projectName === project);
    assert(variants.length === 3, 'Každý projekt musí mať tri varianty.');
    const results = variants.map((variant) => {
      assert(variant.results?.length === 1, 'Každý variant musí mať presne jeden pokus.');
      return { variant, result: variant.results[0] };
    });
    assert(results.filter(({ result }) => result.status === 'passed').length === 1, 'Projekt musí mať jeden PASS.');
    assert(results.filter(({ result }) => result.status === 'failed').length === 1, 'Projekt musí mať jeden FAIL.');
    assert(results.filter(({ result }) => result.status === 'skipped').length === 1, 'Projekt musí mať jeden SKIP.');
    for (const { variant, result } of results) {
      const output = (result.stdout ?? []).map((item) => item.text ?? '').join('');
      const blocks = (output.match(/^\[E2E-EVIDENCE\]/gm) ?? []).length;
      const attachments = (result.attachments ?? []).filter((item) => item.name === 'failure-evidence');
      assert(!(result.attachments ?? []).some((item) => /^(?:trace|screenshot|video)$/.test(item.name ?? '')),
        'Self-test nesmie vytvárať obrazové prílohy ani trace.');
      for (const attachment of result.attachments ?? []) {
        if (attachment.name !== 'error-context' || !attachment.path) continue;
        const localPath = docker && attachment.path.startsWith('/work/')
          ? path.join(frontend, attachment.path.slice('/work/'.length)) : attachment.path;
        assert(!fs.readFileSync(localPath, 'utf8').includes('# Page snapshot'),
          'Automatická textová snímka stránky musí byť vypnutá aj bez trace.');
      }
      if (result.status !== 'failed') {
        assert(blocks === 0 && attachments.length === 0, 'PASS ani SKIP nesmie vytvoriť dôkazy pádu.');
        continue;
      }
      assert(variant.expectedStatus === 'passed', 'Úmyselný pád nesmie byť označený test.fail.');
      assert(blocks === 1 && attachments.length === 1, 'BeforeEach pád musí vytvoriť presne jeden blok a prílohu.');
      assert(attachments[0].contentType === 'text/plain', 'Príloha musí byť iba textová diagnostika.');
      assert((output.match(/^\[E2E-SESSION\] snapshot=unavailable /gm) ?? []).length === 2,
        'Inline prázdny storageState musí dať unavailable pri oboch snímkach relácie.');
      assert(/GET\s+\/dashboard\s+200/.test(output), 'Dôkaz musí zahŕňať úvodnú navigáciu z beforeEach.');
      assert(/GET\s+\/api\/auth\/me\/\s+200/.test(output), 'Dôkaz musí zahŕňať požiadavku z beforeEach.');
      assert((result.errors ?? []).some((error) => error.message?.includes('SYNTHETIC_PREPARATION_FAILURE')),
        'Pád musí pochádzať z prípravy, nie z tela testu.');
      evidenceBlocks += blocks;
    }
  }
  console.log(`[DIAGNOSTICS-SELFTEST] projects=3 passed=3 failed=3 skipped=3 evidence=${evidenceBlocks}`);
});

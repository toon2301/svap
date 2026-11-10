import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { classifyBrowserLine, summarizeReport } from './safe-run-report';

const MODES = ['smoke', 'colors', 'auth-diagnostic', '223-baseline', '223-expanded'] as const;
type Mode = typeof MODES[number];

/** Iba dva schválené testy; opakovanie je diagnostika, nie automatický retry. */
export function playwrightArgs(mode: Mode): string[] {
  const common = ['--workers=1', '--retries=0', '--reporter=json'];
  if (mode === 'smoke') return ['--grep=@smoke', ...common];
  if (mode === 'colors') return ['e2e/reset-password-colors.spec.ts', ...common];
  if (mode === 'auth-diagnostic') return ['e2e/auth-session.spec.ts', '--grep=a cleared cookie session cannot survive a full reload',
    '--project=webkit-mobile', '--repeat-each=3', ...common];
  return ['e2e/offer-reviews-back.spec.ts', 'e2e/search-country-scroll.spec.ts',
    '--grep=after a reload the arrow returns to the plain profile without a highlighted or flipped card$|typing alone automatically searches, without Enter, and uses the independent IP country$',
    '--project=webkit-desktop', '--project=webkit-mobile', '--repeat-each=10', ...common];
}

// Meranie vznikne v TOM ISTOM kontajneri pred spustením testov. Nečíta env súbor.
const bootstrap = `const fs=require('node:fs'),cp=require('node:child_process'),os=require('node:os');
const read=p=>{try{const v=fs.readFileSync(p,'utf8').trim();return v==='max'?'max':/^\\d+$/.test(v)?Number(v):null}catch{return null}};
const shm=fs.statfsSync('/dev/shm');
process.stderr.write('[E2E-RESOURCES] '+JSON.stringify({shmBytes:shm.bsize*shm.blocks,shmAvailable:shm.bsize*shm.bavail,totalBytes:os.totalmem(),freeBytes:os.freemem(),memoryMax:read('/sys/fs/cgroup/memory.max')})+'\\n');
const child=cp.spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(1)],{stdio:'inherit'});
child.on('error',()=>{process.exitCode=2});child.on('exit',code=>{process.exitCode=code===null?2:code});`;

/** Zmeria jeden explicitne vybraný beh; neprihlasuje znova po zlyhaní setupu. */
export async function runTargeted(mode: Mode, envFile: string, output: string): Promise<number> {
  const frontend = path.resolve(__dirname, '../..');
  if (!fs.statSync(envFile).isFile()) throw new Error('Chýba pôvodný lokálny env súbor.');
  const libraries = fs.realpathSync(path.join(frontend, 'node_modules'));
  const version = JSON.parse(fs.readFileSync(path.join(libraries, '@playwright/test/package.json'), 'utf8')).version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Neplatná verzia Playwrightu.');
  const ipc = mode === '223-expanded' ? ['--ipc=private', '--shm-size=6g'] : ['--ipc=host'];
  const startedAt = new Date().toISOString();
  const started = performance.now();
  let stdout = '';
  let pending = '';
  let resources: Record<string, number | 'max' | null> | null = null;
  const browserCounts: Record<string, number> = {};
  const browserEvents: Array<ReturnType<typeof classifyBrowserLine> & { observedAt: number }> = [];
  const consume = (line: string): void => {
    if (line.startsWith('[E2E-RESOURCES] ')) {
      try {
        const raw = JSON.parse(line.slice('[E2E-RESOURCES] '.length));
        resources = Object.fromEntries(['shmBytes', 'shmAvailable', 'totalBytes', 'freeBytes', 'memoryMax'].map(key =>
          [key, raw[key] === 'max' ? 'max' : Number.isSafeInteger(raw[key]) && raw[key] >= 0 ? raw[key] : null]));
      } catch { /* Nie surový riadok. */ }
      return;
    }
    const event = classifyBrowserLine(line);
    if (!event) return;
    const key = `${event.process}:${event.kind}`;
    browserCounts[key] = (browserCounts[key] ?? 0) + 1;
    if (event.kind !== 'lifecycle') {
      if (browserEvents.length === 200) browserEvents.shift();
      browserEvents.push({ ...event, observedAt: Date.now() });
    }
  };
  const code = await new Promise<number>(resolve => {
    const child = spawn('docker', ['run', '--rm', '--init', '--pull=never', ...ipc,
      '-e', 'DEBUG=pw:browser', '-e', 'NPM_CONFIG_UPDATE_NOTIFIER=false',
      '-v', `${frontend}:/work`, '-v', `${libraries}:/work/node_modules:ro`,
      '-v', `${path.resolve(envFile)}:/work/.env.e2e:ro`, '-w', '/work',
      `mcr.microsoft.com/playwright:v${version}-noble`, 'node', '-e', bootstrap, '--', ...playwrightArgs(mode)],
    { cwd: frontend, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => {
      pending += String(chunk);
      const lines = pending.split(/\r?\n/); pending = lines.pop() ?? '';
      for (const line of lines) consume(line);
    });
    child.once('error', () => resolve(2));
    child.once('close', value => { if (pending) consume(pending); resolve(value ?? 2); });
  });
  const processDurationMs = Math.round(performance.now() - started);
  let summary: ReturnType<typeof summarizeReport>;
  try {
    const first = stdout.indexOf('{\n  "config":');
    summary = summarizeReport(JSON.parse(first >= 0 ? stdout.slice(first) : stdout));
  } catch {
    console.log(`[E2E-TARGETED] mode=${mode} result=report-unavailable exit=${code} processMs=${processDurationMs}`);
    return 2; // Žiadny surový stdout/stderr ani opakované prihlásenie.
  }
  const expected = mode === 'smoke' ? 51 : mode === 'colors' ? 6 : mode === 'auth-diagnostic' ? 3 : 40;
  const selectionValid = summary.tests.length === expected;
  // Playwright JSON presúva stderr workerov k pokusom; nie je iba v Docker stderr.
  for (const test of summary.tests) for (const event of test.browserEvents) {
    const key = `${event.process}:${event.kind}`;
    browserCounts[key] = (browserCounts[key] ?? 0) + 1;
  }
  const safe = { mode, startedAt, endedAt: new Date().toISOString(), processDurationMs, exit: code,
    selectionValid, resources, browserCounts, browserEvents, ...summary };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(safe, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  console.log(JSON.stringify({ mode, processDurationMs, exit: code, selectionValid, resources,
    browserCounts, runErrors: summary.runErrors, projects: summary.projects, variants: summary.tests.length }));
  for (const test of summary.tests.filter(test => !['passed', 'skipped'].includes(test.status))) {
    console.log(`[E2E-FAIL] ${test.file}:${test.line} | ${test.project} | ${test.durationMs} ms`);
    if (test.evidence.length) console.log(`[E2E-EVIDENCE] ${test.file}:${test.line} | ${test.project} | ${test.durationMs} ms`);
    for (const line of test.evidence) console.log(line);
    console.log(`[E2E-FAIL] repeat=${test.repeat} status=${test.status} errorLines=${test.errorLines.join(',') || 'n/a'}`);
  }
  return selectionValid ? code : 2;
}

if (require.main === module) {
  const [mode, ...options] = process.argv.slice(2);
  if (!MODES.includes(mode as Mode)) throw new Error('Vyber explicitný režim cieleného behu.');
  const env = options.find(item => item.startsWith('--env-file='))?.slice('--env-file='.length)
    ?? path.resolve(__dirname, '../../.env.e2e');
  const output = options.find(item => item.startsWith('--output='))?.slice('--output='.length)
    ?? path.resolve(__dirname, `../../test-results/safe-${mode}.json`);
  void runTargeted(mode as Mode, env, output).then(code => { process.exitCode = code; }, () => {
    console.log('[E2E-TARGETED] result=runner-error'); process.exitCode = 2;
  });
}

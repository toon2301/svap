import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyBrowserLine, safeEvidence, summarizeReport } from './safe-run-report';
import { playwrightArgs } from './railway-targeted.probe';

const PRIVATE = 'SYNTHETIC_PRIVATE_COOKIE_OR_TOKEN';

test('export nikdy neprepíše hlavičky, hodnoty cookies, token, telo, text chyby ani URL identitu', () => {
  const text = [
    `Cookie: refresh_token=${PRIVATE}`, `Set-Cookie: csrftoken=${PRIVATE}`, `X-CSRFToken: ${PRIVATE}`,
    `response body: ${PRIVATE}`, `url: /dashboard/users/${PRIVATE}`,
    `[E2E-EVIDENCE] ${PRIVATE}`, `page errors: 1 (${PRIVATE}) | console errors: 0`,
    `[E2E-COOKIE-SAMPLE] from=1 at=1 names=${PRIVATE}`, `refresh cookies: ${PRIVATE}`,
    ` 1  GET /api/auth/${PRIVATE}/  200  10 ms`, ' 2  POST /api/token/refresh/  403  10 ms',
    '        X-App-Duration-Ms: 1', '        refresh cookies: csrftoken,refresh_token',
    '        refresh X-CSRFToken: áno', '[E2E-COOKIE-SAMPLE] from=1 at=2 names=žiadne',
  ].join('\n');
  const output = safeEvidence(text).join('\n');
  assert.ok(!output.includes(PRIVATE));
  assert.match(output, /POST \/api\/token\/refresh\/  403/);
  assert.match(output, /X-App-Duration-Ms: 1/);
  assert.match(output, /names=žiadne/);
  assert.match(output, /refresh cookies: csrftoken,refresh_token/);
});

test('export prijme pôvodné formáty vrátane číselnej hlavičky a anonymnej požiadavky', () => {
  const lines = ['url: /dashboard/users/:id [tab]',
    '  1157  GET  /dashboard/offers/:n/reviews [_rsc,returnTo]  FAILED(failed)  14037 ms',
    '        X-App-Duration-Ms: chýba', '        refresh X-CSRFToken: nezistiteľné',
    '[E2E-COOKIE-RING] originAt=1 samples=2 events=1 omittedSamples=0 omittedEvents=0 firstRequestFailedAt=2 relation=temporal-only',
    '[E2E-COOKIE-SAMPLE] from=1 at=2 names=access_token,csrftoken,refresh_token',
    '[E2E-BROWSER-EVENT] at=2 kind=requestfailed path=/api/auth/me/',
    '[E2E-BROWSER-EVENT] at=3 kind=page-crash path=n/a'];
  assert.deepEqual(safeEvidence(lines.join('\n')), lines);
});

test('Docker stderr sa mení iba na pevné kategórie a číselné kódy', () => {
  assert.deepEqual(classifyBrowserLine(`pw:browser [pid=123][err] WebKitNetworkProcess SIGSEGV ${PRIVATE}`),
    { process: 'network', kind: 'crash', exitCode: null, signal: 'SIGSEGV' });
  assert.deepEqual(classifyBrowserLine(`pw:browser [pid=123] <process did exit: exitCode=0, signal=null> ${PRIVATE}`),
    { process: 'browser', kind: 'exit', exitCode: 0, signal: null });
  assert.equal(classifyBrowserLine(`Cookie: ${PRIVATE}`), null);
  assert.ok(!JSON.stringify(classifyBrowserLine(`pw:browser [err] ${PRIVATE}`)).includes(PRIVATE));
});

test('súhrn nesie presné stavy pokusov a ani pri páde neprečíta prílohu alebo telo', () => {
  const summary = summarizeReport({ suites: [{ specs: [{ file: 'e2e/offer-reviews-back.spec.ts', line: 1,
    tests: [{ projectName: 'webkit-desktop', repeatEachIndex: 3, results: [{ status: 'failed', duration: 123,
      startTime: '2026-11-09T12:00:00.000Z', stdout: [{ text: `Cookie: ${PRIVATE}` }],
      errors: [{ message: `offer-reviews-back.spec.ts:11:2 ${PRIVATE}` }] }] }] }] }] });
  assert.equal(summary.projects[0].failed, 1);
  assert.equal(summary.tests[0].repeat, 1);
  assert.deepEqual(summary.tests[0].errorLines, [11]);
  assert.ok(!JSON.stringify(summary).includes(PRIVATE));
});

test('stderr workerov sa zachytí aj z JSON reportu bez surových textov', () => {
  const summary = summarizeReport({ specs: [{ file: 'search-country-scroll.spec.ts', line: 1,
    tests: [{ projectName: 'webkit-mobile', results: [{ status: 'failed', stderr: [{ text:
      `2026-11-09T12:00:00.000Z pw:browser [pid=123][err] WebKitNetworkProcess SIGSEGV ${PRIVATE}\n` }],
    }] }] }], errors: [{ message: `No tests found ${PRIVATE}` }] });
  assert.deepEqual(summary.tests[0].browserEvents, [{ at: '2026-11-09T12:00:00.000Z',
    process: 'network', kind: 'crash', exitCode: null, signal: 'SIGSEGV' }]);
  assert.deepEqual(summary.runErrors, ['selection-empty']);
  assert.ok(!JSON.stringify(summary).includes(PRIVATE));
});

test('neznámy špec a automatické retry sú chyba výberu, nie tichý zelený výsledok', () => {
  for (const [file, results] of [['unknown.spec.ts', [{ status: 'passed' }]],
    ['smoke.spec.ts', [{ status: 'failed' }, { status: 'passed' }]]] as const) {
    assert.throws(() => summarizeReport({ specs: [{ file,
      tests: [{ projectName: 'webkit-desktop', results: [...results] }] }] }));
  }
});

test('cielené porovnanie má vždy dva testy, obidva WebKity, 10 pokusov, 1 worker a 0 retry', () => {
  const baseline = playwrightArgs('223-baseline');
  assert.deepEqual(playwrightArgs('223-expanded'), baseline);
  assert.ok(baseline.includes('--repeat-each=10'));
  assert.ok(baseline.includes('--project=webkit-desktop') && baseline.includes('--project=webkit-mobile'));
  assert.ok(baseline.includes('--workers=1') && baseline.includes('--retries=0'));
  assert.equal(baseline.filter(arg => arg.endsWith('.spec.ts')).length, 2);
});

test('Buffer výstup workerov nestratí dôkaz a nesmie obísť ochranu hodnôt', () => {
  const summary = summarizeReport({ specs: [{ file: 'search-country-scroll.spec.ts', line: 1,
    tests: [{ projectName: 'webkit-mobile', results: [{ status: 'failed',
      stdout: [{ buffer: Buffer.from(`Cookie: ${PRIVATE}\n        X-App-Duration-Ms: 17\n`).toString('base64') }],
      stderr: [{ buffer: Buffer.from(`pw:browser [err] WebKitNetworkProcess SIGBUS ${PRIVATE}\n`).toString('base64') }],
    }] }] }] });
  assert.deepEqual(summary.tests[0].evidence, ['        X-App-Duration-Ms: 17']);
  assert.equal(summary.tests[0].browserEvents[0].signal, 'SIGBUS');
  assert.ok(!JSON.stringify(summary).includes(PRIVATE));
});

test('pád prihlasovania je pevná kategória, nie surová správa alebo ďalší pokus', () => {
  const summary = summarizeReport({ errors: [{ message: `Prihlásenie zlyhalo (alert). ${PRIVATE}` },
    { message: `Prihlásenie zlyhalo (timeout). ${PRIVATE}` }, { message: PRIVATE }] });
  assert.deepEqual(summary.runErrors, ['auth-alert', 'auth-timeout', 'other']);
  assert.equal(summary.tests.length, 0);
  assert.ok(!JSON.stringify(summary).includes(PRIVATE));
});

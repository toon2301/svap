import path from 'node:path';
import { diagnosticPath } from '../support/diagnostic-identifiers';
import { safeCookieNames } from '../support/response-diagnostics-format';

const FILES = new Set(['smoke.spec.ts', 'auth-session.spec.ts', 'messages-peer-profile.spec.ts',
  'mobile-settings-navigation.spec.ts', 'dashboard-history-navigation.spec.ts', 'html-cache-control.spec.ts',
  'sharing-from-feed.spec.ts', 'offer-reviews-back.spec.ts', 'search-country-scroll.spec.ts',
  'reset-password-colors.spec.ts']);
const PROJECTS = new Set(['webkit-desktop', 'webkit-mobile', 'chromium-desktop']);
const STATUSES = new Set(['passed', 'failed', 'timedOut', 'skipped', 'interrupted']);
const PARAMS = new Set(['tab', 'type', 'country', 'country_code', 'district', 'district_code', 'location',
  'offer_type', 'onlyMyLocation', 'only_my_location', 'price_min', 'price_max', 'page', 'page_size', 'sort',
  'limit', 'cursor', 'users_page', 'offers_page', 'include_offers', 'include_users', 'watch', 'highlight',
  'comment', 'from', 'returnTo', '_rsc', ':param']);
const number = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value)
  && value >= 0 ? value : null;
const safePath = (value: string): boolean => value.startsWith('/') && diagnosticPath(value) === value;
const safeParams = (value = ''): boolean => !value || value.split(',').every(item => PARAMS.has(item) || /^q\(\d+\)$/.test(item));
const safeNames = (value: string): boolean => ['žiadne', 'nezistiteľné'].includes(value)
  || safeCookieNames(value.split(',')).join(',') === value;

/** Výstup je allowlist, nie redakcia surového reportu. Neznámy riadok sa zahodí celý. */
export function safeEvidence(raw: string): string[] {
  return raw.split(/\r?\n/).filter(line => {
    if (/^\s*X-App-Duration-Ms: (\d+|chýba|nezistiteľné)$/.test(line)) return true;
    if (/^\s*refresh X-CSRFToken: (áno|nie|nezistiteľné)$/.test(line)) return true;
    const cookies = /^\s*refresh cookies: (.+)$/.exec(line);
    if (cookies) return safeNames(cookies[1]);
    const url = /^url: (\/\S*?)(?: \[([^\]]*)\])?$/.exec(line);
    if (url) return safePath(url[1]) && safeParams(url[2]);
    const request = /^\s*\d+  (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|OTHER)\s+(\/\S*?)(?: \[([^\]]*)\])?  (?:[1-5]\d\d|pending|FAILED\((?:unknown|timeout|cancelled|connection-lost|offline|dns|unreachable|tls|failed|net::ERR_[A-Z0-9_]{1,50})\))  (?:\d+ ms|…)$/.exec(line);
    if (request) return safePath(request[2]) && safeParams(request[3]);
    if (/^requests \(ms since test start(?:, \d+ older omitted)?\):$/.test(line)) return true;
    if (/^page state: (?:unavailable \(page closed or not responding\)|readyState=(?:loading|interactive|complete|other) viewerReady=(?:true|false) loadingMarkers=\d+ panelAriaHidden=(?:true|false|other|n\/a))$/.test(line)) return true;
    if (/^document timing \(ms since navigation start\): domContentLoaded=(?:\d+|n\/a) load=(?:\d+|n\/a)$/.test(line)) return true;
    if (/^scroll root: scrollTop=(?:\d+|n\/a) scrollHeight=(?:\d+|n\/a) clientHeight=(?:\d+|n\/a)$/.test(line)) return true;
    if (/^page errors: \d+(?: \((?:(?:Error|TypeError|RangeError|SyntaxError|ReferenceError|EvalError|URIError|AggregateError)(?:, )?){1,3}\))? \| console errors: \d+$/.test(line)) return true;
    if (/^\[E2E-COOKIE-RING\] originAt=\d+ samples=\d+ events=\d+ omittedSamples=\d+ omittedEvents=\d+ firstRequestFailedAt=(?:\d+|n\/a) relation=temporal-only$/.test(line)) return true;
    const sample = /^\[E2E-COOKIE-SAMPLE\] from=\d+ at=\d+ names=(.+)$/.exec(line);
    if (sample) return safeNames(sample[1]);
    const event = /^\[E2E-BROWSER-EVENT\] at=\d+ kind=(requestfailed|page-crash|browser-disconnected) path=(.+)$/.exec(line);
    if (event) return event[2] === 'n/a' || safePath(event[2]);
    if (/^\[E2E-PEER\] firstPage=\d+ slugMatches=\d+ deletedMatches=\d+ namedMatches=\d+ nameMatches=\d+$/.test(line)) return true;
    return false;
  });
}

type Stdio = { text?: string; buffer?: string };
/** JSON reporter môže mať text aj base64 Buffer; surové dáta ostanú iba v pamäti. */
function stdioText(entries: Stdio[] = []): string {
  return entries.map(item => typeof item.text === 'string' ? item.text
    : typeof item.buffer === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(item.buffer)
      ? Buffer.from(item.buffer, 'base64').toString('utf8') : '').join('');
}
type Attempt = { status?: unknown; duration?: unknown; startTime?: unknown; stdout?: Stdio[];
  stderr?: Stdio[];
  errors?: Array<{ stack?: string; message?: string }>; };
type Suite = { suites?: Suite[]; specs?: Array<{ file?: string; line?: number;
  tests?: Array<{ projectName?: string; repeatEachIndex?: number; results?: Attempt[] }> }> };

/** Ponechá iba statický súbor, projekt, čísla, stav a vlastné bezpečné dôkazy. */
export function summarizeReport(report: Suite & { stats?: { duration?: number }; errors?: Array<{ message?: string }> }) {
  const occurrences = new Map<string, number>();
  const tests: Array<{ file: string; line: number | null; project: string; repeat: number | null;
    status: string; durationMs: number | null; startTime: string | null; evidence: string[]; errorLines: number[];
    browserEvents: Array<NonNullable<ReturnType<typeof classifyBrowserLine>> & { at: string | null }> }> = [];
  const visit = (suite: Suite): void => {
    for (const spec of suite.specs ?? []) for (const variant of spec.tests ?? []) {
      const file = path.basename(spec.file ?? '');
      if (!FILES.has(file) || !PROJECTS.has(variant.projectName ?? '')) throw new Error('Neočakávaný výber testov.');
      if (variant.results?.length !== 1) throw new Error('Výsledok nemá práve jeden pokus, bez retry.');
      const result = variant.results[0];
      const key = `${file}:${spec.line}:${variant.projectName}`;
      const ordinal = (occurrences.get(key) ?? 0) + 1;
      occurrences.set(key, ordinal);
      const status = typeof result.status === 'string' && STATUSES.has(result.status) ? result.status : 'unavailable';
      const text = stdioText(result.stdout);
      tests.push({ file, line: number(spec.line), project: variant.projectName!, repeat: ordinal,
        status, durationMs: number(result.duration), startTime: typeof result.startTime === 'string'
          && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(result.startTime) ? result.startTime : null,
        evidence: safeEvidence(text), errorLines: (result.errors ?? []).flatMap(error => {
          const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const match = new RegExp(`${escaped}:(\\d+):\\d+`).exec(error.stack ?? error.message ?? '');
          return match ? [Number(match[1])] : [];
        }), browserEvents: stdioText(result.stderr).split(/\r?\n/)
          .flatMap(line => {
            const event = classifyBrowserLine(line);
            if (!event) return [];
            const at = /(?:^|\s)(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)\s/.exec(line)?.[1] ?? null;
            return [{ ...event, at }];
          }) });
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  visit(report);
  const projects = [...PROJECTS].map(project => {
    const selected = tests.filter(test => test.project === project);
    const starts = selected.flatMap(test => test.startTime ? [Date.parse(test.startTime)] : []);
    const ends = selected.flatMap(test => test.startTime ? [Date.parse(test.startTime) + (test.durationMs ?? 0)] : []);
    return { project, passed: selected.filter(test => test.status === 'passed').length,
      failed: selected.filter(test => ['failed', 'timedOut', 'interrupted', 'unavailable'].includes(test.status)).length,
      skipped: selected.filter(test => test.status === 'skipped').length,
      spanMs: starts.length ? Math.max(...ends) - Math.min(...starts) : 0 };
  });
  const duration = report.stats?.duration;
  const runErrors = (report.errors ?? []).map(error => {
    const text = error.message ?? '';
    return /No tests found/.test(text) ? 'selection-empty'
      : /Prihlásenie zlyhalo \(alert\)/.test(text) ? 'auth-alert'
        : /Prihlásenie zlyhalo \(timeout\)/.test(text) ? 'auth-timeout' : 'other';
  });
  return { tests, projects, runErrors, reportDurationMs: typeof duration === 'number' && Number.isFinite(duration) && duration >= 0
    ? Math.round(duration) : null };
}

/** Z Docker stderr nikdy neprejde surová veta, cesta, PID, adresa ani argument procesu. */
export function classifyBrowserLine(line: string) {
  if (!/pw:browser|WebKit(?:Network|Web|GPU)Process|MiniBrowser/i.test(line)) return null;
  const process = /NetworkProcess/i.test(line) ? 'network' : /WebProcess/i.test(line) ? 'web'
    : /GPUProcess/i.test(line) ? 'gpu' : 'browser';
  const kind = /out of memory|cannot allocate memory|oom-kill/i.test(line) ? 'oom'
    : /SIGSEGV|SIGABRT|SIGBUS|segmentation fault|core dumped|process crashed/i.test(line) ? 'crash'
      : /<process did exit:/i.test(line) ? 'exit' : /\[err\]|warning|error/i.test(line) ? 'stderr' : 'lifecycle';
  const exit = /exitCode=(\d+)/.exec(line);
  const signal = /\b(SIGSEGV|SIGABRT|SIGBUS|SIGKILL|SIGTERM|SIGINT)\b/.exec(line);
  return { process, kind, exitCode: exit ? Number(exit[1]) : null, signal: signal?.[1] ?? null };
}

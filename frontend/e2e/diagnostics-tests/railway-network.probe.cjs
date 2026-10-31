const https = require('node:https');
const { performance } = require('node:perf_hooks');

// Bez prihlásenia, cookies, odpovedí servera alebo načítania premenných .env.
const ORIGIN = 'https://stunning-inspiration-svap.up.railway.app';
const TARGETS = Object.freeze([
  { label: 'frontend', path: '/' },
  { label: 'api', path: '/api/' },
]);

/** Prevedie chybu transportu na pevnú kategóriu bez jej textu alebo adresy. */
function errorKind(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code === 'PROBE_DEADLINE' || code === 'ETIMEDOUT') return 'timeout';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns';
  if (code === 'ECONNRESET' || code === 'EPIPE') return 'connection-reset';
  if (code === 'ECONNREFUSED' || code === 'ENETUNREACH' || code === 'EHOSTUNREACH') return 'unreachable';
  if (/^(?:ERR_TLS_|CERT_|DEPTH_ZERO_|UNABLE_TO_)/.test(code)) return 'tls';
  return 'other';
}

/** Zmeria jeden GET; telo aj hlavičky sa zahodia a presmerovanie sa nenasleduje. */
function measure(target, connection, agent, timeoutMs = 30000, get = https.get) {
  return new Promise((resolve) => {
    const started = performance.now();
    const times = { dnsMs: null, tcpMs: null, tlsMs: null, firstByteMs: null };
    const elapsed = () => Math.round((performance.now() - started) * 10) / 10;
    let settled = false, status = null, request, timer;
    const finish = (outcome, failure = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        atUtc: new Date().toISOString(), target: target.label, path: target.path,
        connection, reusedSocket: Boolean(request?.reusedSocket), status,
        outcome, errorKind: failure, ...times, totalMs: elapsed(),
      });
    };
    try {
      request = get(ORIGIN + target.path, { agent, headers: { 'Cache-Control': 'no-cache' } }, (response) => {
        status = response.statusCode ?? null;
        times.firstByteMs = elapsed();
        response.once('end', () => finish(status === 200 ? 'ok' : 'http-status'));
        response.once('aborted', () => finish('transport-error', 'aborted'));
        response.once('error', (error) => finish('transport-error', errorKind(error)));
        response.resume();
      });
      request.once('socket', (socket) => {
        socket.once('lookup', () => { times.dnsMs = elapsed(); });
        socket.once('connect', () => { times.tcpMs = elapsed(); });
        socket.once('secureConnect', () => { times.tlsMs = elapsed(); });
      });
      request.once('error', (error) => finish('transport-error', errorKind(error)));
      timer = setTimeout(() => {
        const error = new Error('PROBE_DEADLINE');
        error.code = 'PROBE_DEADLINE';
        request.destroy(error);
        finish('transport-error', 'timeout');
      }, timeoutMs);
    } catch (error) { finish('transport-error', errorKind(error)); }
  });
}

/** Spočíta výsledky vrátane pomalých a odmietnutých HTTP odpovedí, nie len úspechov. */
function summarize(samples) {
  const groups = [];
  for (const target of TARGETS) for (const connection of ['fresh', 'keep-alive']) {
    const rows = samples.filter((item) => item.target === target.label && item.connection === connection);
    const values = rows.map((item) => item.totalMs).sort((a, b) => a - b);
    const percentile = (fraction) => values.length ? values[Math.ceil(values.length * fraction) - 1] : null;
    groups.push({
      target: target.label, connection, samples: rows.length,
      ok: rows.filter((row) => row.outcome === 'ok').length,
      transportErrors: rows.filter((row) => row.outcome === 'transport-error').length,
      httpErrors: rows.filter((row) => row.outcome === 'http-status').length,
      reused: rows.filter((row) => row.reusedSocket).length,
      over2s: rows.filter((row) => row.totalMs > 2000).length,
      over10s: rows.filter((row) => row.totalMs > 10000).length,
      medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: values.at(-1) ?? null,
    });
  }
  return groups;
}

/** Desať minút nízkej záťaže; zmeškané časové okná sa nedobiehajú nárazom. */
async function runProbe() {
  const durationMs = 600000, intervalMs = 10000;
  const start = performance.now(), startedAt = new Date().toISOString(), samples = [];
  const agent = new https.Agent({ keepAlive: true, maxSockets: 2, maxFreeSockets: 2, timeout: 30000 });
  let slot = 0, missedSlots = 0;
  console.log(JSON.stringify({ type: 'start', startedAt, durationMs, intervalMs, timeoutMs: 30000, authenticated: false }));
  try {
    while (performance.now() - start < durationMs) {
      const wait = start + slot * intervalMs - performance.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (performance.now() - start >= durationMs) break;
      const connection = slot % 2 ? 'keep-alive' : 'fresh';
      const rows = await Promise.all(TARGETS.map((target) => measure(target, connection, connection === 'fresh' ? false : agent)));
      for (const row of rows) { samples.push(row); console.log(JSON.stringify({ type: 'sample', slot, ...row })); }
      const next = Math.max(slot + 1, Math.ceil((performance.now() - start) / intervalMs));
      missedSlots += next - slot - 1;
      slot = next;
    }
  } finally { agent.destroy(); }
  console.log(JSON.stringify({ type: 'finish', startedAt, finishedAt: new Date().toISOString(),
    elapsedMs: Math.round(performance.now() - start), samples: samples.length, missedSlots, summary: summarize(samples) }));
}

module.exports = { errorKind, measure, summarize };
if (require.main === module) runProbe().catch(() => {
  console.log(JSON.stringify({ type: 'probe-error', errorKind: 'other' }));
  process.exitCode = 1;
});

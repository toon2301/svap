const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { errorKind, measure, summarize } = require('./railway-network.probe.cjs');
const target = { label: 'frontend', path: '/' };

/** Atrapa transportu nevolá sieť a obsah ani hlavičky nesmie meranie čítať. */
function transport(mode, status = 200) {
  return (_url, options, receive) => {
    assert.deepEqual(options.headers, { 'Cache-Control': 'no-cache' });
    const request = new EventEmitter();
    request.reusedSocket = mode === 'reused';
    request.destroy = (error) => process.nextTick(() => request.emit('error', error));
    process.nextTick(() => {
      if (mode === 'timeout') return;
      if (mode === 'request-error') {
        const error = new Error('DO_NOT_PUBLISH'); error.code = 'ECONNRESET'; request.emit('error', error); return;
      }
      const socket = new EventEmitter(); request.emit('socket', socket);
      socket.emit('lookup'); socket.emit('connect'); socket.emit('secureConnect');
      const response = new EventEmitter(); response.statusCode = status;
      Object.defineProperty(response, 'headers', { get: () => { throw new Error('DO_NOT_PUBLISH'); } });
      response.resume = () => process.nextTick(() => {
        response.emit('data', 'DO_NOT_PUBLISH');
        if (mode === 'aborted') response.emit('aborted');
        else if (mode === 'response-error') response.emit('error', new Error('DO_NOT_PUBLISH'));
        else response.emit('end');
      });
      receive(response);
    });
    return request;
  };
}

test('kategórie chýb neobsahujú pôvodný text ani neznámy kód', () => {
  for (const [code, expected] of [
    ['PROBE_DEADLINE', 'timeout'], ['ETIMEDOUT', 'timeout'], ['ENOTFOUND', 'dns'], ['EAI_AGAIN', 'dns'],
    ['ECONNRESET', 'connection-reset'], ['EPIPE', 'connection-reset'], ['ECONNREFUSED', 'unreachable'],
    ['ENETUNREACH', 'unreachable'], ['EHOSTUNREACH', 'unreachable'], ['ERR_TLS_CERT_ALTNAME_INVALID', 'tls'],
    ['CERT_HAS_EXPIRED', 'tls'], ['DEPTH_ZERO_SELF_SIGNED_CERT', 'tls'], ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'tls'],
    ['DO_NOT_PUBLISH', 'other'],
  ]) assert.equal(errorKind({ code, message: 'DO_NOT_PUBLISH' }), expected);
  assert.equal(errorKind(null), 'other');
});

test('úspech, opätovné použitie a HTTP chyba sa rozlišujú bez obsahu odpovede', async () => {
  for (const [mode, status] of [['ok', 200], ['reused', 200], ['ok', 503]]) {
    const row = await measure(target, 'fresh', false, 1000, transport(mode, status));
    assert.equal(row.status, status);
    assert.equal(row.outcome, status === 200 ? 'ok' : 'http-status');
    assert.equal(row.reusedSocket, mode === 'reused');
    assert.ok(row.totalMs >= 0 && row.firstByteMs >= 0);
    assert.ok(!JSON.stringify(row).includes('DO_NOT_PUBLISH'));
  }
});

test('časový limit, prerušenie a chyby sa uzavrú aj bez odpovede', async () => {
  for (const [mode, expected] of [['timeout', 'timeout'], ['aborted', 'aborted'],
    ['request-error', 'connection-reset'], ['response-error', 'other']]) {
    const row = await measure(target, 'fresh', false, mode === 'timeout' ? 2 : 1000, transport(mode));
    assert.equal(row.outcome, 'transport-error');
    assert.equal(row.errorKind, expected);
    assert.ok(!JSON.stringify(row).includes('DO_NOT_PUBLISH'));
  }
  const failed = await measure(target, 'fresh', false, 1000, () => { throw new Error('DO_NOT_PUBLISH'); });
  assert.equal(failed.errorKind, 'other');
});

test('súhrn zachová pomalé aj neúspešné merania a prázdne skupiny', () => {
  const rows = [100, 3000, 12000].map((totalMs, index) => ({
    target: 'frontend', connection: 'fresh', totalMs, reusedSocket: false,
    outcome: ['ok', 'http-status', 'transport-error'][index],
  }));
  const groups = summarize(rows);
  assert.equal(groups.length, 4);
  assert.deepEqual(groups[0], { target: 'frontend', connection: 'fresh', samples: 3,
    ok: 1, transportErrors: 1, httpErrors: 1, reused: 0, over2s: 2, over10s: 1,
    medianMs: 3000, p95Ms: 12000, maxMs: 12000 });
  assert.equal(groups[3].samples, 0); assert.equal(groups[3].p95Ms, null);
});

test('sonda nemá prihlasovanie, telá, premenné prostredia ani automatický retry', () => {
  const source = fs.readFileSync(path.join(__dirname, 'railway-network.probe.cjs'), 'utf8');
  assert.ok(!/process\.env|loadEnvFile|readFile|require\([^)]*playwright|Authorization|Cookie:|JSON\.parse/.test(source));
  assert.ok(!/response\.(?:headers|data|text|json)/.test(source));
  assert.ok(source.includes('response.resume()'));
  assert.ok(source.includes('durationMs = 600000'));
  assert.ok(source.includes("path: '/api/'"));
});

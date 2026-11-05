import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { expect, test } from '../support/diagnostic-test';
import { assertHtmlNoStore } from '../support/html-cache-control';

test('skutočná navigácia aj F5 rozlíšia správnu, chýbajúcu a zmenenú HTML politiku', async ({ page, context }) => {
  let externalRequests = 0;
  let reloadRequests = 0;
  // WebKit nedovoľuje route.fulfill s 3xx. Skutočné HTTP presmerovanie ostáva
  // iba na loopbacku kontajnera; tento server neobsahuje aplikáciu ani reláciu.
  const server = createServer((request, response) => {
    const pathname = request.url?.split('?')[0];
    if (pathname === '/redirect') {
      response.writeHead(302, { location: '/valid', 'cache-control': 'no-store' });
      response.end();
      return;
    }
    let cache = 'private, no-cache, no-store, max-age=0, must-revalidate';
    if (pathname === '/cacheable') cache = 'public, max-age=3600';
    if (pathname === '/quoted') cache = 'extension="DO_NOT_PUBLISH,no-store,other"';
    if (pathname === '/reload-loss') {
      reloadRequests += 1;
      if (reloadRequests > 1) cache = 'no-cache, max-age=0';
    }
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      ...(pathname === '/missing' ? {} : { 'cache-control': cache }),
    });
    response.end('<!doctype html><html><head><title>Izolovaný dokument</title></head><body>DO_NOT_PUBLISH</body></html>');
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
    const address = server.address();
    assert.ok(address && typeof address !== 'string', 'Izolovaný server musí mať lokálny port.');
    const origin = `http://127.0.0.1:${address.port}`;
    await context.route('**/*', async (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        externalRequests += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });
    const expected = (pathname: string) => new URL(pathname, origin).href;
    const open = (pathname: string) => page.goto(expected(pathname), { waitUntil: 'domcontentloaded' });

    await assertHtmlNoStore(await open('/valid'), expected('/valid'));
    await assertHtmlNoStore(await page.reload({ waitUntil: 'domcontentloaded' }), expected('/valid'));
    for (const pathname of ['/missing', '/cacheable', '/quoted']) {
      await assert.rejects(assertHtmlNoStore(await open(pathname), expected(pathname)), { code: 'ERR_ASSERTION' });
    }
    const redirected = await open('/redirect');
    assert.ok(redirected?.request().redirectedFrom(), 'Kontrola musí vykonať skutočné HTTP presmerovanie.');
    await assertHtmlNoStore(redirected, expected('/valid'));
    await assert.rejects(assertHtmlNoStore(redirected, expected('/redirect')), { code: 'ERR_ASSERTION' });
    await assertHtmlNoStore(await open('/reload-loss'), expected('/reload-loss'));
    await assert.rejects(assertHtmlNoStore(
      await page.reload({ waitUntil: 'domcontentloaded' }), expected('/reload-loss'),
    ), { code: 'ERR_ASSERTION' });
    expect(reloadRequests).toBe(2);
    expect(externalRequests).toBe(0);
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise<void>((resolve, reject) => {
      server.close(error => { if (error) reject(error); else resolve(); });
    });
  }
});

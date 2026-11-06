import assert from 'node:assert/strict';
import { test } from '../support/diagnostic-test';
import { observePage } from '../support/page-activity';

test('prehliadač odčíta čas servera a iba bezpečné údaje odmietnutej obnovy', async ({ page, context }) => {
  const origin = 'https://diagnostic.invalid';
  const secret = 'SYNTHETIC_VALUE_NEVER_PRINT';
  let refreshes = 0;
  let externalRequests = 0;
  await context.addCookies([
    { name: 'refresh_token', value: secret, url: origin, httpOnly: true, secure: true },
    { name: 'csrftoken', value: secret, url: origin, secure: true },
    { name: 'UNKNOWN_NAME_NEVER_PRINT', value: secret, url: origin, secure: true },
  ]);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { externalRequests += 1; await route.abort(); return; }
    if (url.pathname === '/api/token/refresh/') {
      refreshes += 1;
      await route.fulfill({
        status: refreshes === 1 ? 403 : refreshes === 2 ? 401 : 200,
        headers: refreshes === 2 ? {} : { 'X-App-Duration-Ms': refreshes === 1 ? '37' : '0' },
        contentType: 'application/json', body: JSON.stringify({ private: secret }),
      });
      return;
    }
    if (url.pathname === '/api/auth/me/') {
      // Len syntetická odozva: overuje skutočnú hranicu 5 s, nie zmenu limitu testu.
      await new Promise(resolve => setTimeout(resolve, 5100));
      await route.fulfill({ headers: { 'X-App-Duration-Ms': '12' }, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Izolovaná diagnostika</title>' });
  });
  const activity = observePage(page);
  await page.goto(origin);
  assert.equal(await page.evaluate(async token => (await fetch('/api/token/refresh/', {
    method: 'POST', headers: { 'X-CSRFToken': token },
  })).status, secret), 403);
  const first = await activity.report('izolovaná odpoveď', test.info().project.name);
  assert.ok(first.includes('X-App-Duration-Ms: 37'));
  assert.ok(first.includes('refresh cookies: csrftoken,other,refresh_token'));
  assert.ok(first.includes('refresh X-CSRFToken: áno'));
  await context.clearCookies();
  assert.equal(await page.evaluate(async () => (await fetch('/api/token/refresh/', { method: 'POST' })).status), 401);
  assert.equal(await page.evaluate(async () => (await fetch('/api/token/refresh/', { method: 'POST' })).status), 200);
  assert.equal(await page.evaluate(async () => (await fetch('/api/auth/me/')).status), 200);
  const output = await activity.report('izolované odpovede', test.info().project.name);
  assert.ok(output.includes('X-App-Duration-Ms: chýba'));
  assert.ok(output.includes('X-App-Duration-Ms: 0'));
  assert.ok(output.includes('X-App-Duration-Ms: 12'));
  assert.ok(output.includes('refresh cookies: žiadne'));
  assert.ok(output.includes('refresh X-CSRFToken: nie'));
  assert.match(output, /POST\s+\/api\/token\/refresh\/\s+401[^\n]*\n\s+X-App-Duration-Ms: chýba\n\s+refresh cookies: žiadne\n\s+refresh X-CSRFToken: nie/);
  assert.match(output, /POST\s+\/api\/token\/refresh\/\s+200[^\n]*\n\s+X-App-Duration-Ms: 0/);
  assert.match(output, /GET\s+\/api\/auth\/me\/\s+200[^\n]*\n\s+X-App-Duration-Ms: 12/);
  assert.equal((output.match(/refresh cookies:/g) ?? []).length, 2);
  // Iný dokument môže byť na zaťaženom stroji tiež pomalý; nesmie to zneplatniť správnu diagnostiku.
  assert.ok((output.match(/X-App-Duration-Ms:/g) ?? []).length >= 4);
  assert.ok(!output.includes(secret));
  assert.ok(!output.includes('UNKNOWN_NAME_NEVER_PRINT'));
  assert.equal(externalRequests, 0);
});

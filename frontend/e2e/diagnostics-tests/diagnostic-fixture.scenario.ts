import { expect, test } from '../support/diagnostic-test';
import { observePage } from '../support/page-activity';

// Tento súbor zbiera výhradne izolovaný config, nikdy bežný produkčný E2E beh.
test.beforeEach(async ({ page }, testInfo) => {
  let blockedRequests = 0;
  await page.context().route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'diagnostic.invalid') {
      blockedRequests += 1;
      await route.abort('blockedbyclient');
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><body><main data-dashboard-main></main></body></html>',
    });
  });
  await page.goto('/dashboard');
  expect(await page.evaluate(async () => (await fetch('/api/auth/me/')).status)).toBe(200);

  // Pozorovateľ sa tu žiada až PO požiadavkách. Bez automatického fixture by ich už nevidel.
  const activity = observePage(page);
  await expect.poll(async () => {
    const evidence = await activity.report('Syntetická príprava', testInfo.project.name);
    return /GET\s+\/dashboard\s+200/.test(evidence) && /GET\s+\/api\/auth\/me\/\s+200/.test(evidence);
  }).toBe(true);
  expect(blockedRequests).toBe(0);
});

test('syntetický úspech nevytvorí dôkazy pádu', async ({ page }) => {
  expect(page.url()).toBe('https://diagnostic.invalid/dashboard');
});

test('syntetické preskočenie nevytvorí dôkazy pádu', async () => {
  test.skip(true, 'Syntetické preskočenie na overenie diagnostického fixture.');
});

test.describe('syntetická chyba prípravy', () => {
  test.beforeEach(() => {
    // Úmyselná chyba self-testu; žiadna aplikačná asercia sa nemení na očakávané zlyhanie.
    throw new Error('SYNTHETIC_PREPARATION_FAILURE');
  });

  test('zámerný beforeEach pád zostane FAIL', async () => {
    throw new Error('SYNTHETIC_TEST_BODY_MUST_NOT_RUN');
  });
});

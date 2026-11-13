import { expect, test, type Page, type Response } from '@playwright/test';
import messages from '../../messages/sk.json';
import { expectLoadedWatchManager, waitForWatchManagerResponse } from '../support/offer-watch-manager-ready';

const PRIVATE = 'SYNTHETIC_PRIVATE_WATCH_VALUE';
let requests = 0;

/** Iba kontrakt DOM pomocníka; nejde o syntetické údaje zapisované do aplikácie. */
function markup(count: number, state: 'ready' | 'loading' | 'disabled' | 'wrong-limit' = 'ready'): string {
  const atLimit = count >= 5 && state !== 'wrong-limit';
  const slot = atLimit ? `<p role="status">${messages.offerWatch.limitReached}</p>`
    : `<button type="button" ${state === 'loading' || state === 'disabled' ? 'disabled' : ''}>${messages.offerWatch.createAction}</button>`;
  return `<main data-testid="offer-watch-mobile-screen"><div data-testid="offer-watch-create-slot">${slot}</div>
    <h2>${messages.offerWatch.savedTitle}</h2>
    <span aria-label="${messages.offerWatch.countLabel}">${state === 'loading' ? '—' : count} / 5</span>
    ${state === 'loading' ? '<div data-testid="offer-watch-list-loading"></div>' : Array.from({ length: count }, () => '<article></article>').join('')}</main>`;
}

/** Súkromné hodnoty existujú iba v syntetickom vstupe; pomocník prečíta len dĺžku. */
function response(count: number): Response {
  return { status: () => 200, json: async () => Array.from({ length: count }, () => ({ private: PRIVATE })) } as unknown as Response;
}

/** Neúspech sa kontroluje len ako príznak; ani pri chybe sa nevypíše surová správa. */
async function mustReject(action: () => Promise<unknown>): Promise<void> {
  let rejected = false;
  let privateLeaked = false;
  try { await action(); } catch (error) {
    rejected = true;
    privateLeaked = error instanceof Error && error.message.includes(PRIVATE);
  }
  expect(rejected).toBe(true);
  expect(privateLeaked).toBe(false);
}

test.beforeEach(async ({ context }) => {
  requests = 0;
  await context.route('**/*', async route => { requests += 1; await route.abort(); });
});
test.afterEach(() => { expect(requests).toBe(0); });

for (const count of [0, 4, 5]) {
  test(`ustálený zoznam s počtom ${count} má správnu vetvu tlačidla alebo limitu`, async ({ page }) => {
    await page.setContent(markup(count));
    expect(await expectLoadedWatchManager(page, response(count))).toBe(count);
  });
}

test('viditeľné zakázané tlačidlo a neznámy počet počas načítavania nie sú PASS', async ({ page }) => {
  await page.setContent(markup(0, 'loading'));
  await mustReject(() => expectLoadedWatchManager(page, response(4)));
});

test('známy počet bez limitu nestačí, pokiaľ je tlačidlo stále zakázané', async ({ page }) => {
  await page.setContent(markup(4, 'disabled'));
  await mustReject(() => expectLoadedWatchManager(page, response(4)));
});

test('tlačidlo namiesto hlášky pri piatich sledovaniach sa odmietne', async ({ page }) => {
  await page.setContent(markup(5, 'wrong-limit'));
  await mustReject(() => expectLoadedWatchManager(page, response(5)));
});

test('neúspešná odpoveď nie je prázdny zoznam a jej telo sa nečíta', async ({ page }) => {
  let reads = 0;
  const failed = { status: () => 500, json: async () => { reads += 1; throw new Error(PRIVATE); } } as unknown as Response;
  await mustReject(() => expectLoadedWatchManager(page, failed));
  expect(reads).toBe(0);
});

test('neplatný formát úspešnej odpovede nevypíše telo a nie je PASS', async ({ page }) => {
  const malformed = { status: () => 200, json: async () => ({ private: PRIVATE }) } as unknown as Response;
  await mustReject(() => expectLoadedWatchManager(page, malformed));
});

test('poškodený JSON sa nepoužije ako prázdny zoznam a jeho text sa nevypíše', async ({ page }) => {
  const malformed = { status: () => 200, json: async () => { throw new Error(PRIVATE); } } as unknown as Response;
  await mustReject(() => expectLoadedWatchManager(page, malformed));
});

/** Syntetická sieť kopíruje len poradie jednej podporovanej obnovy, nie aplikáciu alebo účet. */
async function refreshFlow(page: Page, count: number, repeatedStatus = 200, refreshStatus = 200) {
  let watchRequests = 0;
  let refreshRequests = 0;
  await page.route('https://watch-manager.invalid/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/' && route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + markup(count) + '</body></html>' });
    } else if (path === '/api/auth/offer-watches/' && route.request().method() === 'GET') {
      watchRequests += 1;
      const status = watchRequests === 1 ? 401 : repeatedStatus;
      const body = status === 200 ? Array.from({ length: count }, () => ({ private: PRIVATE })) : { private: PRIVATE };
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    } else if (path === '/api/token/refresh/' && route.request().method() === 'POST') {
      refreshRequests += 1;
      await route.fulfill({ status: refreshStatus, contentType: 'application/json', body: JSON.stringify({ private: PRIVATE }) });
    } else { requests += 1; await route.abort(); }
  });
  await page.goto('https://watch-manager.invalid/');
  expect(await page.evaluate(() => document.characterSet)).toBe('UTF-8');
  return {
    counts: () => ({ watchRequests, refreshRequests }),
    run: () => page.evaluate(async () => {
      const first = await fetch('/api/auth/offer-watches/');
      const statuses = [first.status];
      if (first.status === 401) {
        const refresh = await fetch('/api/token/refresh/', { method: 'POST' });
        statuses.push(refresh.status);
        if (refresh.ok) statuses.push((await fetch('/api/auth/offer-watches/')).status);
      }
      return statuses;
    }),
  };
}

for (const count of [0, 4, 5]) {
  test(`obnova relácie 401 → 200 zachová kontrolu počtu ${count}`, async ({ page }) => {
    const flow = await refreshFlow(page, count);
    const [managerResponse, statuses] = await Promise.all([
      waitForWatchManagerResponse(page), flow.run(),
    ]);
    expect(statuses).toEqual([401, 200, 200]);
    expect(managerResponse.status()).toBe(200);
    expect(await expectLoadedWatchManager(page, managerResponse)).toBe(count);
    expect(flow.counts()).toEqual({ watchRequests: 2, refreshRequests: 1 });
  });
}

test('opakovaná 401 nie je úspech ani dôvod na ďalšie opakovanie testu', async ({ page }) => {
  const flow = await refreshFlow(page, 4, 401);
  const [managerResponse, statuses] = await Promise.all([waitForWatchManagerResponse(page), flow.run()]);
  expect(statuses).toEqual([401, 200, 401]);
  expect(managerResponse.status()).toBe(401);
  await mustReject(() => expectLoadedWatchManager(page, managerResponse));
  expect(flow.counts()).toEqual({ watchRequests: 2, refreshRequests: 1 });
});

test('odmietnutá obnova bez ďalšieho GET sa nikdy nezmení na úspech', async ({ page }) => {
  const flow = await refreshFlow(page, 4, 200, 403);
  let state: 'pending' | 'response' | 'rejected' = 'pending';
  const result = waitForWatchManagerResponse(page).then(
    () => { state = 'response'; }, () => { state = 'rejected'; },
  );
  expect(await flow.run()).toEqual([401, 403]);
  expect(state).toBe('pending');
  expect(flow.counts()).toEqual({ watchRequests: 1, refreshRequests: 1 });
  // Ukončenie izolovanej stránky odmietne čakanie; nejde o nový timeout produkčného testu.
  await page.close();
  await result;
  expect(state).toBe('rejected');
});

import { expect, test, type Response } from '@playwright/test';
import messages from '../../messages/sk.json';
import { expectLoadedWatchManager } from '../support/offer-watch-manager-ready';

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

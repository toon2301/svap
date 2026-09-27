import { expect, test, type Page } from '@playwright/test';
import { cleanupFeedPosts, takeCreatedPost, uniqueRunMarker } from './support/feed';

// Regresný test upratovania E2E testov – BEZ produkcie. Celé API je
// podvrhnuté cez page.route na fiktívnej doméne, DELETE sa len zaznamenáva.
// Prechádza tým istým sledom ako testy zdieľania: vytvorenie → registrácia
// na upratanie → tvrdenia o odpovedi → upratanie vo finally.

const APP = 'https://app.test';
const MARKER = 'regresia 1';

/** Podvrhne API Nástenky; vracia zoznam ID, na ktoré prišiel DELETE. */
async function fakeFeedApi(page: Page, created: unknown, listed: unknown[]): Promise<number[]> {
  const deleted: number[] = [];
  await page.route(`${APP}/**`, async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const detail = pathname.match(/^\/api\/auth\/feed\/posts\/(\d+)\/$/);
    if (pathname === '/api/auth/feed/posts/' && request.method() === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
    }
    if (pathname === '/api/auth/feed/posts/' && request.method() === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: listed }) });
    }
    if (detail && request.method() === 'DELETE') {
      deleted.push(Number(detail[1]));
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ contentType: 'text/html', body: '<main></main>' });
  });
  await page.goto(`${APP}/dashboard`);
  return deleted;
}

/**
 * Sled z testov zdieľania. Tvrdenie o type zlyhá (odpoveď nesie iný typ),
 * zlyhanie sa zachytí, aby sa dalo overiť, čo upratanie urobilo.
 */
async function shareWithFailingAssertion(page: Page) {
  const createdIds: number[] = [];
  let failure: unknown;
  let cleanup: { id: number | null; status: number }[] = [];
  try {
    const createdResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/auth/feed/posts/'),
    );
    await page.evaluate(() => fetch('/api/auth/feed/posts/', { method: 'POST', body: '{}' }));
    const response = await createdResponse;
    const created = await takeCreatedPost(response, createdIds);
    expect(response.status()).toBe(201);
    expect(created.post_type).toBe('shared_offer');
  } catch (error) {
    failure = error;
  } finally {
    cleanup = await cleanupFeedPosts(page, createdIds, MARKER);
  }
  return { failure, cleanup };
}

test('zlyhané tvrdenie tesne po vytvorení nezabráni zmazaniu príspevku', async ({ page }) => {
  const deleted = await fakeFeedApi(page, { id: 4242, post_type: 'free_post' }, []);

  const { failure, cleanup } = await shareWithFailingAssertion(page);

  expect(String(failure), 'tvrdenie o type malo zlyhať').toContain('shared_offer');
  expect(deleted).toEqual([4242]);
  expect(cleanup).toEqual([{ id: 4242, status: 204 }]);
});

test('poistka zmaže príspevok podľa značky testu, keď sa ID nezaregistrovalo', async ({ page }) => {
  const deleted = await fakeFeedApi(page, null, [
    { id: 5151, caption: `[e2e] zdieľanie z profilu ${MARKER}` },
    { id: 6161, caption: '[e2e] zdieľanie z profilu iný beh' },
    { id: 7171, caption: `obyčajný príspevok ${MARKER}` },
  ]);

  const { failure, cleanup } = await shareWithFailingAssertion(page);

  expect(String(failure), 'tvrdenie o type malo zlyhať').toContain('shared_offer');
  // Len príspevok s [e2e] AJ značkou tohto behu – iné sa nesmú dotknúť.
  expect(deleted).toEqual([5151]);
  expect(cleanup).toEqual([{ id: 5151, status: 204 }]);
});

test('značky behov v tej istej milisekunde sa nezhodujú', () => {
  const project = test.info().project.name;
  const realNow = Date.now;
  // Všetky behy „v tej istej milisekunde".
  Date.now = () => 1_790_000_000_000;
  try {
    // Pôvodný tvar značky (projekt + čas) by sa tu zhodoval.
    expect(`${project} ${Date.now()}`).toBe(`${project} ${Date.now()}`);

    const markers = Array.from({ length: 1000 }, () => uniqueRunMarker(project));
    expect(new Set(markers).size).toBe(markers.length);
    // `cleanupFeedPosts` hľadá značku ako podreťazec textu – žiadna preto
    // nesmie byť súčasťou inej, inak by upratovanie jedného behu zmazalo
    // príspevky druhého.
    for (const other of markers.slice(1)) {
      expect(other.includes(markers[0]) || markers[0].includes(other)).toBe(false);
    }
    // Názov projektu ostáva na začiatku kvôli čitateľnosti pri ladení.
    expect(markers.every((marker) => marker.startsWith(`${project} `))).toBe(true);
  } finally {
    Date.now = realNow;
  }
});

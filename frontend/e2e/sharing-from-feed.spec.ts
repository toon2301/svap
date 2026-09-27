import { expect, test } from '@playwright/test';
import {
  FEED_HOME_PATHS,
  cleanupFeedPosts,
  createFreePost,
  readLandedPostHighlight,
  readUrlLog,
  recordLandedPostHighlight,
  recordUrlLog,
  takeCreatedPost,
  uniqueRunMarker,
} from './support/feed';

// Zdieľanie (repost) príspevku priamo z karty na Nástenke – opačná vetva
// k sharing-from-profile. Feed je na obrazovke (isFeedLandingTargetMounted),
// takže FeedShareDialog NEnaviguje: len vyšle signál pristátia a feed
// doscrolluje na nový príspevok (useFeedShareLanding). Bez zvýraznenia.
//
// Zdroj si test pripraví sám cez API: obyčajný príspevok je na účte len jeden
// a hlboko vo feede, takže by nebol spoľahlivý. Repost aj zdroj sa na konci
// vždy zmažú; texty nesú značku [e2e] pre prípadný zvyšok.

// Test zapisuje do produkcie – bez opakovania, inak by zlyhanie mohlo
// vytvoriť ďalšie príspevky. Globálne retries v configu ostávajú.
test.describe.configure({ retries: 0 });

test('zdieľanie príspevku z Nástenky ostane na Nástenke bez zvýraznenia', async ({ page }, testInfo) => {
  const marker = uniqueRunMarker(testInfo.project.name);
  const sourceCaption = `[e2e] zdroj na zdieľanie ${marker}`;
  const repostCaption = `[e2e] zdieľanie z Nástenky ${marker}`;
  // Poradie mazania: najprv repost, potom zdroj.
  const createdIds: number[] = [];

  try {
    // Príprava – mimo merania: vlastný obyčajný príspevok ako zdroj.
    await page.goto('/dashboard');
    await expect(page.locator('main[data-dashboard-main]')).toBeVisible();
    createdIds.push(await createFreePost(page, sourceCaption));
    await page.goto('/dashboard');
    const source = page.getByTestId('feed-post-card').filter({ hasText: sourceCaption });
    await expect(source).toHaveAttribute('data-post-type', 'free_post', { timeout: 20_000 });

    // Odtiaľto sa meria: každá adresa, ktorou stránka prejde, a každé
    // zvýraznenie pristátej karty.
    const startUrl = page.url();
    expect(FEED_HOME_PATHS.has(new URL(startUrl).pathname)).toBe(true);
    const navigatedTo: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigatedTo.push(frame.url());
    });
    await recordUrlLog(page);
    await recordLandedPostHighlight(page);

    await source.getByTestId('feed-share-button').click();
    const shareDialog = page.getByTestId('feed-share-modal');
    await shareDialog.locator('textarea').fill(repostCaption);
    const createdResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/auth/feed/posts/'),
    );
    await shareDialog.getByTestId('feed-share-submit').click();
    const response = await createdResponse;
    // Najprv zaradiť na upratanie, až potom čokoľvek tvrdiť o odpovedi.
    const created = await takeCreatedPost(response, createdIds);
    expect(response.status()).toBe(201);
    expect(created.post_type).toBe('shared_feed_post');

    // Nový repost = karta, na ktorú appka pristála; vo feede je práve raz
    // (vkladajú ho dve cesty – onShared aj event – a prependPosts deduplikuje).
    const landed = page.getByTestId('feed-landed-post');
    await expect(landed).toContainText(repostCaption);
    await expect(page.getByTestId('feed-post-card').filter({ hasText: repostCaption })).toHaveCount(1);

    // (b) Vo viewporte bez ručného scrollovania – test po zdieľaní nescrolluje.
    await expect(landed).toBeInViewport({ ratio: 0.5 });

    // (c) Žiadne zvýraznenie – ani počas pristátia, ani po ňom.
    const highlightSeen = await readLandedPostHighlight(page);
    expect(highlightSeen, 'záznam zmizol – stránka sa po zdieľaní znovu načítala').toBeDefined();
    expect(highlightSeen, 'pristátá karta dostala triedu zvýraznenia').toEqual([]);
    expect(await landed.evaluate((element) => getComputedStyle(element).boxShadow)).toBe('none');

    // Dialóg sa zavrel a nič iné (detail príspevku) sa neotvorilo.
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // (a) Po celý čas jediná adresa – žiadny medzikrok, ani na okamih.
    const urlLog = await readUrlLog(page);
    expect(urlLog, 'záznam zmizol – stránka sa po zdieľaní znovu načítala').toBeDefined();
    expect([...new Set([...urlLog!, ...navigatedTo, page.url()])]).toEqual([startUrl]);
  } finally {
    for (const { id, status } of await cleanupFeedPosts(page, createdIds, marker)) {
      expect.soft(status, `upratanie príspevku ${id ?? '?'} zlyhalo`).toBe(204);
    }
  }
});

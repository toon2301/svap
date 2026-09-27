import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';

// Zdieľanie vlastnej ponuky z vlastného profilu na Nástenku – historicky
// najkrehkejší scenár. Očakávanie podľa FeedShareDialog + useFeedShareLanding:
// appka prepne na Nástenku (nie detail, nie zostane na profile), nový
// príspevok doscrolluje do viewportu a NEZVÝRAZNÍ ho.
//
// Test vytvára príspevok, preto ho na konci vždy zmaže cez API (autor smie
// DELETE /auth/feed/posts/<id>/). Popis nesie značku [e2e], aby sa prípadný
// zvyšok po neúspešnom upratovaní dal nájsť.

// Tlačidlo zdieľania na karte ponuky nemá data-testid, len preložený
// aria-label. Berieme ho z tých istých prekladov ako appka, nech test
// nezávisí od jazyka účtu.
const messagesDir = path.join(__dirname, '..', 'messages');
const shareOfferLabels = fs
  .readdirSync(messagesDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(messagesDir, file), 'utf8')).profile.shareOfferTitle as string);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SHARE_OFFER_BUTTON_NAME = new RegExp(`^(${shareOfferLabels.map(escapeRegExp).join('|')})$`);

// Adresa Nástenky: DASHBOARD_HOME_PATH ('/dashboard'), priamo aj '/dashboard/home'.
const FEED_HOME_PATHS = new Set(['/dashboard', '/dashboard/', '/dashboard/home']);

/**
 * Zvýraznenie pristátej karty kedysi robil wrapper s triedami
 * 'rounded-2xl ring-2 ring-purple-400 ring-offset-2 ring-offset-white …'
 * (odstránené v 440386cb) a držalo sa len 2,5 s. Jednorazová kontrola by ho
 * mohla minúť, preto MutationObserver zaznamená KAŽDÝ výskyt takej triedy
 * na pristátej karte od chvíle zdieľania – bez čakania na čas.
 */
async function recordLandedPostHighlight(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __e2eHighlightSeen: string[] }).__e2eHighlightSeen = seen;
    const inspect = () => {
      const landed = document.querySelector('[data-testid="feed-landed-post"]');
      if (!landed) return;
      for (const element of [landed, landed.querySelector('[data-testid="feed-post-card"]')]) {
        const hits = element ? [...element.classList].filter((c) => /^ring-|purple/.test(c)) : [];
        if (hits.length) seen.push(hits.join(' '));
      }
    };
    new MutationObserver(inspect).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'data-testid'],
    });
  });
}

test('zdieľanie vlastnej ponuky z profilu pristane na Nástenke bez zvýraznenia', async ({ page }, testInfo) => {
  const caption = `[e2e] zdieľanie z profilu ${testInfo.project.name} ${Date.now()}`;
  let deleteUrl: string | null = null;

  try {
    // Reálny vstup: Nástenka → vlastný profil cez navigáciu (desktop sidebar /
    // mobilná horná lišta). Nástenka si pritom uloží návratovú snímku, ktorú
    // musí zdieľanie zahodiť – krehkejšia cesta než priamy vstup na profil.
    await page.goto('/dashboard');
    await expect(page.locator('main[data-dashboard-main]')).toBeVisible();
    await page
      .locator('[data-sidebar-nav-item="profile"], [data-onboarding="profile-icon"]')
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL((url) => /^\/dashboard\/(users\/[^/]+|profile)\/?$/.test(url.pathname));

    await page.getByRole('button', { name: SHARE_OFFER_BUTTON_NAME }).filter({ visible: true }).first().click();
    await page.getByTestId('offer-share-to-board').click();
    const shareDialog = page.getByTestId('feed-share-modal');
    await shareDialog.locator('textarea').fill(caption);

    await recordLandedPostHighlight(page);
    const createdResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/auth/feed/posts/'),
    );
    await shareDialog.getByTestId('feed-share-submit').click();
    const response = await createdResponse;
    expect(response.status()).toBe(201);
    const created = await response.json();
    expect(created.post_type).toBe('shared_offer');
    deleteUrl = `${new URL(response.url()).pathname}${created.id}/`;

    // (a) Nástenka – nie detail /dashboard/feed/<id>, nie profil.
    await expect(page).toHaveURL((url) => FEED_HOME_PATHS.has(url.pathname));

    // Nový príspevok = karta, na ktorú appka pristála, a nesie náš popis.
    const landed = page.getByTestId('feed-landed-post');
    await expect(landed).toContainText(caption, { timeout: 20_000 });

    // (b) Vo viewporte bez ručného scrollovania – test nikde nescrolluje,
    // pristátie musí doscrollovať appka sama.
    await expect(landed).toBeInViewport({ ratio: 0.5 });

    // (c) Žiadne zvýraznenie – ani počas pristátia, ani po ňom.
    const highlightSeen = await page.evaluate(
      () => (window as unknown as { __e2eHighlightSeen?: string[] }).__e2eHighlightSeen,
    );
    expect(highlightSeen, 'záznam zmizol – stránka sa po zdieľaní znovu načítala').toBeDefined();
    expect(highlightSeen, 'pristátá karta dostala triedu zvýraznenia').toEqual([]);
    expect(await landed.evaluate((element) => getComputedStyle(element).boxShadow)).toBe('none');

    // Po pristátí sa nič ďalšie neotvorilo (detail príspevku ani iná vrstva).
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(FEED_HOME_PATHS.has(new URL(page.url()).pathname)).toBe(true);
  } finally {
    if (deleteUrl) {
      const status = await page.evaluate(async (url) => {
        const csrf = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? '';
        const res = await fetch(url, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'X-CSRFToken': decodeURIComponent(csrf) },
        });
        return res.status;
      }, deleteUrl);
      expect.soft(status, `upratanie ${deleteUrl} zlyhalo`).toBe(204);
    }
  }
});

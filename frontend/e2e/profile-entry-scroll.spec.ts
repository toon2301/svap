import { expect, test, type Page } from '@playwright/test';

// Vstup na vlastný profil cez kartu vlastnej ponuky z hlboko odscrollovanej
// Nástenky (iPhone). Profil sa má otvoriť od vrchu a plynulý scroll na
// zvýraznenú ponuku má štartovať z vrchu, nie zospodu.
//
// Na skutočnom iPhone sa stará pozícia Nástenky po narastení profilu vracala
// (namerané cez ?debugscroll=1). Emulácia WebKitu to NEREPRODUKUJE – test preto
// prejde aj bez opravy. Je to poistka poradia: keby sa reset alebo zvýraznenie
// rozbili tak, že sa to prejaví aj v emulácii, zachytí to.
//
// Test len číta. Testovací účet musí mať na Nástenke zdieľanú vlastnú ponuku;
// hľadá sa na prvých piatich stranách (MAX_FEED_PAGES) a použije sa prvá, ktorá
// je hlbšie než 1000 px (MIN_DEPTH_PX). Nástenka rastie, takže ponuka časom
// klesá – aj za prvú stranu.
// Vytvárať ju netreba – nový zdieľaný príspevok by pristál navrchu, nie hlboko.

const MAIN = '[data-dashboard-main]';
const CARD = '[data-testid="feed-post-card"]';
const EDIT = '[data-onboarding="profile-edit-button"]';
const HIGHLIGHT = '.highlight-offer-card';
const HOME = 'button[aria-label="Domov"]';
/** Koľko strán Nástenky (kurzor `next`) sa prehľadá a najviac donačíta. */
const MAX_FEED_PAGES = 5;
/** Pod touto hĺbkou nejde o scenár „z hlboko odscrollovanej Nástenky". */
const MIN_DEPTH_PX = 1000;

type IntoViewCall = { mainTop: number; highlighted: boolean };
type WindowWithIntoView = Window & { __e2eIntoView?: IntoViewCall[] };

/**
 * Každé `scrollIntoView` vnútri `<main>`: kde stál `<main>` v momente volania
 * a či išlo o zvýraznenú kartu. Pôvodná funkcia sa volá nezmenená.
 */
async function recordScrollIntoView(page: Page) {
  await page.addInitScript(() => {
    const w = window as WindowWithIntoView;
    w.__e2eIntoView = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element, ...args: unknown[]) {
      const main = document.querySelector('[data-dashboard-main]');
      if (main && main.contains(this)) {
        w.__e2eIntoView?.push({
          mainTop: main.scrollTop,
          highlighted: Boolean(
            this.matches('.highlight-offer-card') ||
              this.querySelector('.highlight-offer-card') ||
              this.closest('.highlight-offer-card'),
          ),
        });
      }
      return (original as (...params: unknown[]) => void).apply(this, args);
    };
  });
}

type OwnOffer = { index: number; title: string };

/**
 * Vlastné zdieľané ponuky v poradí kariet na Nástenke – cez viac strán, podľa
 * kurzora `next`. Poradie z API je poradie kariet. Počíta sa tesne pred
 * vstupom, lebo iné testy môžu medzitým pridať príspevok navrch.
 */
async function ownSharedOffers(page: Page): Promise<OwnOffer[]> {
  return page.evaluate(async (maxPages) => {
    const meResponse = await fetch('/api/auth/me/', { credentials: 'include' });
    const me = (await meResponse.json()) as { id?: number; user?: { id?: number } };
    const myId = me.user?.id ?? me.id;
    const found: OwnOffer[] = [];
    let url: string | null = '/api/auth/feed/posts/';
    let offset = 0;
    for (let pageNo = 0; url && pageNo < maxPages; pageNo += 1) {
      const response = await fetch(url, { credentials: 'include' });
      const data = (await response.json()) as { results?: unknown[]; next?: string | null } | unknown[];
      const posts = (Array.isArray(data) ? data : (data.results ?? [])) as Array<{
        post_type?: string;
        shared_content?: { id?: number; title?: string; owner?: { id?: number } | null } | null;
      }>;
      posts.forEach((post, index) => {
        const content = post.shared_content;
        if (post.post_type === 'shared_offer' && content?.id && content.owner?.id === myId) {
          found.push({ index: offset + index, title: content.title ?? '' });
        }
      });
      offset += posts.length;
      const next = Array.isArray(data) ? null : data.next;
      // `next` je absolútna URL z backendu – ako appka, ide sa cez vlastný origin.
      url = next ? (() => {
        const parsed = new URL(next, window.location.origin);
        return `${parsed.pathname}${parsed.search}`;
      })() : null;
    }
    return found;
  }, MAX_FEED_PAGES);
}

/** Donačíta Nástenku (scroll na sentinel, ako používateľ), kým nemá kartu s indexom. */
async function loadCardsUpTo(page: Page, index: number) {
  const cards = page.locator(CARD);
  for (let pageNo = 1; pageNo < MAX_FEED_PAGES && (await cards.count()) <= index; pageNo += 1) {
    const before = await cards.count();
    await page.getByTestId('feed-sentinel').scrollIntoViewIfNeeded();
    await expect
      .poll(() => cards.count(), { message: 'Nástenka nedonačítala ďalšiu stranu', timeout: 15_000 })
      .toBeGreaterThan(before);
  }
  expect(await cards.count(), `Nástenka nemá kartu č. ${index + 1}`).toBeGreaterThan(index);
}

/**
 * Prvá vlastná zdieľaná ponuka hlbšie než MIN_DEPTH_PX, doscrollovaná na
 * obrazovku. Keď karta na očakávanom mieste nesedí (feed sa medzitým zmenil),
 * výpočet sa raz zopakuje – nad nanovo načítanou Nástenkou.
 */
async function deepOwnOfferPreview(page: Page, label: string) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (attempt > 1) {
      // Vykreslený feed je starší než odpoveď API (navrch medzitým pribudol
      // príspevok) – bez nového načítania by boli indexy posunuté znova.
      await page.reload();
      await expect(page.getByTestId('feed-list')).toBeVisible();
    }
    const candidates = await ownSharedOffers(page);
    expect(
      candidates.length,
      `${label}: na prvých ${MAX_FEED_PAGES} stranách Nástenky nie je zdieľaná vlastná ponuka testovacieho účtu`,
    ).toBeGreaterThan(0);
    let feedChanged = false;
    for (const candidate of candidates) {
      await loadCardsUpTo(page, candidate.index);
      const card = page.locator(CARD).nth(candidate.index);
      const text = (await card.textContent()) ?? '';
      if ((await card.getAttribute('data-post-type')) !== 'shared_offer' || !text.includes(candidate.title)) {
        feedChanged = true;
        break;
      }
      const preview = card.getByTestId('feed-shared-compact-preview');
      await preview.scrollIntoViewIfNeeded();
      const depth = await page.locator(MAIN).evaluate((main) => main.scrollTop);
      if (depth > MIN_DEPTH_PX) return preview;
    }
    if (!feedChanged) break;
  }
  throw new Error(`${label}: na Nástenke nie je vlastná zdieľaná ponuka hlbšie než ${MIN_DEPTH_PX} px`);
}

async function goHome(page: Page) {
  await page.locator(HOME).tap();
  await expect(page.getByTestId('feed-list')).toBeVisible();
}

/** Hlboký scroll na vlastnú ponuku, ťuk, a tvrdenia o vrchu a zvýraznení. */
async function enterOwnOfferFromDeepFeed(page: Page, label: string) {
  const preview = await deepOwnOfferPreview(page, label);

  await page.evaluate(() => {
    (window as WindowWithIntoView).__e2eIntoView = [];
  });
  await preview.tap();

  await expect(page.locator(EDIT).filter({ visible: true })).toBeVisible();
  const highlighted = page.locator(HIGHLIGHT).filter({ visible: true });
  await expect(highlighted).toBeVisible();
  await expect
    .poll(
      () => page.evaluate(() => ((window as WindowWithIntoView).__e2eIntoView ?? []).some((call) => call.highlighted)),
      { message: `${label}: scroll na zvýraznenú ponuku sa nespustil`, timeout: 15_000 },
    )
    .toBe(true);

  const calls = await page.evaluate(() => (window as WindowWithIntoView).__e2eIntoView ?? []);
  const toCard = calls.find((call) => call.highlighted)!;
  expect(toCard.mainTop, `${label}: scroll na ponuku neštartoval z vrchu`).toBeLessThanOrEqual(2);
  await expect(highlighted).toBeInViewport();
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'Vstup z Nástenky na iPhone – len webkit-mobile.');
  await recordScrollIntoView(page);
  await page.goto('/dashboard');
  await expect(page.getByTestId('feed-list')).toBeVisible();
});

test('W: three entries in a row open the own profile from the top with the offer highlighted', async ({ page }) => {
  for (let entry = 1; entry <= 3; entry += 1) {
    await enterOwnOfferFromDeepFeed(page, `vstup ${entry}`);
    await goHome(page);
  }
});

test('C: an entry 70+ s after the previous one also starts from the top', async ({ page }) => {
  test.setTimeout(180_000);
  await enterOwnOfferFromDeepFeed(page, 'vstup 1');
  await goHome(page);

  // Scenár C je práve odstup: cache profilu aj ponúk (60 s) medzitým vyprší.
  await page.waitForTimeout(70_000);

  await enterOwnOfferFromDeepFeed(page, 'vstup po 70 s');
});

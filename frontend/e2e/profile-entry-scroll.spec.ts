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
// Test len číta: vlastnú zdieľanú ponuku na Nástenke musí mať testovací účet.

const MAIN = '[data-dashboard-main]';
const CARD = '[data-testid="feed-post-card"]';
const EDIT = '[data-onboarding="profile-edit-button"]';
const HIGHLIGHT = '.highlight-offer-card';
const HOME = 'button[aria-label="Domov"]';

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

/**
 * Najhlbšia vlastná zdieľaná ponuka na prvej strane Nástenky – poradie z API je
 * poradie kariet. Počíta sa tesne pred vstupom, lebo iné testy môžu medzitým
 * pridať príspevok navrch.
 */
async function deepestOwnSharedOffer(page: Page): Promise<{ index: number; title: string } | null> {
  return page.evaluate(async () => {
    const meResponse = await fetch('/api/auth/me/', { credentials: 'include' });
    const me = (await meResponse.json()) as { id?: number; user?: { id?: number } };
    const myId = me.user?.id ?? me.id;
    const feedResponse = await fetch('/api/auth/feed/posts/', { credentials: 'include' });
    const data = (await feedResponse.json()) as unknown;
    const posts = (Array.isArray(data) ? data : ((data as { results?: unknown[] }).results ?? [])) as Array<{
      post_type?: string;
      shared_content?: { id?: number; title?: string; owner?: { id?: number } | null } | null;
    }>;
    let found: { index: number; title: string } | null = null;
    posts.forEach((post, index) => {
      const content = post.shared_content;
      if (post.post_type === 'shared_offer' && content?.id && content.owner?.id === myId) {
        found = { index, title: content.title ?? '' };
      }
    });
    return found;
  });
}

async function goHome(page: Page) {
  await page.locator(HOME).tap();
  await expect(page.getByTestId('feed-list')).toBeVisible();
}

/** Hlboký scroll na vlastnú ponuku, ťuk, a tvrdenia o vrchu a zvýraznení. */
async function enterOwnOfferFromDeepFeed(page: Page, label: string) {
  const target = await deepestOwnSharedOffer(page);
  expect(target, 'na Nástenke chýba zdieľaná vlastná ponuka testovacieho účtu').not.toBeNull();
  const card = page.locator(CARD).nth(target!.index);
  await expect(card).toHaveAttribute('data-post-type', 'shared_offer');
  if (target!.title) await expect(card).toContainText(target!.title);

  const preview = card.getByTestId('feed-shared-compact-preview');
  await preview.scrollIntoViewIfNeeded();
  const depth = await page.locator(MAIN).evaluate((main) => main.scrollTop);
  expect(depth, `${label}: Nástenka pred vstupom nie je hlboko odscrollovaná`).toBeGreaterThan(1000);

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

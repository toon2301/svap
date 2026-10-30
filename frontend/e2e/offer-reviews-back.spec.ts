import fs from 'fs';
import path from 'path';
import { expect, test, type Locator, type Page } from './support/diagnostic-test';

import {
  MAIN,
  gotoDashboardHome,
  historyLength,
  mainScrollTop,
  pathOf,
  searchOf,
  topBarBack,
} from './support/dashboard';
import { FEED_HOME_PATHS } from './support/feed';

// Recenzie ponuky otvorené z karty vlastnej ponuky a návrat. Iba čítanie – recenzia sa nepridáva ani nemení.
//
// Šípka Späť v recenziách má urobiť SKUTOČNÝ krok späť v histórii: profil ostane v pôvodnom stave (bez
// otočenej karty a zvýraznenia) a ďalšie Späť vedie tam, odkiaľ sa do profilu prišlo. Predtým šípka profil
// otvorila ZNOVA (nový záznam), takže Späť z profilu viedlo naspäť do recenzií a dvojica sa dala
// preklikávať donekonečna. Mobil: šípka v hornej lište. Desktop: okrúhla šípka vľavo od nadpisu.
//
// Po návrate sa profil otvorí na tom istom mieste, odkiaľ sa recenzie otvorili (nie od vrchu). Zoznam ponúk
// dorastá až po načítaní, preto sa pozícia vracia, kým obsah nenarastie – test overí, že sa vrátila a že drží.
//
// Testovací účet musí mať na vlastnom profile aspoň jednu ponuku (nie „hľadám“) – tá má tlačidlo
// „Pridať recenziu“, ktoré recenzie otvára. Testy pozície potrebujú profil, ktorý sa dá odscrollovať
// (aspoň ~30 px); inak sa preskočia.
//
// Posledný test (cudzí profil po F5) beží len s E2E_PEER_SLUG – slug TVOJHO druhého testovacieho účtu, ktorý
// má aspoň jednu ponuku (nie „hľadám“); pozri .env.e2e.example. Otvorenie jeho profilu zapíše 1 návštevu
// profilu na účet a deň, inak sa nič nezapisuje.

const PEER_SLUG = (process.env.E2E_PEER_SLUG ?? '').trim();
const REVIEW_BUTTON = 'button[aria-label="Pridať recenziu"]';
const REVIEWS_PATH = /^\/dashboard\/offers\/\d+\/reviews$/;
const OWN_PROFILE_PATH = /^\/dashboard\/users\/[^/]+$/;

// Preklad „Späť“ z tých istých súborov ako appka – desktopová šípka má len aria-label, nie text.
const messagesDir = path.join(__dirname, '..', 'messages');
const backLabels = fs
  .readdirSync(messagesDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(messagesDir, file), 'utf8')).common.back as string);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BACK_BUTTON_NAME = new RegExp(`^(${backLabels.map(escapeRegExp).join('|')})$`);

const SCROLL_TOLERANCE = 2;

type Entry = { profilePath: string; historyAtReviews: number; scrollBefore: number };

/** Odscrolluje plochu profilu o najviac 400 px tak, aby tlačidlo recenzií ostalo vidieť; vráti, kde sa zastavila. */
async function scrollProfileDown(page: Page, button: Locator): Promise<number> {
  const box = await button.boundingBox();
  const room = box ? Math.floor(box.y - 120) : 0;
  return page.locator(MAIN).evaluate((main, wanted) => {
    const scrollable = Math.max(0, main.scrollHeight - main.clientHeight);
    main.scrollTop = Math.max(0, Math.min(400, scrollable, wanted));
    return Math.round(main.scrollTop);
  }, room);
}

/** Po návrate sa scroll vráti na miesto (zoznam dorastá) a potom drží – žiadny neskorší skok. */
async function expectScrollRestored(page: Page, expected: number, label: string): Promise<void> {
  await expect
    .poll(() => mainScrollTop(page), {
      message: `${label}: profil sa nevrátil na miesto, odkiaľ sa otvorili recenzie`,
      timeout: 10_000,
    })
    .toBeGreaterThanOrEqual(expected - SCROLL_TOLERANCE);
  await page.waitForTimeout(1500);
  const actual = await mainScrollTop(page);
  expect(Math.abs(actual - expected), `${label}: scroll po návrate nedrží (pred ${expected}, po ${actual})`).toBeLessThanOrEqual(
    SCROLL_TOLERANCE,
  );
}

/** Nástenka → vlastný profil → recenzie prvej ponuky s tlačidlom „Pridať recenziu“. */
async function openReviewsFromOwnProfile(page: Page, tap: boolean, scrollDown = false): Promise<Entry> {
  await gotoDashboardHome(page);
  const profileEntry = page
    .locator('[data-sidebar-nav-item="profile"], [data-onboarding="profile-icon"], button[aria-label="Profil"]')
    .filter({ visible: true })
    .first();
  if (tap) await profileEntry.tap();
  else await profileEntry.click();
  await expect.poll(() => pathOf(page)).toMatch(OWN_PROFILE_PATH);
  const profilePath = pathOf(page);

  const reviewButton = page.locator(REVIEW_BUTTON).filter({ visible: true }).first();
  await expect(
    reviewButton,
    'Príprava: testovací účet nemá na vlastnom profile ponuku s tlačidlom „Pridať recenziu“ – vytvor aspoň jednu.',
  ).toBeVisible();
  const scrollBefore = scrollDown ? await scrollProfileDown(page, reviewButton) : await mainScrollTop(page);
  if (scrollDown) await page.waitForTimeout(300);
  if (tap) await reviewButton.tap();
  else await reviewButton.click();

  await expect.poll(() => pathOf(page), { message: 'Tlačidlo recenzií neotvorilo stránku recenzií' }).toMatch(REVIEWS_PATH);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  return { profilePath, historyAtReviews: await historyLength(page), scrollBefore };
}

async function expectBackOnProfile(page: Page, entry: Entry, label: string): Promise<void> {
  await expect.poll(() => pathOf(page), { message: `${label}: nevrátilo na vlastný profil` }).toBe(entry.profilePath);
  // Pri starom správaní appka najprv prepíše adresu a až potom pridá záznam návratového odkazu, takže
  // dĺžku histórie a adresu treba merať až po ustálení – inak by kontrola prešla v medzistave.
  await page.waitForTimeout(800);
  expect(searchOf(page), `${label}: profil sa otvoril s otočenou kartou alebo zvýraznením`).not.toMatch(
    /side=back|offer=|highlight=/,
  );
  expect(await historyLength(page), `${label}: história narástla, takže vznikne slučka`).toBe(entry.historyAtReviews);
}

async function expectBackOnHome(page: Page, label: string): Promise<void> {
  await expect
    .poll(() => FEED_HOME_PATHS.has(pathOf(page)), {
      message: `${label}: ďalšie Späť nevedie na Nástenku, odkiaľ sa do profilu prišlo (slučka s recenziami?)`,
    })
    .toBe(true);
}

test.describe('mobil', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Šípka v hornej lište – len webkit-mobile.');
  });

  test('top-bar arrow returns to the profile and the next Back leaves it', async ({ page }) => {
    const entry = await openReviewsFromOwnProfile(page, true);

    await topBarBack(page).tap();
    await expectBackOnProfile(page, entry, 'Šípka v hornej lište');

    // Ďalší krok histórie opustí profil – vedie na Nástenku, nie späť do recenzií.
    await page.goBack();
    await expectBackOnHome(page, 'Back v prehliadači po šípke');
  });

  test('browser Back from the reviews returns to the profile', async ({ page }) => {
    const entry = await openReviewsFromOwnProfile(page, true);

    await page.goBack();
    await expectBackOnProfile(page, entry, 'Back v prehliadači z recenzií');

    // Opäť dopredu: stránka recenzií má aj po návrate dopredu funkčnú šípku.
    await page.goForward();
    await expect.poll(() => pathOf(page)).toMatch(REVIEWS_PATH);
    await topBarBack(page).tap();
    await expect.poll(() => pathOf(page)).toBe(entry.profilePath);
  });
});

test.describe('desktop', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Šípka vľavo od nadpisu – len desktopové projekty.');
  });

  test('the arrow next to the heading returns to the profile and the next Back leaves it', async ({ page }) => {
    const entry = await openReviewsFromOwnProfile(page, false);

    const arrow = page.getByRole('button', { name: BACK_BUTTON_NAME }).filter({ visible: true }).first();
    await expect(arrow, 'Na stránke recenzií chýba šípka Späť vedľa nadpisu').toBeVisible();
    const arrowBox = await arrow.boundingBox();
    const headingBox = await page.getByRole('heading', { level: 1 }).first().boundingBox();
    expect(arrowBox && headingBox, 'šípku ani nadpis sa nepodarilo zmerať').toBeTruthy();
    expect(arrowBox!.x + arrowBox!.width, 'šípka nie je vľavo od nadpisu').toBeLessThanOrEqual(headingBox!.x + 1);

    await arrow.click();
    await expectBackOnProfile(page, entry, 'Šípka vľavo od nadpisu');

    await page.goBack();
    await expectBackOnHome(page, 'Back v prehliadači po šípke');
  });
});

test.describe('cudzí profil po F5', () => {
  test.beforeEach(() => {
    test.skip(!PEER_SLUG, 'E2E_PEER_SLUG nie je nastavené – test potrebuje druhý testovací účet s ponukou (pozri .env.e2e.example).');
  });

  // Po F5 má šípka vrátiť OBYČAJNÝ profil: predtým išla na záložnú adresu s `offer=…&side=back`, takže sa karta
  // zvýraznila, otočila (na mobile otvorila spodný panel) a stránka na ňu preskočila. Teraz je to krok späť na
  // pôvodný záznam profilu (záložná adresa sa používa len bez značky pôvodu a je tiež obyčajný profil).
  test('after a reload the arrow returns to the plain profile without a highlighted or flipped card', async ({ page }, testInfo) => {
    const tap = testInfo.project.name === 'webkit-mobile';
    const peerPath = `/dashboard/users/${PEER_SLUG}`;

    await page.goto(peerPath);
    await expect.poll(() => pathOf(page), { message: 'Profil druhého účtu sa neotvoril' }).toBe(peerPath);
    const reviewButton = page.locator(REVIEW_BUTTON).filter({ visible: true }).first();
    await expect(
      reviewButton,
      'Príprava: druhý testovací účet nemá ponuku s tlačidlom „Pridať recenziu“ – vytvor aspoň jednu.',
    ).toBeVisible();
    // Tlačidlo sa najprv privedie do výhľadu – scroll pred klikom je potom to, čo sa má po návrate vrátiť.
    await reviewButton.scrollIntoViewIfNeeded();
    const scrollBefore = await mainScrollTop(page);
    if (tap) await reviewButton.tap();
    else await reviewButton.click();
    await expect.poll(() => pathOf(page), { message: 'Tlačidlo recenzií neotvorilo stránku recenzií' }).toMatch(REVIEWS_PATH);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    const arrow = tap
      ? topBarBack(page)
      : page.getByRole('button', { name: BACK_BUTTON_NAME }).filter({ visible: true }).first();
    await expect(arrow, 'Na stránke recenzií po F5 chýba šípka Späť').toBeVisible();
    if (tap) await arrow.tap();
    else await arrow.click();

    await expect.poll(() => pathOf(page), { message: 'Šípka po F5 nevrátila na profil druhého účtu' }).toBe(peerPath);
    // Zvýraznenie aj otočenie karty sa v adrese objavia hneď, no appka ich po chvíli z nej zmaže – meria sa
    // po ustálení a okrem adresy aj to, čo je naozaj vidieť.
    await page.waitForTimeout(800);
    expect(searchOf(page), 'Profil sa otvoril so zvýraznenou alebo otočenou kartou').not.toMatch(
      /side=back|offer=|highlight=/,
    );
    await expect(page.locator('.highlight-offer-card'), 'Niektorá karta je zvýraznená').toHaveCount(0);
    await expectScrollRestored(page, scrollBefore, 'Šípka po F5 (cudzí profil)');

    // F5 históriu nemení, takže šípka je krok späť na pôvodný záznam profilu – nie jeho kópia. Vstup bol priamy,
    // preto ďalšie Späť profil opustí (nesmie ostať na profile).
    await page.goBack();
    await expect
      .poll(() => pathOf(page), { message: 'Back po F5 + šípke ostal na profile (v histórii ostala kópia profilu)' })
      .not.toBe(peerPath);
  });
});

test.describe('vlastný profil po F5', () => {
  // Po F5 appka zabudne modulový stav, no história aj značka v `history.state` ostanú. Šípka má preto urobiť
  // skutočný krok späť na existujúci záznam profilu. Predtým išla záložným `replace`, ktorý k starému záznamu
  // pridal kópiu profilu bez pôvodu, a ďalšie Späť pristálo na tej kópii namiesto na Nástenke.
  test('after a reload the arrow is still a real step back and the next Back leaves the profile', async ({ page }, testInfo) => {
    const tap = testInfo.project.name === 'webkit-mobile';
    const entry = await openReviewsFromOwnProfile(page, tap);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    const arrow = tap
      ? topBarBack(page)
      : page.getByRole('button', { name: BACK_BUTTON_NAME }).filter({ visible: true }).first();
    await expect(arrow, 'Na stránke recenzií po F5 chýba šípka Späť').toBeVisible();
    if (tap) await arrow.tap();
    else await arrow.click();
    await expectBackOnProfile(page, entry, 'Šípka po F5');

    await page.goBack();
    await expectBackOnHome(page, 'Back v prehliadači po šípke po F5');
  });
});

test.describe('pozícia profilu po návrate z recenzií', () => {
  // Skok na vrch profilu po návrate je hlavná vec, ktorá používateľa obťažuje: po prelistovaní ponúk a otvorení recenzií
  // sa mal vrátiť tam, kde bol. Šípka aj Späť v prehliadači preto vracajú rovnakú pozíciu.
  test('the top-bar arrow brings the profile back to where the reviews were opened from', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Šípka v hornej lište – len webkit-mobile.');
    const entry = await openReviewsFromOwnProfile(page, true, true);
    test.skip(entry.scrollBefore < 30, 'Profil testovacieho účtu je príliš krátky na scroll – pridaj ponuky.');

    await topBarBack(page).tap();

    await expectBackOnProfile(page, entry, 'Šípka v hornej lište');
    await expectScrollRestored(page, entry.scrollBefore, 'Šípka v hornej lište');
  });

  test('browser Back brings the profile back to where the reviews were opened from', async ({ page }, testInfo) => {
    const tap = testInfo.project.name === 'webkit-mobile';
    const entry = await openReviewsFromOwnProfile(page, tap, true);
    test.skip(entry.scrollBefore < 30, 'Profil testovacieho účtu je príliš krátky na scroll – pridaj ponuky.');

    await page.goBack();

    await expectBackOnProfile(page, entry, 'Back v prehliadači');
    await expectScrollRestored(page, entry.scrollBefore, 'Back v prehliadači');
  });

  test('the arrow next to the heading brings the profile back to where the reviews were opened from', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Šípka vľavo od nadpisu – len desktopové projekty.');
    const entry = await openReviewsFromOwnProfile(page, false, true);
    test.skip(entry.scrollBefore < 30, 'Profil testovacieho účtu je príliš krátky na scroll – pridaj ponuky.');

    const arrow = page.getByRole('button', { name: BACK_BUTTON_NAME }).filter({ visible: true }).first();
    await expect(arrow, 'Na stránke recenzií chýba šípka Späť vedľa nadpisu').toBeVisible();
    await arrow.click();

    await expectBackOnProfile(page, entry, 'Šípka vľavo od nadpisu');
    await expectScrollRestored(page, entry.scrollBefore, 'Šípka vľavo od nadpisu');
  });

  // Po F5 router po kroku späť prepíše `history.state` bez vlastných kľúčov, pozícia teda musí prísť z udalosti kroku histórie.
  test('after a reload the arrow still brings the profile back to the same place', async ({ page }, testInfo) => {
    const tap = testInfo.project.name === 'webkit-mobile';
    const entry = await openReviewsFromOwnProfile(page, tap, true);
    test.skip(entry.scrollBefore < 30, 'Profil testovacieho účtu je príliš krátky na scroll – pridaj ponuky.');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    const arrow = tap
      ? topBarBack(page)
      : page.getByRole('button', { name: BACK_BUTTON_NAME }).filter({ visible: true }).first();
    await expect(arrow, 'Na stránke recenzií po F5 chýba šípka Späť').toBeVisible();
    if (tap) await arrow.tap();
    else await arrow.click();

    await expectBackOnProfile(page, entry, 'Šípka po F5');
    await expectScrollRestored(page, entry.scrollBefore, 'Šípka po F5');
  });
});

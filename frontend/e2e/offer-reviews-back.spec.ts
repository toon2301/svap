import fs from 'fs';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';

import { gotoDashboardHome, historyLength, mainScrollTop, pathOf, searchOf, topBarBack } from './support/dashboard';
import { FEED_HOME_PATHS } from './support/feed';

// Recenzie ponuky otvorené z karty vlastnej ponuky a návrat. Iba čítanie – recenzia sa nepridáva ani nemení.
//
// Šípka Späť v recenziách má urobiť SKUTOČNÝ krok späť v histórii: profil ostane v pôvodnom stave (bez
// otočenej karty a zvýraznenia) a ďalšie Späť vedie tam, odkiaľ sa do profilu prišlo. Predtým šípka profil
// otvorila ZNOVA (nový záznam), takže Späť z profilu viedlo naspäť do recenzií a dvojica sa dala
// preklikávať donekonečna. Mobil: šípka v hornej lište. Desktop: okrúhla šípka vľavo od nadpisu.
//
// Testovací účet musí mať na vlastnom profile aspoň jednu ponuku (nie „hľadám“) – tá má tlačidlo
// „Pridať recenziu“, ktoré recenzie otvára.
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

type Entry = { profilePath: string; historyAtReviews: number };

/** Nástenka → vlastný profil → recenzie prvej ponuky s tlačidlom „Pridať recenziu“. */
async function openReviewsFromOwnProfile(page: Page, tap: boolean): Promise<Entry> {
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
  if (tap) await reviewButton.tap();
  else await reviewButton.click();

  await expect.poll(() => pathOf(page), { message: 'Tlačidlo recenzií neotvorilo stránku recenzií' }).toMatch(REVIEWS_PATH);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  return { profilePath, historyAtReviews: await historyLength(page) };
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

  // Po F5 appka nevie, odkiaľ sa recenzie otvorili, a šípka ide na záložnú adresu profilu. Tá má byť OBYČAJNÝ
  // profil: predtým niesla `offer=…&side=back`, takže sa karta zvýraznila, otočila (na mobile otvorila spodný
  // panel) a stránka na ňu preskočila.
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
    expect(await mainScrollTop(page), 'Profil sa prescrolloval na kartu, z ktorej sa otvorili recenzie').toBe(0);
  });
});

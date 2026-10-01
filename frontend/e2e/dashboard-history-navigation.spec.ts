import { expect, test } from '@playwright/test';

import {
  bottomNav,
  gotoDashboardHome,
  historyLength,
  landOn,
  landOnHome,
  mainInstance,
  pathOf,
  recordMainInstance,
  sideNav,
  visiblePlaceholder,
} from './support/dashboard';

// Späť/Dopredu medzi modulmi Dashboardu: adresa, obsah a čerstvý <main> pri každom kroku. Iba čítanie.
// Nikdy neklikať na už aktívne „Žiadosti" – opakovaný klik volá markAllRead (zápis).

test.describe('mobil: spodné menu + Späť/Dopredu', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Spodné menu je len na iPhone – webkit-mobile.');
    await recordMainInstance(page);
    await gotoDashboardHome(page);
  });

  test('every module change and every history step lands on the right page with a fresh <main>', async ({
    page,
  }) => {
    const search = {
      path: '/dashboard/search',
      anchor: () => expect(visiblePlaceholder(page, /Hľadajte používateľov/)).toBeVisible(),
    };
    const messages = {
      path: '/dashboard/messages',
      anchor: () => expect(visiblePlaceholder(page, /Hľadať podľa mena/)).toBeVisible(),
    };
    const requests = {
      path: '/dashboard/requests',
      anchor: () => expect(page.getByRole('heading', { level: 1, name: 'Spolupráce' }).first()).toBeVisible(),
    };

    await landOn(page, { label: 'tap Hľadať', ...search, act: () => bottomNav(page, 'Hľadať').tap() });
    await landOn(page, { label: 'tap Správy', ...messages, act: () => bottomNav(page, 'Správy').tap() });
    await landOn(page, { label: 'tap Spolupráce', ...requests, act: () => bottomNav(page, 'Spolupráce').tap() });

    await landOn(page, { label: 'Späť 1', ...messages, act: () => page.goBack() });
    await landOn(page, { label: 'Späť 2', ...search, act: () => page.goBack() });
    await landOnHome(page, 'Späť 3 (Nástenka)', () => page.goBack());

    await landOn(page, { label: 'Dopredu 1', ...search, act: () => page.goForward() });
    await landOn(page, { label: 'Dopredu 2', ...messages, act: () => page.goForward() });
    await landOn(page, { label: 'Dopredu 3', ...requests, act: () => page.goForward() });

    await landOnHome(page, 'tap Domov', () => bottomNav(page, 'Domov').tap());
  });
});

test.describe('desktop: ľavé menu + Späť/Dopredu', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Ľavé menu je len na desktope.');
    await recordMainInstance(page);
    await gotoDashboardHome(page);
  });

  test('every module change and every history step lands on the right page with a fresh <main>', async ({
    page,
  }) => {
    const messages = {
      path: '/dashboard/messages',
      anchor: () =>
        expect(page.getByRole('heading', { level: 2, name: 'Správy', exact: true }).first()).toBeVisible(),
    };
    const requests = {
      path: '/dashboard/requests',
      anchor: () => expect(page.getByRole('heading', { level: 2, name: 'Spolupráce' }).first()).toBeVisible(),
    };

    await landOn(page, { label: 'klik Správy', ...messages, act: () => sideNav(page, 'Správy').click() });
    await landOn(page, { label: 'klik Žiadosti', ...requests, act: () => sideNav(page, 'Žiadosti').click() });

    await landOn(page, { label: 'Späť 1', ...messages, act: () => page.goBack() });
    await landOnHome(page, 'Späť 2 (Nástenka)', () => page.goBack());

    await landOn(page, { label: 'Dopredu 1', ...messages, act: () => page.goForward() });
    await landOn(page, { label: 'Dopredu 2', ...requests, act: () => page.goForward() });

    await landOnHome(page, 'klik Nástenka', () => sideNav(page, 'Nástenka').click());
  });

  test('the search panel opens without a route change, a history record or a new <main>', async ({ page }) => {
    const main = await mainInstance(page);
    const length = await historyLength(page);
    const path = pathOf(page);

    await sideNav(page, 'Vyhľadávanie').click();
    await expect(visiblePlaceholder(page, /Hľadajte používateľov/)).toBeVisible();

    expect(pathOf(page), 'Panel vyhľadávania zmenil adresu').toBe(path);
    expect(await historyLength(page), 'Panel vyhľadávania pridal záznam do histórie').toBe(length);
    expect(await mainInstance(page), 'Panel vyhľadávania vymenil <main>').toBe(main);
  });
});

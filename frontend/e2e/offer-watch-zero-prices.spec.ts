import { expect, test, type Page } from '@playwright/test';
import { skillsCategories } from '../src/constants/skillsCategories';
import skMessages from '../messages/sk.json';
import { offerWatchCategoryLabel, offerWatchSubcategoryLabel } from '../src/components/dashboard/modules/offer-watch/settings/offerWatchUi';
import { cleanupCreatedWatches, readWatches, type SavedWatch } from './support/offer-watch';

// Run only AFTER this repair and migration are deployed, using a designated test account.
// Never mutate existing watches. Keep workers=1 and do not run concurrently on the same account.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

/** Resolve Slovak catalog labels so the E2E test selects a canonical unused pair. */
function translate(key: string, fallback?: string): string {
  let value: unknown = skMessages;
  for (const part of key.split('.')) {
    value = value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined;
  }
  return typeof value === 'string' ? value : fallback || key;
}

/** Save via the real form and capture a successful new ID before any assertion for cleanup. */
async function saveWatch(page: Page, createdIds: Set<number>, id?: number): Promise<SavedWatch> {
  const method = id === undefined ? 'POST' : 'PATCH';
  const path = id === undefined ? '/api/auth/offer-watches/' : `/api/auth/offer-watches/${id}/`;
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === path && response.request().method() === method,
  );
  await page.locator('form button[type="submit"]').filter({ visible: true }).click();
  const response = await responsePromise;
  const data = await response.json().catch(() => null) as SavedWatch | null;
  // Register cleanup BEFORE any assertion about the returned price values.
  if (method === 'POST' && response.status() === 201 && Number.isSafeInteger(data?.id)) {
    createdIds.add(data!.id);
  }
  expect(response.status(), 'Saving the test watch failed').toBe(id === undefined ? 201 : 200);
  if (!data || !Number.isSafeInteger(data.id)) throw new Error('Saved watch has no valid ID.');
  return data;
}

/** Open editing for the test-created watch identified by its unique subcategory label. */
async function editWatch(page: Page, label: string) {
  await page.locator('article').filter({ has: page.getByRole('heading', { name: label, exact: true }) })
    .getByRole('button', { name: 'Upraviť sledovanie', exact: true }).click();
  await expect(page.getByLabel('Cena od', { exact: true }).filter({ visible: true })).toBeVisible();
}

/** Exercise fractional typing or fill both bounds, then commit the maximum with blur. */
async function fillPrices(page: Page, minimum: string, maximum: string) {
  const min = page.getByLabel('Cena od', { exact: true }).filter({ visible: true });
  const max = page.getByLabel('Cena do', { exact: true }).filter({ visible: true });
  if (minimum === '0,50' || minimum === '0.01') {
    await min.fill('');
    await min.pressSequentially(minimum);
    await expect(min).toHaveValue(minimum);
  } else {
    await min.fill(minimum);
  }
  await max.fill(maximum);
  await max.blur();
}

test('zero bounds create/edit, fractions, cancellation, and reload on the real deployment', async ({ page, isMobile, baseURL }, testInfo) => {
  test.skip(process.env.E2E_OFFER_WATCH_WRITES !== '1', 'Set E2E_OFFER_WATCH_WRITES=1 only for the designated test account after deployment.');
  if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
    throw new Error('This test is restricted to the configured Railway deployment.');
  }
  if (testInfo.config.workers !== 1) throw new Error('Run this test with --workers=1 to protect the shared test account.');
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    localStorage.setItem('appLocale', 'sk');
    localStorage.setItem('appLastManualOfferCountryV1', 'SK');
  });
  await page.goto('/dashboard/settings/watches');
  const initial = await readWatches(page);
  test.skip(initial.length >= 5, 'No free watch slot; existing watches will not be modified or removed.');
  const pair = Object.entries(skillsCategories).flatMap(([category, subcategories]) =>
    subcategories.map((subcategory) => ({ category, subcategory })),
  ).find(({ category, subcategory }) => !initial.some((watch) =>
    watch.category === category && watch.subcategory === subcategory,
  ));
  if (!pair) throw new Error('No unused canonical category pair is available for this test.');
  const label = offerWatchSubcategoryLabel(translate, pair.category, pair.subcategory);
  const categoryLabel = offerWatchCategoryLabel(translate, pair.category);
  const createdIds = new Set<number>();

  try {
    if (isMobile) {
      await page.getByRole('button', { name: 'Vytvoriť sledovanie', exact: true }).click();
      await page.getByRole('button', { name: /^Podkategória:/ }).click();
      await page.getByRole('searchbox').fill(label);
    } else {
      await page.getByRole('combobox', { name: 'Podkategória', exact: true }).fill(label);
    }
    await page.getByRole('option')
      .filter({ has: page.getByText(label, { exact: true }) })
      .filter({ has: page.getByText(categoryLabel, { exact: true }) }).click();
    await fillPrices(page, '0', '0,00');
    const currency = page.getByRole('combobox', { name: 'Mena', exact: true }).filter({ visible: true });
    await expect(currency).toBeDisabled();
    const created = await saveWatch(page, createdIds);
    expect([created.category, created.subcategory]).toEqual([pair.category, pair.subcategory]);
    expect([created.price_min, created.price_max, created.price_currency]).toEqual([null, null, '']);

    for (const [minimum, maximum, savedMin, savedMax] of [
      ['100', '0', '100.00', null],
      ['0', '100', null, '100.00'],
      ['0,50', '0', '0.50', null],
      ['0.01', '0', '0.01', null],
      ['0', '0', null, null],
    ] as const) {
      await editWatch(page, label);
      await fillPrices(page, minimum, maximum);
      const saved = await saveWatch(page, createdIds, created.id);
      expect([saved.price_min, saved.price_max, saved.price_currency])
        .toEqual([savedMin, savedMax, savedMin === null && savedMax === null ? '' : '€']);
    }

    const beforeCancel = (await readWatches(page)).find((watch) => watch.id === created.id)!;
    await editWatch(page, label);
    await fillPrices(page, '10', '100');
    await page.getByRole('button', { name: 'Zrušiť', exact: true }).filter({ visible: true }).click();
    await expect(page.locator('article').filter({ has: page.getByRole('heading', { name: label, exact: true }) })).toBeVisible();
    const afterCancel = (await readWatches(page)).find((watch) => watch.id === created.id)!;
    expect(afterCancel.updated_at).toBe(beforeCancel.updated_at);
    expect([afterCancel.price_min, afterCancel.price_max, afterCancel.price_currency]).toEqual([null, null, '']);
    await page.reload();
    await editWatch(page, label);
    await expect(page.getByLabel('Cena od', { exact: true }).filter({ visible: true })).toHaveValue('');
    await expect(page.getByLabel('Cena do', { exact: true }).filter({ visible: true })).toHaveValue('');
    await expect(page.getByRole('combobox', { name: 'Mena', exact: true }).filter({ visible: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Zrušiť', exact: true }).filter({ visible: true }).click();
  } finally {
    await cleanupCreatedWatches(page, createdIds);
  }
});

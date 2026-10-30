import { expect, test, type Locator, type Page } from './support/diagnostic-test';
import sk from '../messages/sk.json';
import cs from '../messages/cs.json';
import en from '../messages/en.json';
import de from '../messages/de.json';
import pl from '../messages/pl.json';
import hu from '../messages/hu.json';
import { pathOf } from './support/dashboard';
import { expectAppPath, readOwnProfilePaths } from './support/own-profile-fixture';

// Real Railway routes only. Language/theme changes remain in this isolated browser's storage.
// Do not create test accounts, modify cards, or publish profile/hint changes.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

const RAILWAY_ORIGIN = 'https://stunning-inspiration-svap.up.railway.app';
const MESSAGES = { sk, cs, en, de, pl, hu };
const EXPECTED_TITLES = {
  sk: 'Jazyk', cs: 'Jazyk', en: 'Language', de: 'Sprache', pl: 'Język', hu: 'Nyelv',
} as const;
const LOCALES = ['sk', 'cs', 'en', 'de', 'pl', 'hu'] as const;
const LANGUAGE_KEYS = ['slovak', 'czech', 'english', 'german', 'polish', 'hungarian'] as const;
type Locale = typeof LOCALES[number];

/** Identify the existing mobile header without adding a production-only test marker. */
function mobileTopBar(page: Page): Locator {
  return page.locator('div.fixed.top-0.left-0.right-0').filter({
    has: page.locator('div.grid.h-12'),
  });
}

/** Set initial browser preferences without overriding a later user language choice on reload. */
async function setInitialPreferences(page: Page, locale: Locale, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript(({ language, colorTheme }) => {
    if (!sessionStorage.getItem('e2eLanguageHeaderInitialized')) {
      localStorage.setItem('appLocale', language);
      localStorage.setItem('svaply_theme', colorTheme);
      sessionStorage.setItem('e2eLanguageHeaderInitialized', '1');
    }
  }, { language: locale, colorTheme: theme });
}

/** Assert the one mobile title, unchanged description/options, exact centering, and viewport fit. */
async function expectMobileLanguage(page: Page, locale: Locale): Promise<void> {
  const title = EXPECTED_TITLES[locale];
  const messages = MESSAGES[locale];
  const header = mobileTopBar(page);
  const main = page.locator('[data-dashboard-main]');
  await expect(header).toBeVisible();
  const heading = header.getByRole('heading', { level: 1, name: title, exact: true });
  await expect(heading).toBeVisible();
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(1);
  await expect(main.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  await expect(header.locator('[data-onboarding="profile-icon"]')).toHaveCount(0);
  await expect(header.getByRole('button', { name: messages.navigation.profile, exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: messages.common.back, exact: true })).toBeVisible();
  await expect(main.getByText(messages.language.selectLanguage, { exact: true }).filter({ visible: true })).toBeVisible();
  for (const key of LANGUAGE_KEYS) {
    await expect(main.getByRole('button', { name: messages.language[key], exact: true })).toBeVisible();
  }
  const selectedKey = LANGUAGE_KEYS[LOCALES.indexOf(locale)];
  await expect(main.getByRole('button', { name: messages.language[selectedKey], exact: true }).locator('svg'))
    .toHaveCount(1);
  const headerBounds = await header.boundingBox();
  const titleBounds = await heading.boundingBox();
  expect(headerBounds).not.toBeNull();
  expect(titleBounds).not.toBeNull();
  expect(Math.abs((titleBounds!.x + titleBounds!.width / 2) - (headerBounds!.x + headerBounds!.width / 2)))
    .toBeLessThan(2);
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(headerBounds!.x).toBeGreaterThanOrEqual(0);
  expect(headerBounds!.x + headerBounds!.width).toBeLessThanOrEqual(viewportWidth);
  expect(titleBounds!.x).toBeGreaterThanOrEqual(headerBounds!.x);
  expect(titleBounds!.x + titleBounds!.width).toBeLessThanOrEqual(headerBounds!.x + headerBounds!.width);
  const headerWidths = await header.evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
  expect(headerWidths.scroll).toBeLessThanOrEqual(headerWidths.client);
}

let attemptedWrites: string[];
test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL !== RAILWAY_ORIGIN) throw new Error('Language-header tests are restricted to the configured Railway deployment.');
  attemptedWrites = [];
  await page.route((url) => /^\/api\/auth\/(?:offer-watches|skills|me|users|hints)(?:\/|$)/.test(url.pathname), async (route) => {
    const method = route.request().method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await route.continue();
    } else {
      attemptedWrites.push(method);
      await route.abort();
    }
  });
});
test.afterEach(() => {
  expect(attemptedWrites, 'Language/header checks must not modify server-side content, profiles, or hints').toEqual([]);
});

for (const locale of LOCALES) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`Language header – ${locale} / ${theme}`, () => {
      test.beforeEach(async ({ page }) => {
        await setInitialPreferences(page, locale, theme);
      });

      for (const entry of ['standalone', 'profile-section'] as const) {
        test(`mobile: ${entry} has one centered title, no profile shortcut, and six choices`, async ({ page, isMobile }) => {
          test.skip(!isMobile, 'The mobile header and desktop detail are different layouts.');
          await page.setViewportSize({ width: 320, height: 640 });
          const route = entry === 'standalone' ? '/dashboard/language'
            : `${(await readOwnProfilePaths(page)).canonical}/language`;
          await page.goto(route);
          await expectMobileLanguage(page, locale);
          await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark')))
            .toBe(theme === 'dark');
          await page.reload();
          await expectMobileLanguage(page, locale);
          await expectAppPath(page, route, RAILWAY_ORIGIN);
        });
      }

      test('desktop: retains the existing detail heading, description, back button, and six choices', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Desktop controls must remain unchanged.');
        await page.goto('/dashboard/language');
        const main = page.locator('[data-dashboard-main]');
        const messages = MESSAGES[locale];
        await expect(main.getByRole('heading', { level: 2, name: EXPECTED_TITLES[locale], exact: true })).toBeVisible();
        await expect(main.getByText(messages.language.languageSelection, { exact: true })).toBeVisible();
        await expect(main.getByText(messages.language.selectLanguage, { exact: true }).filter({ visible: true })).toHaveCount(1);
        await expect(main.getByRole('button', { name: messages.common.back, exact: true })).toBeVisible();
        await expect(mobileTopBar(page)).toBeHidden();
        for (const key of LANGUAGE_KEYS) {
          const label = main.getByText(messages.language[key], { exact: true }).filter({ visible: true });
          await expect(label).toBeVisible();
          await expect(label.locator('..').getByRole('button')).toBeVisible();
        }
        await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark')))
          .toBe(theme === 'dark');
      });
    });
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`mobile: ${theme} language changes update the top title and survive reload`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Browser-only mobile language selection.');
    await setInitialPreferences(page, 'sk', theme);
    await page.goto('/dashboard/language');
    let currentLocale: Locale = 'sk';
    await expectMobileLanguage(page, currentLocale);
    for (const nextLocale of LOCALES) {
      const key = LANGUAGE_KEYS[LOCALES.indexOf(nextLocale)];
      await page.locator('[data-dashboard-main]').getByRole('button', {
        name: MESSAGES[currentLocale].language[key], exact: true,
      }).tap();
      await expectMobileLanguage(page, nextLocale);
      await expect.poll(() => page.evaluate(() => localStorage.getItem('appLocale'))).toBe(nextLocale);
      currentLocale = nextLocale;
    }
    await page.reload();
    await expectMobileLanguage(page, 'hu');
  });

  test(`mobile: ${theme} language app Back and browser Back preserve the settings/profile flow`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Real mobile settings navigation.');
    await setInitialPreferences(page, 'sk', theme);
    const profilePath = (await readOwnProfilePaths(page)).canonical;
    await page.goto(profilePath);
    await mobileTopBar(page).getByRole('button', { name: sk.common.menu, exact: true }).tap();
    await expect.poll(() => pathOf(page)).toBe('/dashboard/settings');
    const languageRow = page.locator('[data-mobile-settings-scroll]').getByRole('button', { name: /^Jazyk/ });
    await languageRow.tap();
    await expect.poll(() => pathOf(page)).toBe('/dashboard/language');
    await expectMobileLanguage(page, 'sk');
    await mobileTopBar(page).getByRole('button', { name: sk.common.back, exact: true }).tap();
    await expect.poll(() => pathOf(page)).toBe('/dashboard/settings');
    await expect(languageRow).toBeVisible();
    await languageRow.tap();
    await expect.poll(() => pathOf(page)).toBe('/dashboard/language');
    await page.goBack();
    await expect.poll(() => pathOf(page)).toBe('/dashboard/settings');
    await expect(languageRow).toBeVisible();
    await page.getByRole('button', { name: 'Zatvoriť', exact: true }).filter({ visible: true }).tap();
    await expectAppPath(page, profilePath, RAILWAY_ORIGIN);
    await expect(mobileTopBar(page).getByRole('button', { name: sk.common.menu, exact: true })).toBeVisible();
  });
}

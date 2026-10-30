import { expect, test, type Locator, type Page, type Request, type Response } from './support/diagnostic-test';
import { bottomNav, gotoDashboardHome, sideNav } from './support/dashboard';

const DIAGNOSTICS = 'Diagnostika vyhľadávania';
const WAITING = 'Zopakuj vyhľadávanie, aby sa zachytil nový pokus.';
const QUERY = 'MoNiToRoVaNiE';
const SEARCH_PATH = '/api/auth/dashboard/search/';

// Genuine Railway responses only. No content creation, Like, hint, profile, or messaging writes.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

function isSearchRequest(request: Request): boolean {
  return request.method() === 'GET' && new URL(request.url()).pathname === SEARCH_PATH;
}

function diagnosticValue(region: Locator, label: string): Locator {
  return region.locator('dt').filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::dd[1]');
}

/** A deliberately bounded observation window also catches a delayed debounce side effect. */
async function expectNoSearchRequest(page: Page, action: () => Promise<unknown>): Promise<void> {
  const unexpectedRequest = page.waitForRequest(isSearchRequest, { timeout: 900 }).then(
    () => true,
    (error: unknown) => {
      if (error instanceof Error && error.name === 'TimeoutError') return false;
      throw error;
    },
  );
  await action();
  expect(await unexpectedRequest, 'Toggling or reopening diagnostics must not launch a search').toBe(false);
}

/** Reduce the actual response immediately to safe country/status/collection aggregates. */
async function searchSummary(response: Response): Promise<{ country: string | null; count: number; status: number }> {
  const status = response.status();
  if (status !== 200) throw new Error(`The real dashboard search failed: HTTP ${status}.`);
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('skills' in data) || !('users' in data)
    || !Array.isArray(data.skills) || !Array.isArray(data.users)) {
    throw new Error('The real dashboard search returned invalid aggregate collections.');
  }
  return {
    country: new URL(response.url()).searchParams.get('country'),
    count: data.skills.length,
    status,
  };
}

/** Only locale/theme/country are initialized in the isolated test context, never a user's PWA. */
async function openPanel(page: Page, isMobile: boolean, theme: 'light' | 'dark'): Promise<Locator> {
  await page.addInitScript((colorTheme) => {
    localStorage.setItem('appLocale', 'sk');
    localStorage.setItem('svaply_theme', colorTheme);
    localStorage.setItem('appLastManualOfferCountryV1', 'SK');
    localStorage.setItem('appGeoDetectionCacheV2', JSON.stringify({
      country: 'SK', detectedAt: Date.now(), status: 'ok',
    }));
  }, theme);
  if (isMobile) await page.setViewportSize({ width: 320, height: 700 });
  await gotoDashboardHome(page);
  if (isMobile) await bottomNav(page, 'Hľadať').tap();
  else await sideNav(page, 'Vyhľadávanie').click();
  const input = page.locator('[data-onboarding="search-input"] input').filter({ visible: true });
  await expect(input).toBeVisible();
  await expect(page.getByRole('button', { name: DIAGNOSTICS, exact: true }).filter({ visible: true }))
    .toHaveAttribute('aria-expanded', 'false');
  return input;
}

/** Spustí `trigger` a vráti zhrnutie odpovede na skutočné hľadanie `QUERY`; čakanie na odpoveď sa začne ešte pred ním. */
async function searchAfter(page: Page, trigger: () => Promise<unknown>): Promise<Awaited<ReturnType<typeof searchSummary>>> {
  const response = page.waitForResponse((candidate) => (
    isSearchRequest(candidate.request()) && new URL(candidate.url()).searchParams.get('q') === QUERY
  ));
  await trigger();
  return searchSummary(await response);
}

async function runSearch(page: Page, input: Locator): Promise<Awaited<ReturnType<typeof searchSummary>>> {
  return searchAfter(page, async () => {
    await input.fill(QUERY);
    await input.press('Enter');
  });
}

/**
 * Opakovanie rovnakého hľadania. Od OW-20 appka nechá zobrazené staré výsledky, no vždy ich znovu overí skutočnou
 * požiadavkou na server, takže diagnostika zachytí nový pokus zo siete, nie z pamäte (nález TEST-17).
 */
async function repeatSearch(page: Page, input: Locator): Promise<Awaited<ReturnType<typeof searchSummary>>> {
  return searchAfter(page, () => input.press('Enter'));
}

test.describe('Local read-only search diagnostics', () => {
  let attemptedWrites: string[];

  test.beforeEach(async ({ page, baseURL }) => {
    if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
      throw new Error('These tests are restricted to the configured Railway deployment.');
    }
    attemptedWrites = [];
    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request();
      const sessionRefresh = ['/api/token/refresh/', '/api/auth/token/refresh/']
        .includes(new URL(request.url()).pathname);
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || sessionRefresh) {
        await route.continue();
      } else {
        attemptedWrites.push(request.method());
        await route.abort();
      }
    });
  });

  test.afterEach(() => {
    expect(attemptedWrites, 'Diagnostic checks must not write application content or settings').toEqual([]);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: network aggregates match the real response; repeat is revalidated over the network and toggles stay passive`, async ({ page, isMobile }) => {
      const input = await openPanel(page, isMobile, theme);
      const toggle = page.getByRole('button', { name: DIAGNOSTICS, exact: true }).filter({ visible: true });
      const region = page.getByRole('region', { name: DIAGNOSTICS, exact: true });
      await expect(region).toHaveCount(0);
      await expectNoSearchRequest(page, async () => {
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(region.getByText(WAITING, { exact: true })).toBeVisible();
      });

      const actual = await runSearch(page, input);
      await expect(region.getByText('Sieť', { exact: true })).toBeVisible();
      await expect(diagnosticValue(region, 'Odoslaná krajina')).toHaveText(actual.country || 'Neposlaná');
      await expect(diagnosticValue(region, 'Krajina filtra')).toHaveText('SK');
      await expect(diagnosticValue(region, 'HTTP stav')).toHaveText(String(actual.status));
      await expect(diagnosticValue(region, 'Počet vrátených kariet')).toHaveText(String(actual.count));
      await expect(region).not.toContainText(QUERY);
      await expect(region.getByRole('textbox')).toHaveCount(0);

      const repeated = await repeatSearch(page, input);
      await expect(region.getByText('Sieť', { exact: true })).toBeVisible();
      await expect(region.getByText('Pamäť výsledkov', { exact: true })).toHaveCount(0);
      await expect(diagnosticValue(region, 'Odoslaná krajina')).toHaveText(repeated.country || 'Neposlaná');
      await expect(diagnosticValue(region, 'HTTP stav')).toHaveText(String(repeated.status));
      await expect(diagnosticValue(region, 'Počet vrátených kariet')).toHaveText(String(repeated.count));

      await expectNoSearchRequest(page, async () => {
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(region).toHaveCount(0);
      });
      await expectNoSearchRequest(page, async () => {
        await toggle.click();
        await expect(region.getByText(WAITING, { exact: true })).toBeVisible();
        await expect(region.getByText('Pamäť výsledkov', { exact: true })).toHaveCount(0);
      });
      await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark')))
        .toBe(theme === 'dark');
      const viewport = page.viewportSize();
      const bounds = await region.boundingBox();
      expect(viewport).not.toBeNull();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
    });
  }

  test('enabling after a completed search does not reconstruct or expose an older attempt', async ({ page, isMobile }) => {
    const input = await openPanel(page, isMobile, 'light');
    await runSearch(page, input);
    const toggle = page.getByRole('button', { name: DIAGNOSTICS, exact: true }).filter({ visible: true });
    const region = page.getByRole('region', { name: DIAGNOSTICS, exact: true });
    await expect(region).toHaveCount(0);
    await expectNoSearchRequest(page, async () => {
      await toggle.click();
      await expect(region.getByText(WAITING, { exact: true })).toBeVisible();
      await expect(diagnosticValue(region, 'HTTP stav')).toHaveCount(0);
      await expect(diagnosticValue(region, 'Krajina filtra')).toHaveCount(0);
    });
    // Prvý zachytený pokus je až opakovanie po zapnutí diagnostiky (zo siete), nie staršie hľadanie.
    const repeated = await repeatSearch(page, input);
    await expect(region.getByText(WAITING, { exact: true })).toHaveCount(0);
    await expect(region.getByText('Sieť', { exact: true })).toBeVisible();
    await expect(diagnosticValue(region, 'HTTP stav')).toHaveText(String(repeated.status));
  });
});

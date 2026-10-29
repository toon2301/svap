import { expect, type Page } from '@playwright/test';
import { observePage } from './page-activity';

// Stránka `/search` pri prvom načítaní pošle to isté hľadanie DVAKRÁT: prvýkrát hneď (používateľ ešte nie je známy) a druhýkrát
// po odpovedi `/api/auth/me/`, lebo `user?.id` je v závislostiach načítania (`app/search/page.tsx`, nález 216). Druhé hľadanie
// na chvíľu nahradí sekciu „Ľudia“ kostrou, ktorá je o 14 px vyššia, a Chromium pri tom posunie `scrollTop` (scroll anchoring).
// Test, ktorý zmeria pozíciu alebo ťukne, kým to beží, potom porovnáva pozíciu z iného rozloženia, než v akom odišiel
// (nález 217). Preto sa pred meraním a klikaním počká, kým sa stránka ustáli. Nič sa tým nezmäkčuje: asercie a tolerancie
// testov ostávajú rovnaké.

/** Ako dlho musí byť hľadanie bez aktivity a od načítania používateľa, aby sa druhé hľadanie stihlo začať aj skončiť. */
const SEARCH_QUIET_MS = 400;
/** Ako dlho sa nesmie meniť výška výsledkov ani sa objaviť kostra. */
const LAYOUT_QUIET_MS = 300;
const SETTLE_TIMEOUT_MS = 15_000;

/** Beží v prehliadači (serializuje sa), preto nesmie používať nič z modulu. Čaká na nemennú výšku a žiadne kostry. */
function waitForQuietLayout({ quietMs, timeoutMs }: { quietMs: number; timeoutMs: number }): Promise<void> {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) return Promise.reject(new Error('The results scroller [data-dashboard-main] is missing'));
  return new Promise<void>((resolve, reject) => {
    const started = performance.now();
    let signature = '';
    let since = started;
    const tick = () => {
      const now = performance.now();
      const loading = main.querySelectorAll('[data-search-loading="true"]').length;
      const next = `${main.scrollHeight}|${main.clientHeight}|${main.clientWidth}`;
      if (next !== signature || loading > 0) {
        signature = next;
        since = now;
      }
      if (now - since >= quietMs) {
        resolve();
        return;
      }
      if (now - started > timeoutMs) {
        reject(new Error(`The search results kept changing for ${timeoutMs} ms (${signature}, skeletons: ${loading})`));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Počká, kým stránka `/search` dokončí úvodné načítanie: prihlásený používateľ je známy (panel s vyhľadávacím poľom je
 * pripojený), obe hľadania skončili a výsledky sa nehýbu. Volať po zobrazení prvých výsledkov a pred meraním pozície,
 * ťukom na kartu alebo prácou s panelom.
 */
export async function waitForSearchSettled(page: Page): Promise<void> {
  const activity = observePage(page);
  // Panel (a v ňom vyhľadávacie pole) sa pripojí až po načítaní prihláseného používateľa; práve vtedy stránka pošle druhé hľadanie.
  await expect(
    page.locator('[data-onboarding="search-input"] input').first(),
    'The authenticated viewer must load before the search page is used (the panel mounts only after it)',
  ).toBeAttached();
  const viewerKnownAt = Date.now();
  // Dva snímky: efekt, ktorý posiela druhé hľadanie, sa v tom čase už vykonal a jeho požiadavka je zaznamenaná.
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect.poll(
    () => (Date.now() - viewerKnownAt >= SEARCH_QUIET_MS ? activity.searchQuietForMs() : 0),
    { message: 'Both initial searches must finish before the page is used', timeout: SETTLE_TIMEOUT_MS },
  ).toBeGreaterThanOrEqual(SEARCH_QUIET_MS);
  await page.evaluate(waitForQuietLayout, { quietMs: LAYOUT_QUIET_MS, timeoutMs: SETTLE_TIMEOUT_MS });
}

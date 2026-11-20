import { expect, type Locator, type Page } from '@playwright/test';

/** Zobrazí existujúcu dostupnú fotku aj za rozpracovaným slidom; len skutočné UI, najviac päť fotiek. */
export async function revealCommentFixturePhoto(area: Locator, imageId: number, mobile: boolean): Promise<boolean> {
  // Jedna snímka DOM: polling nesmie medzi čítaním počtu a indexu zmeniť ich význam.
  const readState = () => area.evaluate((node, id) => {
    const dots = Array.from(node.querySelectorAll('[data-testid="feed-image-dots"] button'));
    return { target: Boolean(node.querySelector(`[data-testid="feed-image-open-${id}"]`)), count: dots.length,
      current: dots.findIndex(dot => dot.getAttribute('aria-current') === 'true') };
  }, imageId);
  for (let step = 0; step < 4; step += 1) {
    const before = await readState();
    if (before.target) return true;
    if (before.count < 2) return false;
    if (before.count > 5) throw new Error('Fotografický podklad prekročil povolený počet fotiek.');
    if (before.current < 0) throw new Error('Fotografický podklad nepotvrdil aktívny slide.');
    const next = area.getByTestId('feed-image-next');
    try { if (mobile) await next.tap(); else await next.click(); } catch {
      // Pri zamietnutí počas samotného ťuku môže šípka zmiznúť spolu s bodkami.
      if ((await readState()).target) return true;
      throw new Error('Navigácia fotografického podkladu nebola dokončená.');
    }
    await expect.poll(async () => {
      const after = await readState();
      return after.target || after.count !== before.count || after.current === (before.current + 1) % before.count;
    }, { message: 'Karusel fotografického podkladu nepotvrdil posun.' }).toBe(true);
  }
  return (await readState()).target;
}

/** Poradie kariet slúži iba na prehliadnutie carouselov, identitu určuje výhradne overené ID fotky. */
export async function findCommentFixtureCard(page: Page, imageId: number, mobile: boolean): Promise<Locator> {
  const cards = page.getByTestId('feed-list').getByTestId('feed-post-card').and(page.locator('[data-post-type="free_post"]'));
  await expect(cards.first()).toBeVisible();
  const target = cards.filter({ has: page.getByTestId(`feed-image-open-${imageId}`) });
  if (await target.count()) return target;
  for (let index = 0, count = await cards.count(); index < count; index += 1) {
    const card = cards.nth(index);
    if (await card.getByTestId('feed-image-next').count()
      && await revealCommentFixturePhoto(card, imageId, mobile)) break;
  }
  return target;
}

import { expect, type Locator, type Page } from '@playwright/test';

/** Zobrazí existujúcu dostupnú fotku aj za rozpracovaným slidom; len skutočné UI, najviac päť fotiek. */
export async function revealCommentFixturePhoto(area: Locator, imageId: number, mobile: boolean): Promise<boolean> {
  const target = area.getByTestId(`feed-image-open-${imageId}`);
  if (await target.count()) return true;
  const dots = area.getByTestId('feed-image-dots').getByRole('button');
  const count = await dots.count();
  if (count < 2) return false;
  if (count > 5) throw new Error('Fotografický podklad prekročil povolený počet fotiek.');
  for (let step = 1; step < count; step += 1) {
    const current = await dots.evaluateAll(nodes => nodes.findIndex(node => node.getAttribute('aria-current') === 'true'));
    if (current < 0) throw new Error('Fotografický podklad nepotvrdil aktívny slide.');
    const next = area.getByTestId('feed-image-next');
    if (mobile) await next.tap(); else await next.click();
    await expect(dots.nth((current + 1) % count)).toHaveAttribute('aria-current', 'true');
    if (await target.count()) return true;
  }
  return false;
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

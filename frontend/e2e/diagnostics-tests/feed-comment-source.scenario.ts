import { expect, test } from '../support/diagnostic-test';
import { revealCommentFixturePhoto } from '../support/feed-comment-source';
import { CAROUSEL_CASES, syntheticCarouselPage } from './feed-comment-source-cases';

for (const scenario of CAROUSEL_CASES) test(`[${scenario.mode}] ${scenario.name}`, async ({ page, isMobile }) => {
  await page.setContent(syntheticCarouselPage(scenario.mode));
  const area = page.locator('#carousel');
  let found: boolean | null = null;
  let error: unknown;
  try { found = await revealCommentFixturePhoto(area, 301, isMobile); } catch (caught) { error = caught; }
  if ('error' in scenario) {
    expect(error instanceof Error && error.message.includes(scenario.error), 'Musí zlyhať práve skúšaná podmienka karuselu.').toBe(true);
    expect(found).toBeNull();
  } else {
    expect(error === undefined, 'Platný podklad ani jeho neprítomnosť nesmú vyvolať neočakávanú chybu.').toBe(true);
    expect(found).toBe(scenario.found);
  }
  const counts = await area.evaluate(node => ({ moves: Number((node as HTMLElement).dataset.moves),
    touch: Number((node as HTMLElement).dataset.touch), mouse: Number((node as HTMLElement).dataset.mouse) }));
  expect(counts).toEqual({ moves: scenario.moves, touch: isMobile ? scenario.moves : 0, mouse: isMobile ? 0 : scenario.moves });
});

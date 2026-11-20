import { expect, type Page } from '@playwright/test';

/** Skutočný klik na meno v otvorenom detaile; do chyby sa nedostane adresa ani meno účtu. */
export async function openCommentAuthorProfileFromOverlay(page: Page): Promise<void> {
  let phase = 'meno autora komentára';
  try {
    const overlay = page.getByTestId('feed-post-overlay');
    await expect(overlay).toBeVisible();
    const author = overlay.locator('button[data-testid^="feed-comment-author-"]:enabled').first();
    await expect(author).toBeVisible();
    await expect(author).toBeEnabled();
    await author.click();
    phase = 'zatvorenie detailu nad profilom';
    await expect(overlay, 'Po prekliku na autora komentára nesmie ostať otvorený detail príspevku.').toBeHidden();
    phase = 'adresa profilu';
    await expect.poll(() => /^\/dashboard\/users\/[^/?#]+\/?$/.test(new URL(page.url()).pathname), {
      message: 'Klik na autora komentára musí otvoriť profil.',
    }).toBe(true);
  } catch { throw new Error(`Preklik na autora komentára neprešiel; krok: ${phase}.`); }
}

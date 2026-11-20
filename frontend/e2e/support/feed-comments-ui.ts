import { expect, type Locator, type Page } from '@playwright/test';
import type { FeedCommentsSession } from './feed-comments-session';
import type { FeedCommentsWriteAudit } from './feed-comments-writes';
import { findCommentFixtureCard, revealCommentFixturePhoto } from './feed-comment-source';

/** Mobil používa skutočný ťuk, desktop klik; bez force a bez nahrádzania UI volaním API. */
async function activate(target: Locator, mobile: boolean): Promise<void> {
  if (mobile) await target.tap(); else await target.click();
}

export async function exerciseOwnFeedComment(
  page: Page, mobile: boolean, session: FeedCommentsSession, audit: FeedCommentsWriteAudit, timeout: number,
): Promise<void> {
  let phase = 'otvorenie Nástenky';
  try {
    await page.addInitScript(() => { localStorage.setItem('appLocale', 'sk'); });
    await page.goto('/dashboard');
    await expect(page.getByTestId('feed-list').or(page.getByTestId('feed-empty-state'))).toBeVisible();
    phase = 'príprava vlastného podkladu';
    await session.prepare();
    await page.reload();
    const cards = page.getByTestId('feed-list').getByTestId('feed-post-card');
    const source = session.sourceImageId === null ? cards.filter({ hasText: session.postCaption })
      : await findCommentFixtureCard(page, session.sourceImageId, mobile);
    await expect(source).toHaveCount(1);
    await expect(source).toHaveAttribute('data-post-type', 'free_post');
    phase = 'otvorenie detailu';
    await activate(source.getByTestId('feed-comments-button'), mobile);
    const detail = page.getByTestId(mobile ? 'feed-mobile-detail' : 'feed-post-overlay');
    await expect(detail).toBeVisible();
    if (session.reusesPhotoPost) {
      const media = detail.getByTestId('feed-mobile-detail-photo');
      if (session.sourceImageId === null || !await revealCommentFixturePhoto(media, session.sourceImageId, mobile)) {
        throw new Error('Detail neobsahuje overenú dostupnú fotku podkladu.');
      }
      const photo = media.locator('img').first();
      await expect(photo).toBeVisible();
      await expect.poll(() => photo.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0), {
        message: 'Podklad musí mať skutočne načítanú fotku, nie pokazený obrázok.',
      }).toBe(true);
      await expect.poll(() => detail.locator('[data-comment-id]').count(), {
        message: 'Pred pridaním musia byť načítané aspoň tri existujúce komentáre.',
      }).toBeGreaterThanOrEqual(3);
    }
    const comments = mobile ? detail.getByTestId('feed-post-comments')
      : detail.getByTestId('feed-post-overlay-comments').getByTestId('feed-post-comments');
    const input = comments.getByRole('textbox', { name: 'Napíš komentár...', exact: true });
    await expect(input).toBeVisible();
    await input.fill(session.commentText);
    const send = comments.getByRole('button', { name: 'Pridať', exact: true });
    await expect(send).toBeEnabled();
    phase = 'pridanie vlastného komentára';
    const created = page.waitForResponse(reply => reply.request().method() === 'POST'
      && new URL(reply.url()).pathname === session.commentsPath(), { timeout })
      .then(async reply => {
        const data = await reply.json().catch(() => null);
        session.takeComment(data); return reply.status();
      }).catch(() => 0);
    session.noteCommentAttempt();
    await activate(send, mobile);
    if (await created !== 201 || session.commentId === null) throw new Error('Vytvorenie komentára nebolo potvrdené.');
    const row = comments.locator(`[data-comment-id="${session.commentId}"]`);
    await expect(row).toHaveCount(1);
    await expect(row).toBeVisible();
    if (mobile) await expect(row).toBeInViewport({ ratio: 1 });
    await expect(row.locator('p').first()).toHaveText(session.commentText);
    await expect(input).toHaveValue('');
    phase = 'GET po pridaní';
    await session.verifyComment(true);
    phase = 'zmazanie vlastného komentára';
    await activate(row.getByRole('button', { name: 'Zmazať komentár', exact: true }), mobile);
    const confirm = page.getByTestId('feed-comment-delete-confirm');
    await expect(confirm).toBeVisible();
    const removed = page.waitForResponse(reply => reply.request().method() === 'DELETE'
      && new URL(reply.url()).pathname === `${session.commentsPath()}${session.commentId}/`, { timeout })
      .then(reply => reply.status(), () => 0);
    await activate(confirm.getByTestId('feed-comment-delete-confirm-action'), mobile);
    if (await removed !== 204) throw new Error('Zmazanie komentára nebolo potvrdené.');
    await expect(confirm).toBeHidden();
    await expect(row).toHaveCount(0);
    phase = 'GET po zmazaní';
    await session.verifyComment(false);
    audit.assertUIComplete();
  } catch { throw new Error(`Kontrola vlastného komentára neuspela; krok: ${phase}.`); }
}

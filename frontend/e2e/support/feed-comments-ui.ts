import { expect, type Locator, type Page } from '@playwright/test';
import type { FeedCommentsSession } from './feed-comments-session';
import type { FeedCommentsWriteAudit } from './feed-comments-writes';

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
    await expect(page.getByTestId('feed-list')).toBeVisible();
    phase = 'príprava vlastného podkladu';
    await session.prepare();
    await page.reload();
    const source = page.getByTestId('feed-list').getByTestId('feed-post-card').filter({ hasText: session.postCaption });
    await expect(source).toHaveCount(1);
    await expect(source).toHaveAttribute('data-post-type', 'free_post');
    phase = 'otvorenie detailu';
    await activate(source.getByTestId('feed-comments-button'), mobile);
    const detail = page.getByTestId(mobile ? 'feed-mobile-detail' : 'feed-post-overlay');
    await expect(detail).toBeVisible();
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
    await activate(send, mobile);
    if (await created !== 201 || session.commentId === null) throw new Error('Vytvorenie komentára nebolo potvrdené.');
    const row = comments.locator(`[data-comment-id="${session.commentId}"]`);
    await expect(row).toHaveCount(1);
    await expect(row).toBeVisible();
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

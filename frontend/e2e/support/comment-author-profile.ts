import { expect, type Page } from '@playwright/test';

export type CommentAuthorTarget = { commentId: number; identifier: string };

/** Čisté GET: zaniknuté dáta smú chýbať, HTTP a neplatný kontrakt nesmú byť tichý SKIP. */
export async function findNotificationCommentAuthor(
  page: Page, targets: string[],
): Promise<(CommentAuthorTarget & { index: number }) | null> {
  return page.evaluate(async urls => {
    for (let index = 0; index < urls.length; index += 1) {
      const postId = /^\/dashboard\/feed\/(\d+)(?:\?|$)/.exec(urls[index])?.[1];
      if (!postId) continue;
      const options = { credentials: 'include', cache: 'no-store' } as const;
      const post = await fetch(`/api/auth/feed/posts/${postId}/`, options);
      if ([403, 404, 410].includes(post.status)) continue;
      if (!post.ok) throw new Error(`Príprava autora: detail príspevku vrátil HTTP ${post.status}.`);
      const response = await fetch(`/api/auth/feed/posts/${postId}/comments/`, options);
      if ([403, 404, 410].includes(response.status)) continue;
      if (!response.ok) throw new Error(`Príprava autora: komentáre vrátili HTTP ${response.status}.`);
      const data = await response.json().catch(() => null);
      if (!data || !Array.isArray(data.results)) throw new Error('Príprava autora: neplatný zoznam komentárov.');
      for (const comment of data.results) {
        if (!Number.isSafeInteger(comment?.id) || comment.id <= 0) throw new Error('Príprava autora: neplatný komentár.');
        const author = comment.author;
        const slug = typeof author?.slug === 'string' ? author.slug.trim() : '';
        const identifier = slug || (Number.isSafeInteger(author?.id) && author.id > 0 ? String(author.id) : '');
        // UI prvého načítania má vrcholové komentáre; zbalené odpovede sa kvôli skúške neotvárajú.
        if (identifier && comment.parent_comment_id == null) return { index, commentId: comment.id, identifier };
      }
    }
    return null;
  }, targets);
}

/** Skutočný klik na meno v otvorenom detaile; do chyby sa nedostane adresa ani meno účtu. */
export async function openCommentAuthorProfileFromOverlay(page: Page, target: CommentAuthorTarget): Promise<void> {
  let phase = 'meno autora komentára';
  try {
    const overlay = page.getByTestId('feed-post-overlay');
    await expect(overlay).toBeVisible();
    const author = overlay.getByTestId(`feed-comment-author-${target.commentId}`);
    await expect(author).toBeVisible();
    await expect(author).toBeEnabled();
    await author.click();
    phase = 'zatvorenie detailu nad profilom';
    await expect(overlay, 'Po prekliku na autora komentára nesmie ostať otvorený detail príspevku.').toBeHidden();
    phase = 'adresa profilu';
    await expect.poll(() => {
      const segment = /^\/dashboard\/users\/([^/?#]+)\/?$/.exec(new URL(page.url()).pathname)?.[1];
      try { return Boolean(segment) && decodeURIComponent(segment!) === target.identifier; } catch { return false; }
    }, {
      message: 'Klik na autora komentára musí otvoriť profil.',
    }).toBe(true);
  } catch { throw new Error(`Preklik na autora komentára neprešiel; krok: ${phase}.`); }
}

/**
 * Cesty k detailu príspevku – jedno miesto pre okno aj pre celoobrazovkovú
 * stránku, nech sa tvar URL nerozíde.
 *
 * Notifikácie feedu (lajk, komentár, odpoveď, označenie, zdieľanie) posiela
 * backend ako `/dashboard/feed/<id>` s voliteľným `?comment=<id>`.
 */

export type FeedPostRouteTarget = {
  postId: number;
  highlightCommentId?: number | null;
};

const FEED_POST_PATH = /^\/dashboard\/feed\/(\d+)\/?$/;

export function buildFeedPostPath(
  postId: number,
  highlightCommentId?: number | null,
): string {
  const base = `/dashboard/feed/${postId}`;
  return highlightCommentId ? `${base}?comment=${highlightCommentId}` : base;
}

/** Vráti cieľ, ak URL vedie na detail príspevku; inak `null`. */
export function parseFeedPostTargetUrl(
  targetUrl: string,
): FeedPostRouteTarget | null {
  const [path, query = ''] = targetUrl.split('?');
  const match = path.match(FEED_POST_PATH);
  if (!match) return null;
  const postId = Number(match[1]);
  if (!Number.isSafeInteger(postId) || postId <= 0) return null;

  const rawComment = Number(new URLSearchParams(query).get('comment'));
  const highlightCommentId =
    Number.isSafeInteger(rawComment) && rawComment > 0 ? rawComment : null;
  return { postId, highlightCommentId };
}

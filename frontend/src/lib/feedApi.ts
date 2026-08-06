/**
 * Feed API klient (Nástenka).
 *
 * Backend stránkuje cursor-om (nie číslami strán), takže odpoveď nesie `next`
 * ako absolútnu URL. Pri donačítavaní ju posielame ďalej cez ten istý axios
 * klient – `toRelativeApiPath` z nej odreže base, aby request ostal
 * same-origin (1st-party cookie), rovnako ako pri ostatných volaniach.
 */

import { api, endpoints } from '@/lib/api';
import { getConfiguredApiUrl } from '@/lib/apiUrl';

export type FeedPostType =
  | 'free_post'
  | 'shared_offer'
  | 'shared_portfolio_item'
  | 'shared_feed_post';
export type FeedImageStatus = 'pending' | 'approved' | 'rejected' | '';

export type FeedUserSummary = {
  id: number;
  display_name: string;
  slug: string | null;
  user_type: string | null;
  avatar_url: string | null;
};

export type FeedPostImage = {
  thumbnail_url?: string | null;
  large_url?: string | null;
  width?: number | null;
  height?: number | null;
  /** Len pre autora príspevku (pending/rejected stavy spracovania). */
  status?: FeedImageStatus;
  rejected_reason?: string;
};

export type FeedSharedContent = {
  type: 'offer' | 'portfolio_item' | 'feed_post';
  title: string;
  category: string;
  /** Text zdieľaného voľného príspevku (ostatné typy majú prázdny). */
  caption: string;
  /** null keď je zdroj nedostupný – vtedy sa nedá preklikať. */
  id: number | null;
  owner: FeedUserSummary | null;
  owner_display_name: string;
  thumbnail_url: string | null;
  /** Len pre živú zdieľanú ponuku (kompaktný náhľad); inak null. */
  is_seeking: boolean | null;
  price_negotiable: boolean | null;
  price_from: string | null;
  price_currency: string;
};

export type FeedPost = {
  id: number;
  post_type: FeedPostType;
  caption: string;
  author: FeedUserSummary;
  image: FeedPostImage | null;
  shared_content: FeedSharedContent | null;
  shared_content_unavailable: boolean;
  tagged_users: FeedUserSummary[];
  likes_count: number;
  comments_count: number;
  is_liked_by_me: boolean;
  can_manage: boolean;
  created_at: string;
};

export type FeedPage = {
  results: FeedPost[];
  next: string | null;
  previous: string | null;
};

function normalizeBasePath(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Base path axios klienta `api` (napr. `/api`) – rovnaká logika ako protectedImageUrl. */
function apiBasePath(): string {
  const configured = getConfiguredApiUrl();
  if (!configured) return '/api';
  if (configured.startsWith('/')) return normalizeBasePath(configured);
  try {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return normalizeBasePath(new URL(configured, origin).pathname);
  } catch {
    return '/api';
  }
}

/**
 * Absolútnu `next` URL z DRF prerobí na cestu relatívnu voči baseURL klienta.
 * Keby sme ju poslali celú, request by šiel cross-origin a cookie by nemusela
 * ísť s ním. Ak URL nesedí s očakávaným base, vrátime ju bez zmeny.
 */
export function toRelativeApiPath(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return trimmed;

  let pathname: string;
  let search = '';
  try {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmed, origin);
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    return trimmed;
  }

  const base = apiBasePath();
  const relative =
    base && pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
  return `${relative}${search}`;
}

function normalizeFeedPage(data: unknown): FeedPage {
  const payload = (data ?? {}) as Partial<FeedPage>;
  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    next: typeof payload.next === 'string' ? payload.next : null,
    previous: typeof payload.previous === 'string' ? payload.previous : null,
  };
}

export type ListFeedPostsParams = {
  pageSize?: number;
  /** `next` URL z predchádzajúcej stránky; prebije pageSize (nesie si vlastné query). */
  cursorUrl?: string | null;
};

/**
 * Cesta pre daný request: pokračovanie cez `cursorUrl` má prednosť (nesie si
 * vlastné query vrátane page_size), inak sa page_size doplní na základnú URL.
 */
function resolveFeedRequestUrl(
  baseEndpoint: string,
  { pageSize, cursorUrl }: ListFeedPostsParams,
): string {
  if (cursorUrl) return toRelativeApiPath(cursorUrl);
  if (!pageSize) return baseEndpoint;
  return `${baseEndpoint}?page_size=${encodeURIComponent(String(pageSize))}`;
}

export async function listFeedPosts(
  params: ListFeedPostsParams = {},
): Promise<FeedPage> {
  const { data } = await api.get(resolveFeedRequestUrl(endpoints.feed.posts, params));
  return normalizeFeedPage(data);
}

// --- Interakcie (Fáza 4.2) -------------------------------------------------

export type FeedPostComment = {
  id: number;
  text: string;
  author: FeedUserSummary;
  can_delete: boolean;
  created_at: string;
};

export type FeedCommentPage = {
  results: FeedPostComment[];
  next: string | null;
  previous: string | null;
};

export type FeedLikePayload = {
  post_id: number;
  is_liked_by_me: boolean;
  likes_count: number;
};

/** Maximálna dĺžka komentára – zhodné s modelovým limitom na backende. */
export const FEED_COMMENT_MAX_LENGTH = 500;

export async function likeFeedPost(postId: number): Promise<FeedLikePayload> {
  const { data } = await api.post<FeedLikePayload>(endpoints.feed.postLike(postId));
  return data;
}

export async function unlikeFeedPost(postId: number): Promise<FeedLikePayload> {
  const { data } = await api.delete<FeedLikePayload>(endpoints.feed.postLike(postId));
  return data;
}

export async function listFeedPostComments(
  postId: number,
  params: { pageSize?: number; cursorUrl?: string | null } = {},
): Promise<FeedCommentPage> {
  const { data } = await api.get(
    resolveFeedRequestUrl(endpoints.feed.postComments(postId), params),
  );
  const payload = (data ?? {}) as Partial<FeedCommentPage>;
  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    next: typeof payload.next === 'string' ? payload.next : null,
    previous: typeof payload.previous === 'string' ? payload.previous : null,
  };
}

export async function createFeedPostComment(
  postId: number,
  text: string,
): Promise<FeedPostComment> {
  const { data } = await api.post<FeedPostComment>(
    endpoints.feed.postComments(postId),
    { text },
  );
  return data;
}

export async function deleteFeedPostComment(
  postId: number,
  commentId: number,
): Promise<void> {
  await api.delete(endpoints.feed.postCommentDetail(postId, commentId));
}

export async function reportFeedPost(
  postId: number,
  payload: { reason: string; description?: string },
): Promise<void> {
  await api.post(endpoints.feed.postReport(postId), {
    reason: payload.reason,
    description: payload.description?.trim() || undefined,
  });
}

/**
 * Zdieľanie príspevku ďalej.
 *
 * POZOR na názvy polí: vlastný sprievodný komentár ide do `caption` (je to
 * text NOVÉHO príspevku). `shared_post_caption` je snapshot textu PÔVODNÉHO
 * príspevku, ktorý si backend dopĺňa sám – klient ho neposiela.
 */
export async function shareFeedPost(
  postId: number,
  caption = '',
  taggedUserIds: number[] = [],
): Promise<FeedPost> {
  const { data } = await api.post<FeedPost>(endpoints.feed.posts, {
    post_type: 'shared_feed_post',
    shared_feed_post_id: postId,
    caption,
    tagged_user_ids: taggedUserIds,
  });
  return data;
}

/**
 * Jediné miesto, kde sa rozhoduje, či je ID príspevku použiteľné – routa aj
 * DashboardContent ho volajú, aby sa validácia nerozišla na troch miestach.
 */
export function parseFeedPostId(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

export async function getFeedPost(postId: number): Promise<FeedPost> {
  if (parseFeedPostId(postId) === null) {
    throw new Error('Invalid feed post id.');
  }
  const { data } = await api.get<FeedPost>(endpoints.feed.postDetail(postId));
  return data;
}

export async function listUserFeedPosts(
  userId: number,
  params: ListFeedPostsParams = {},
): Promise<FeedPage> {
  const { data } = await api.get(
    resolveFeedRequestUrl(endpoints.feed.userPosts(userId), params),
  );
  return normalizeFeedPage(data);
}

export async function listUserTaggedFeedPosts(
  userId: number,
  params: ListFeedPostsParams = {},
): Promise<FeedPage> {
  const { data } = await api.get(
    resolveFeedRequestUrl(endpoints.feed.userTaggedPosts(userId), params),
  );
  return normalizeFeedPage(data);
}

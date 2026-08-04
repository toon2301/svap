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

export type FeedPostType = 'free_post' | 'shared_offer' | 'shared_portfolio_item';
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
  type: 'offer' | 'portfolio_item';
  title: string;
  category: string;
  /** null keď je zdroj nedostupný – vtedy sa nedá preklikať. */
  id: number | null;
  owner: FeedUserSummary | null;
  owner_display_name: string;
  thumbnail_url: string | null;
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

export async function getFeedPost(postId: number): Promise<FeedPost> {
  if (!Number.isInteger(postId) || postId < 1) {
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

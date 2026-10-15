import type { User } from '@/types';

/** Shared test-only search fixtures; never imported by the production page. */
export const pageState: {
  params: URLSearchParams | null;
  user: User | null;
  global: Record<string, unknown>;
  offers: Record<string, unknown>;
} = {
  params: new URLSearchParams(), user: null, global: {}, offers: {},
};

export const router = { push: jest.fn(), replace: jest.fn() };
export const get = jest.fn();
export const post = jest.fn();
export const remove = jest.fn();
export const endpoints = {
  search: '/fixture/search/', searchGlobal: '/fixture/search/global/',
  skills: { like: (id: number) => `/fixture/skills/${id}/like/` },
};
export const apiModule = { api: { get, post, delete: remove }, endpoints };
export const navigationModule = {
  useRouter: () => router,
  useSearchParams: () => pageState.params,
  usePathname: () => '/search',
};
export const authModule = { useAuth: () => ({ user: pageState.user }) };

/** Synthetic API-shaped cards exercise the real mapper, responsive bridge, and card/detail components. */
export function rawOffer(id = 7, patch: Record<string, unknown> = {}) {
  return {
    id, category: 'Design', subcategory: 'Logo', description: `Result card ${id}`,
    detailed_description: `Result detail ${id}`, images: [], likes_count: 13,
    is_liked_by_me: false, is_seeking: false, user_id: 202,
    user_display_name: 'Fixture author', owner_slug: 'fixture-author', owner_user_type: 'individual',
    ...patch,
  };
}

export function rawUser(id = 202) {
  return { id, display_name: `Fixture user ${id}`, slug: `fixture-user-${id}`, user_type: 'individual' };
}

/** Change only query data, never replace the jsdom window/document objects. */
export function setQuery(query: string | null) {
  pageState.params = query === null ? null : new URLSearchParams(query);
  window.history.replaceState(null, '', query ? `/search?${query}` : '/search');
}

export function setViewport(mobile: boolean) {
  jest.spyOn(window, 'matchMedia').mockImplementation((media) => ({
    matches: media.includes('1023px') ? mobile : false, media, onchange: null,
    addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
  }));
}

/** Reset read-only fixtures and network spies independently for each page scenario. */
export function resetPage(query = 'q=logo', mobile = false) {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  document.body.style.overflow = '';
  setQuery(query);
  setViewport(mobile);
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  pageState.user = { id: 101, slug: 'self' } as User;
  pageState.global = {
    users: [rawUser()], offers: [rawOffer()], users_count: 1, offers_count: 1,
    users_total_pages: 1,
  };
  pageState.offers = { results: [rawOffer()], total: 1, page: 1, total_pages: 1 };
  get.mockImplementation(async (endpoint: string) => ({
    data: endpoint === endpoints.searchGlobal ? pageState.global : pageState.offers,
  }));
  post.mockResolvedValue({ data: { offer_id: 7, is_liked_by_me: true, likes_count: 14 } });
  remove.mockResolvedValue({ data: { offer_id: 7, is_liked_by_me: false, likes_count: 13 } });
}

export function lastQuery() {
  const [url, options] = router.replace.mock.calls.at(-1) ?? [];
  expect(options).toEqual({ scroll: false });
  return new URL(String(url), 'http://localhost').searchParams;
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((success, fail) => { resolve = success; reject = fail; });
  return { promise, resolve, reject };
}

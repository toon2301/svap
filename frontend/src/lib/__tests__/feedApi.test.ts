import {
  listFeedPosts,
  listUserFeedPosts,
  listUserTaggedFeedPosts,
  toRelativeApiPath,
} from '../feedApi';

const mockGet = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
  endpoints: {
    feed: {
      posts: '/auth/feed/posts/',
      postDetail: (id: number) => `/auth/feed/posts/${id}/`,
      userPosts: (userId: number) => `/auth/feed/users/${userId}/posts/`,
      userTaggedPosts: (userId: number) => `/auth/feed/users/${userId}/tagged/`,
    },
  },
}));

jest.mock('@/lib/apiUrl', () => ({
  getConfiguredApiUrl: () => '/api',
}));

const emptyPage = { data: { results: [], next: null, previous: null } };

describe('feedApi request URLs', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue(emptyPage);
  });

  describe('listFeedPosts', () => {
    it('uses the plain endpoint without params', async () => {
      await listFeedPosts();
      expect(mockGet).toHaveBeenCalledWith('/auth/feed/posts/');
    });

    it('encodes page_size on the first request', async () => {
      await listFeedPosts({ pageSize: 5 });
      expect(mockGet).toHaveBeenCalledWith('/auth/feed/posts/?page_size=5');
    });
  });

  describe('listUserFeedPosts', () => {
    it('applies page_size on the first request', async () => {
      await listUserFeedPosts(42, { pageSize: 7 });
      expect(mockGet).toHaveBeenCalledWith('/auth/feed/users/42/posts/?page_size=7');
    });

    it('lets cursorUrl win over pageSize', async () => {
      // Cursor URL si page_size nesie sám – druhýkrát ho pridať nesmieme.
      await listUserFeedPosts(42, {
        pageSize: 7,
        cursorUrl: 'http://localhost/api/auth/feed/users/42/posts/?cursor=abc&page_size=7',
      });
      expect(mockGet).toHaveBeenCalledWith(
        '/auth/feed/users/42/posts/?cursor=abc&page_size=7',
      );
    });
  });

  describe('listUserTaggedFeedPosts', () => {
    it('applies page_size on the first request', async () => {
      await listUserTaggedFeedPosts(9, { pageSize: 3 });
      expect(mockGet).toHaveBeenCalledWith('/auth/feed/users/9/tagged/?page_size=3');
    });

    it('lets cursorUrl win over pageSize', async () => {
      await listUserTaggedFeedPosts(9, {
        pageSize: 3,
        cursorUrl: 'http://localhost/api/auth/feed/users/9/tagged/?cursor=xyz',
      });
      expect(mockGet).toHaveBeenCalledWith('/auth/feed/users/9/tagged/?cursor=xyz');
    });
  });

  describe('toRelativeApiPath', () => {
    it('strips the api base so the request stays same-origin', () => {
      expect(
        toRelativeApiPath('http://localhost/api/auth/feed/posts/?cursor=abc'),
      ).toBe('/auth/feed/posts/?cursor=abc');
    });

    it('leaves unrelated urls untouched', () => {
      expect(toRelativeApiPath('/auth/feed/posts/')).toBe('/auth/feed/posts/');
    });
  });

  describe('response normalization', () => {
    it('falls back to an empty page for malformed payloads', async () => {
      mockGet.mockResolvedValue({ data: { results: 'nonsense', next: 5 } });
      await expect(listFeedPosts()).resolves.toEqual({
        results: [],
        next: null,
        previous: null,
      });
    });
  });
});

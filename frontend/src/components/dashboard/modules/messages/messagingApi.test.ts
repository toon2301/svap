'use client';

import { api } from '@/lib/api';
import { getMessagingErrorMessage, listConversations } from './messagingApi';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get: jest.fn(),
  },
}));

/**
 * Creates a manually controlled promise for exercising in-flight request behavior.
 *
 * @template T Value type resolved by the promise.
 * @returns An object containing the promise, resolve callback, and reject callback.
 * The shape is `{ promise: Promise<T>, resolve: (value: T) => void, reject: (error: unknown) => void }`.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe(
  'messagingApi listConversations',
  /**
   * Test suite callback for listConversations in-flight request behavior.
   */
  () => {
    beforeEach(
      /**
       * Test setup callback for resetting API mocks before each assertion.
       */
      () => {
        jest.clearAllMocks();
      },
    );

    it(
      'shares one in-flight request for duplicate conversation list calls',
      /**
       * Test callback for asserting duplicate normalized searches share one successful request.
       */
      async () => {
        const request = deferred<{
          data: Array<{
            id: number;
            other_user: { id: number; display_name: string };
          }>;
        }>();
        const response = [
          {
            id: 9,
            other_user: { id: 2, display_name: 'Tester' },
          },
        ];
        (api.get as jest.Mock).mockReturnValueOnce(request.promise);

        const first = listConversations({ search: '  Tester   Name ' });
        const second = listConversations({ search: 'Tester Name' });

        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith('/auth/messaging/conversations/', {
          params: { search: 'Tester Name' },
        });

        request.resolve({ data: response });

        await expect(first).resolves.toEqual(response);
        await expect(second).resolves.toEqual(response);
      },
    );

    it(
      'shares one in-flight rejection for duplicate conversation list calls',
      /**
       * Test callback for asserting duplicate normalized searches share one rejected request.
       */
      async () => {
        const request = deferred<{ data: [] }>();
        const error = new Error('Conversation list failed');
        (api.get as jest.Mock).mockReturnValueOnce(request.promise);

        const first = listConversations({ search: 'Tester' });
        const second = listConversations({ search: '  Tester ' });

        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith('/auth/messaging/conversations/', {
          params: { search: 'Tester' },
        });

        request.reject(error);

        await expect(Promise.allSettled([first, second])).resolves.toEqual([
          { status: 'rejected', reason: error },
          { status: 'rejected', reason: error },
        ]);
      },
    );

    it(
      'starts a new request after the previous conversation list call finishes',
      /**
       * Test callback for asserting completed requests are removed from the in-flight cache.
       */
      async () => {
        (api.get as jest.Mock)
          .mockResolvedValueOnce({ data: [] })
          .mockResolvedValueOnce({ data: [] });

        await listConversations();
        await listConversations();

        expect(api.get).toHaveBeenCalledTimes(2);
      },
    );

    it(
      'does not share empty conversation search with a literal sentinel-like search value',
      /**
       * Test callback for asserting empty search and sentinel-like search use distinct keys.
       */
      async () => {
        const emptySearchRequest = deferred<{ data: [] }>();
        const sentinelSearchRequest = deferred<{ data: [] }>();
        (api.get as jest.Mock)
          .mockReturnValueOnce(emptySearchRequest.promise)
          .mockReturnValueOnce(sentinelSearchRequest.promise);

        const emptySearch = listConversations();
        const sentinelSearch = listConversations({ search: '__all__' });

        expect(api.get).toHaveBeenCalledTimes(2);
        expect(api.get).toHaveBeenNthCalledWith(1, '/auth/messaging/conversations/', undefined);
        expect(api.get).toHaveBeenNthCalledWith(2, '/auth/messaging/conversations/', {
          params: { search: '__all__' },
        });

        emptySearchRequest.resolve({ data: [] });
        sentinelSearchRequest.resolve({ data: [] });

        await expect(emptySearch).resolves.toEqual([]);
        await expect(sentinelSearch).resolves.toEqual([]);
      },
    );
  },
);

describe('getMessagingErrorMessage recipient_unavailable', () => {
  const blockedError = (status: number) => ({
    response: { status, data: { code: 'recipient_unavailable' } },
  });

  it('maps the recipient_unavailable code to its dedicated message (404 and 403)', () => {
    for (const status of [404, 403]) {
      expect(
        getMessagingErrorMessage(blockedError(status), {
          fallback: 'generic',
          unavailableFallback: 'conversation gone',
          recipientUnavailableFallback: 'cannot message user',
        }),
      ).toBe('cannot message user');
    }
  });

  it('falls back to unavailableFallback, then fallback, when the dedicated message is absent', () => {
    expect(
      getMessagingErrorMessage(blockedError(404), {
        fallback: 'generic',
        unavailableFallback: 'conversation gone',
      }),
    ).toBe('conversation gone');
    expect(
      getMessagingErrorMessage(blockedError(404), { fallback: 'generic' }),
    ).toBe('generic');
  });
});

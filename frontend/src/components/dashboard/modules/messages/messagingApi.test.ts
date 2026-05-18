'use client';

import { api } from '@/lib/api';
import { listConversations } from './messagingApi';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get: jest.fn(),
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('messagingApi listConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shares one in-flight request for duplicate conversation list calls', async () => {
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
  });

  it('starts a new request after the previous conversation list call finishes', async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    await listConversations();
    await listConversations();

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('does not share empty conversation search with a literal sentinel-like search value', async () => {
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
  });
});

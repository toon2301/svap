import { api, endpoints } from '@/lib/api';
import { fetchBlockedUsers, unblockUser } from './userBlocksApi';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
  endpoints: {
    users: {
      blocked: '/auth/users/blocked/',
      block: (userId: number) => '/auth/users/' + userId + '/block/',
    },
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('userBlocksApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads a fixed endpoint and extracts only the server cursor', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        next: 'https://api.example.test/auth/users/blocked/?cursor=next-token',
        previous: null,
        results: [{ id: 7, username: 'tester', display_name: 'Tester', avatar_url: null, is_available: true }],
      },
    });

    const page = await fetchBlockedUsers();

    expect(mockedApi.get).toHaveBeenCalledWith(endpoints.users.blocked, {
      params: undefined,
    });
    expect(page.nextCursor).toBe('next-token');
    expect(page.results[0]?.id).toBe(7);
  });

  it('sends the cursor as a parameter and deletes only a valid target id', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { next: null, previous: null, results: [] },
    });
    mockedApi.delete.mockResolvedValueOnce({
      data: { user_id: 9, is_blocked: false, deleted: true },
    });

    await fetchBlockedUsers('cursor-token');
    await unblockUser(9);

    expect(mockedApi.get).toHaveBeenCalledWith(endpoints.users.blocked, {
      params: { cursor: 'cursor-token' },
    });
    expect(mockedApi.delete).toHaveBeenCalledWith(endpoints.users.block(9));
    await expect(unblockUser(0)).rejects.toThrow(TypeError);
  });
});

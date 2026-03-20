jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get: jest.fn(),
  },
  endpoints: {
    auth: {
      me: '/auth/me/',
    },
  },
}));

import { api } from '@/lib/api';
import {
  clearAuthState,
  isAuthenticated,
} from '../auth';

describe('utils/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clearAuthState je no-op (žiadne cookie nastavovanie)', () => {
    expect(() => clearAuthState()).not.toThrow();
  });

  it('isAuthenticated vracia true pri 200 z /api/auth/me/', async () => {
    (api.get as jest.Mock).mockResolvedValue({ status: 200 });
    await expect(isAuthenticated()).resolves.toBe(true);
    expect(api.get).toHaveBeenCalledWith(
      '/auth/me/',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    );
  });

  it('isAuthenticated vracia false pri 401 z /api/auth/me/', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 401 } });
    await expect(isAuthenticated()).resolves.toBe(false);
  });

  // getAuthHeader / access/refresh token helpers boli odstránené (cookie-only model)
});



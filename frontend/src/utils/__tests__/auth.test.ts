import {
  clearAuthState,
  isAuthenticated,
} from '../auth';

describe('utils/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error - test mock
    global.fetch = jest.fn();
  });

  it('clearAuthState je no-op (žiadne cookie nastavovanie)', () => {
    expect(() => clearAuthState()).not.toThrow();
  });

  it('isAuthenticated vracia true pri 200 z /api/auth/me/', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    await expect(isAuthenticated()).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/me/',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('isAuthenticated vracia false pri 401 z /api/auth/me/', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(isAuthenticated()).resolves.toBe(false);
  });

  // getAuthHeader / access/refresh token helpers boli odstránené (cookie-only model)
});



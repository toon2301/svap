import {
  clearAuthState,
  isAuthenticated,
  setAuthStateCookie,
  AUTH_STATE_COOKIE,
} from '../auth';
import Cookies from 'js-cookie';

jest.mock('js-cookie', () => ({
  __esModule: true,
  default: {
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('utils/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clearAuthState odstráni auth_state', () => {
    clearAuthState();
    expect((Cookies as any).remove).toHaveBeenCalledWith(AUTH_STATE_COOKIE, { path: '/' });
  });

  it('setAuthStateCookie nastaví auth_state na aktuálnej origin', () => {
    setAuthStateCookie();
    expect((Cookies as any).set).toHaveBeenCalledWith(
      AUTH_STATE_COOKIE,
      '1',
      expect.objectContaining({ path: '/', sameSite: 'strict' })
    );
  });

  it('isAuthenticated vracia true ak existuje auth_state', () => {
    (Cookies.get as jest.Mock).mockImplementation((name: string) => {
      if (name === AUTH_STATE_COOKIE) return '1';
      return undefined;
    });
    expect(isAuthenticated()).toBe(true);
  });

  // getAuthHeader / access/refresh token helpers boli odstránené (cookie-only model)
});



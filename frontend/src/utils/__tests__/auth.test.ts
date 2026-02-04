import {
  setAuthTokens,
  getAccessToken,
  getRefreshToken,
  clearAuthTokens,
  isAuthenticated,
  getAuthHeader,
  setAuthStateCookie,
  AUTH_COOKIE_NAMES,
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

  it('setAuthTokens ukladá access a refresh token s korektnými voľbami', () => {
    setAuthTokens({ access: 'a1', refresh: 'r1' });

    expect((Cookies as any).set).toHaveBeenCalledWith(
      AUTH_COOKIE_NAMES.ACCESS_TOKEN,
      'a1',
      expect.objectContaining({ sameSite: 'strict' })
    );
    expect((Cookies as any).set).toHaveBeenCalledWith(
      AUTH_COOKIE_NAMES.REFRESH_TOKEN,
      'r1',
      expect.objectContaining({ sameSite: 'strict' })
    );
  });

  it('getAccessToken/getRefreshToken vrátia hodnoty z cookies', () => {
    (Cookies.get as jest.Mock).mockImplementation((name: string) => {
      if (name === AUTH_COOKIE_NAMES.ACCESS_TOKEN) return 'a2';
      if (name === AUTH_COOKIE_NAMES.REFRESH_TOKEN) return 'r2';
      return undefined;
    });

    expect(getAccessToken()).toBe('a2');
    expect(getRefreshToken()).toBe('r2');
  });

  it('clearAuthTokens odstráni tokeny a auth_state', () => {
    clearAuthTokens();
    expect((Cookies as any).remove).toHaveBeenCalledWith(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
    expect((Cookies as any).remove).toHaveBeenCalledWith(AUTH_COOKIE_NAMES.REFRESH_TOKEN);
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

  it('getAuthHeader vracia Bearer hlavičku keď je token', () => {
    (Cookies.get as jest.Mock).mockReturnValueOnce('a4');
    expect(getAuthHeader()).toBe('Bearer a4');
  });

  it('getAuthHeader vracia undefined keď nie je token', () => {
    (Cookies.get as jest.Mock).mockReturnValueOnce(undefined);
    expect(getAuthHeader()).toBeUndefined();
  });
});



import Cookies from 'js-cookie';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export const setAuthTokens = (tokens: AuthTokens): void => {
  Cookies.set(AUTH_COOKIE_NAMES.ACCESS_TOKEN, tokens.access, {
    expires: 1, // 1 day
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  
  Cookies.set(AUTH_COOKIE_NAMES.REFRESH_TOKEN, tokens.refresh, {
    expires: 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

export const getAccessToken = (): string | undefined => {
  return Cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
};

export const getRefreshToken = (): string | undefined => {
  return Cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN);
};

/** Cookie name pre stav prihlásenia (číta sa na frontende pri cross-origin) */
export const AUTH_STATE_COOKIE = 'auth_state';

/**
 * Nastaví na aktuálnej origin cookie auth_state=1, aby isAuthenticated() vrátil true.
 * Potrebné pri cross-origin (API na inej doméne): backend nastaví cookie len pre svoju doménu.
 */
export const setAuthStateCookie = (): void => {
  Cookies.set(AUTH_STATE_COOKIE, '1', {
    path: '/',
    expires: 7, // 7 dní (rovnaký formát ako setAuthTokens)
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
};

export const clearAuthTokens = (): void => {
  Cookies.remove(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
  Cookies.remove(AUTH_COOKIE_NAMES.REFRESH_TOKEN);
  Cookies.remove(AUTH_STATE_COOKIE, { path: '/' });

  // Vymaž aj z localStorage
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('refresh_token');
      window.localStorage.removeItem('oauth_success');
    } catch {}
  }
};

export const isAuthenticated = (): boolean => {
  // Skontroluj stavový cookie (backend ho nastaví pre svoju doménu; pri cross-origin ho nastavuje frontend po prihlásení)
  const state = Cookies.get(AUTH_STATE_COOKIE);
  if (state === '1') return true;
  
  // Fallback na localStorage (pre OAuth)
  if (typeof window !== 'undefined') {
    try {
      const localToken = window.localStorage.getItem('access_token');
      return !!localToken;
    } catch {}
  }
  return false;
};

export const getAuthHeader = (): string | undefined => {
  // Skontroluj cookies (primárne)
  const cookieToken = getAccessToken();
  if (cookieToken) return `Bearer ${cookieToken}`;
  
  // Fallback na localStorage (pre OAuth)
  if (typeof window !== 'undefined') {
    try {
      const localToken = window.localStorage.getItem('access_token');
      return localToken ? `Bearer ${localToken}` : undefined;
    } catch {}
  }
  return undefined;
};

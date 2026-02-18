import Cookies from 'js-cookie';

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

export const clearAuthState = (): void => {
  Cookies.remove(AUTH_STATE_COOKIE, { path: '/' });
};

export const isAuthenticated = (): boolean => {
  // Skontroluj stavový cookie (backend ho nastaví pre svoju doménu; pri cross-origin ho nastavuje frontend po prihlásení)
  const state = Cookies.get(AUTH_STATE_COOKIE);
  if (state === '1') return true;
  return false;
};

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

export const clearAuthTokens = (): void => {
  Cookies.remove(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
  Cookies.remove(AUTH_COOKIE_NAMES.REFRESH_TOKEN);
  
  // Vymaž aj z localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('oauth_success');
};

export const isAuthenticated = (): boolean => {
  // Skontroluj cookies (primárne)
  const cookieToken = getAccessToken();
  if (cookieToken) return true;
  
  // Fallback na localStorage (pre OAuth)
  const localToken = localStorage.getItem('access_token');
  return !!localToken;
};

export const getAuthHeader = (): string | undefined => {
  // Skontroluj cookies (primárne)
  const cookieToken = getAccessToken();
  if (cookieToken) return `Bearer ${cookieToken}`;
  
  // Fallback na localStorage (pre OAuth)
  const localToken = localStorage.getItem('access_token');
  return localToken ? `Bearer ${localToken}` : undefined;
};

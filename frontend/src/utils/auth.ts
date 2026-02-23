/**
 * Frontend nesmie manuálne nastavovať cookie `auth_state`.
 * Autentifikačný stav sa overuje iba cez úspešné volanie `/api/auth/me/`
 * (HttpOnly cookies sa posielajú automaticky, ale nie sú čitateľné cez JS).
 */

export const clearAuthState = (): void => {
  // Žiadne cookie manipulácie (HttpOnly cookie aj tak nemožno meniť cez JS).
  // Nechávame tu len ako no-op helper pre existujúce call sites.
};

export const isAuthenticated = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/auth/me/', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
};

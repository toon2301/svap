/**
 * CSRF token utility funkcie
 * Získavanie a správa CSRF tokenu pre Django backend
 */
import axios from 'axios';
import Cookies from 'js-cookie';

// API URL - použijeme rovnakú logiku ako v api.ts
const getApiUrl = () => {
  const explicitApi = process.env.NEXT_PUBLIC_API_URL;
  const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

  // Explicitná API URL má vždy prednosť:
  // - absolútna https://.../api (priame volanie)
  // - relatívna /api (same-origin cez proxy/rewrites)
  if (explicitApi) return explicitApi;

  if (backendOrigin) return `${backendOrigin}/api`;

  // Optional runtime override cez sessionStorage (len dev)
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    try {
      const saved = window.sessionStorage.getItem('API_BASE_URL');
      if (saved && /^https?:\/\//.test(saved)) {
        return saved.replace(/\/$/, '')
      }
    } catch {}
  }
  return 'http://localhost:8000/api';
};

/** Pri cross-origin (frontend ≠ backend) cookie csrftoken nie je čitateľná – držíme token z response body. */
let csrfTokenFromResponse: string | null = null;

/**
 * Získa CSRF token z Django backendu.
 * Pri same-origin Django nastaví cookie; pri cross-origin ukladáme token z response body,
 * lebo cookie pre inú doménu nie je v JS čitateľná.
 */
export const fetchCsrfToken = async (): Promise<void> => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.get<{ csrf_token?: string }>(`${apiUrl}/auth/csrf-token/`, {
      withCredentials: true,
    });
    const token = res?.data?.csrf_token;
    if (token) csrfTokenFromResponse = token;
  } catch (error) {
    console.error('Chyba pri získavaní CSRF tokenu:', error);
  }
};

/**
 * Kontrola či máme CSRF token (z cookies alebo z response body pri cross-origin)
 */
export const hasCsrfToken = (): boolean => {
  return !!(csrfTokenFromResponse || Cookies.get('csrftoken'));
};

/**
 * Získa CSRF token – pri cross-origin z response body, inak z cookies
 */
export const getCsrfToken = (): string | undefined => {
  return csrfTokenFromResponse ?? Cookies.get('csrftoken') ?? undefined;
};


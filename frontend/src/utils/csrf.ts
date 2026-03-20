/**
 * CSRF token utility funkcie
 * Získavanie a správa CSRF tokenu pre Django backend
 */
import axios from 'axios';
import Cookies from 'js-cookie';
import { buildApiUrl } from '@/lib/apiUrl';

/** Pri cross-origin (frontend ≠ backend) cookie csrftoken nie je čitateľná – držíme token z response body. */
let csrfTokenFromResponse: string | null = null;

/**
 * Získa CSRF token z Django backendu.
 * Pri same-origin Django nastaví cookie; pri cross-origin ukladáme token z response body,
 * lebo cookie pre inú doménu nie je v JS čitateľná.
 */
export const fetchCsrfToken = async (): Promise<void> => {
  try {
    const res = await axios.get<{ csrf_token?: string }>(buildApiUrl('/auth/csrf-token/'), {
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


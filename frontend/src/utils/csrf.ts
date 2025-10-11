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

  if (explicitApi && /^https?:\/\//.test(explicitApi)) {
    return explicitApi;
  }

  if (backendOrigin) {
    return `${backendOrigin}/api`;
  }

  if (explicitApi) {
    return explicitApi;
  }

  // Optional runtime override cez sessionStorage (len dev)
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    try {
      const saved = window.sessionStorage.getItem('API_BASE_URL');
      if (saved && /^https?:\/\//.test(saved)) {
        return `${saved}/auth`.replace(/\/$/, '') // will be used below anyway
      }
    } catch {}
  }
  return 'http://localhost:8000/api';
};

/**
 * Získa CSRF token z Django backendu
 * Django automaticky nastaví csrftoken cookie pri prvom volaní
 */
export const fetchCsrfToken = async (): Promise<void> => {
  try {
    const apiUrl = getApiUrl();
    await axios.get(`${apiUrl}/auth/csrf-token/`, {
      withCredentials: true, // Dôležité pre prijímanie cookies
    });
    // CSRF token je teraz uložený v cookies automaticky Django backendom
  } catch (error) {
    console.error('Chyba pri získavaní CSRF tokenu:', error);
  }
};

/**
 * Kontrola či CSRF token existuje v cookies
 */
export const hasCsrfToken = (): boolean => {
  return !!Cookies.get('csrftoken');
};

/**
 * Získa CSRF token z cookies
 */
export const getCsrfToken = (): string | undefined => {
  return Cookies.get('csrftoken');
};


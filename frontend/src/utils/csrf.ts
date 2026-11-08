/**
 * CSRF token utility funkcie
 * Získavanie a správa CSRF tokenu pre Django backend
 */
import axios from 'axios';
import Cookies from 'js-cookie';
import { buildApiUrl, getConfiguredApiUrl } from '@/lib/apiUrl';
import { logClientError } from '@/utils/clientLogging';

/**
 * Najdlhšie čakanie na načítanie CSRF tokenu (ms). Holý `axios` nemá žiadny limit, takže visiaci request by dlho držal
 * napr. obnovu prihlásenia (nález 245). Limit je kratší než 30 s inštancie `api` a dosť dlhý pre pomalú mobilnú sieť.
 */
const CSRF_FETCH_TIMEOUT_MS = 15_000;

/** Pri cross-origin (frontend ≠ backend) cookie csrftoken nie je čitateľná – držíme token z response body. */
let csrfTokenFromResponse: string | null = null;

/**
 * Podarilo sa v tejto relácii aspoň raz prečítať cookie `csrftoken`? Ak nie (HttpOnly alebo blokovaná cookie), cookie nie
 * je zdrojom pravdy a ostáva token z response body.
 */
let cookieWasReadable = false;

/**
 * Je API na rovnakom pôvode ako stránka (relatívna adresa `/api` cez rewrite frontendu alebo rovnaký origin)? Vtedy
 * je cookie `csrftoken` čitateľná a prehliadač pošle práve ju.
 */
const isSameOriginApi = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(getConfiguredApiUrl(), window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
};

/** Prečíta cookie `csrftoken` a zapamätá si, že je čitateľná. */
const readCsrfCookie = (): string | undefined => {
  const value = Cookies.get('csrftoken') || undefined;
  if (value) cookieWasReadable = true;
  return value;
};

/**
 * Získa CSRF token z Django backendu.
 * Pri same-origin Django nastaví cookie; pri cross-origin ukladáme token z response body,
 * lebo cookie pre inú doménu nie je v JS čitateľná. Požiadavka má časový limit, chyba sa zaloguje a pohltí.
 */
export const fetchCsrfToken = async (): Promise<void> => {
  try {
    const res = await axios.get<{ csrf_token?: string }>(buildApiUrl('/auth/csrf-token/'), {
      withCredentials: true,
      timeout: CSRF_FETCH_TIMEOUT_MS,
    });
    const token = res?.data?.csrf_token;
    if (token) csrfTokenFromResponse = token;
    readCsrfCookie();
  } catch (error) {
    logClientError('CSRF token fetch failed', error);
  }
};

/**
 * Získa CSRF token. Pri same-origin je zdrojom pravdy cookie, lebo server porovnáva hlavičku práve s ňou: ak bola v tejto
 * relácii čitateľná a zmizla (napr. `Clear-Site-Data: "cookies"` pri odhlásení), vráti `undefined` a volajúci načíta
 * token znova (nález 245). Pri cross-origin alebo ak cookie nikdy nebola čitateľná sa berie token z response body,
 * inak z cookie.
 */
export const getCsrfToken = (): string | undefined => {
  // Čítanie cookie si zároveň zapamätá, že je čitateľná, takže `cookieWasReadable` platí aj pre práve prečítanú hodnotu.
  const cookie = readCsrfCookie();
  if (isSameOriginApi() && cookieWasReadable) {
    return cookie;
  }
  return csrfTokenFromResponse ?? cookie;
};

/**
 * Kontrola či máme použiteľný CSRF token (rovnaké pravidlá ako `getCsrfToken`)
 */
export const hasCsrfToken = (): boolean => {
  return !!getCsrfToken();
};

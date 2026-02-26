import axios from 'axios';
import { clearAuthState } from '@/utils/auth';
import { fetchCsrfToken, getCsrfToken } from '@/utils/csrf';

// ============================================================
// Cookie-only refresh control (HttpOnly cookies, no JS access)
// ============================================================
// Global refresh lock: only one refresh request at a time
let refreshInFlight: Promise<boolean> | null = null;
// Circuit breaker: after 429 cooldown or 401 disable until reload
let refreshDisabledUntil: number | null = null;
// Flag (best-effort): refresh makes sense only after we had a valid session at least once
let mayHaveRefreshCookie = false;
// Hard stop: after refresh 401 or explicit logout, never attempt refresh again until reload/login
let sessionInvalid = false;
// Avoid redirect storms after invalidation
let redirectedAfterInvalidation = false;
// Allow aborting refresh in-flight (e.g. logout)
let refreshAbortController: AbortController | null = null;

export function setMayHaveRefreshCookie(value: boolean): void {
  mayHaveRefreshCookie = value;
  if (value) {
    sessionInvalid = false;
    redirectedAfterInvalidation = false;
  }
}

/** Call on explicit logout to prevent any refresh attempts. */
export function invalidateSession(): void {
  sessionInvalid = true;
  refreshDisabledUntil = Number.MAX_SAFE_INTEGER;
  mayHaveRefreshCookie = false;
  redirectedAfterInvalidation = false;
  try {
    refreshAbortController?.abort();
  } catch {
    // ignore
  }
  refreshAbortController = null;
  refreshInFlight = null;
}

function shouldSkipRefresh(url?: string): boolean {
  const u = String(url || '');
  // Never attempt refresh for these endpoints
  return (
    u.includes('/token/refresh/') ||
    u.includes('/auth/login/') ||
    u.includes('/auth/logout/') ||
    u.includes('/auth/csrf-token/') ||
    u.includes('/oauth/')
  );
}

function dispatchSessionInvalid(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:session-invalid'));
  }
}

function markSessionInvalid(): void {
  if (sessionInvalid) return;
  sessionInvalid = true;
  refreshDisabledUntil = Number.MAX_SAFE_INTEGER;
  mayHaveRefreshCookie = false;
  refreshInFlight = null;
  try {
    refreshAbortController?.abort();
  } catch {
    // ignore
  }
  refreshAbortController = null;
  if (typeof window !== 'undefined') {
    clearAuthState();
    dispatchSessionInvalid();
  }
}

async function ensureRefreshed(): Promise<boolean> {
  if (sessionInvalid) return false;
  const now = Date.now();
  if (refreshDisabledUntil && now < refreshDisabledUntil) return false;
  if (!mayHaveRefreshCookie) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      // Ensure CSRF token exists (refresh endpoint enforces CSRF)
      if (!getCsrfToken()) {
        await fetchCsrfToken();
      }
      const csrfToken = getCsrfToken();
      const controller = new AbortController();
      refreshAbortController = controller;

      await axios.post(
        `${API_URL}/token/refresh/`,
        {},
        {
          withCredentials: true,
          headers: csrfToken ? { 'X-CSRFToken': csrfToken } : undefined,
          signal: controller.signal,
        }
      );

      mayHaveRefreshCookie = true;
      return true;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 429) {
        // Cooldown 60s on rate-limit
        refreshDisabledUntil = Date.now() + 60_000;
      } else if (status === 401) {
        // Hard stop: refresh token invalid (expired/logged out)
        markSessionInvalid();
      }
      return false;
    } finally {
      refreshInFlight = null;
      refreshAbortController = null;
    }
  })();

  return refreshInFlight;
}

// API URL konfigurácia - používa environment premenné
const getApiUrl = () => {
  const explicitApi = process.env.NEXT_PUBLIC_API_URL;
  const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

  // Explicitná API URL má vždy prednosť.
  // - Absolútna: https://... (priame volanie)
  // - Relatívna: /api (same-origin cez proxy/rewrites)
  if (explicitApi) return explicitApi;

  // Ak nie je explicitná, použi BACKEND_ORIGIN (oddelený backend)
  if (backendOrigin) return `${backendOrigin}/api`;

  // Fallback pre development
  return 'http://localhost:8000/api';
};

const API_URL = getApiUrl();
let RUNTIME_API_URL = API_URL;
// Allow dev-time runtime override based on sessionStorage
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    const saved = window.sessionStorage.getItem('API_BASE_URL');
    if (saved && /^https?:\/\//.test(saved)) {
      RUNTIME_API_URL = saved;
    }
  } catch {}
}

// Create axios instance
export const api = axios.create({
  baseURL: RUNTIME_API_URL,
  // Nešpecifikuj globálny Content-Type; nech Axios vyberie podľa typu dát
  timeout: 30000, // 30 sekúnd timeout pre mobile
  withCredentials: true, // Povoliť posielanie cookies pre CSRF
});

// ============================================
// DEBUGGING: API Request Tracking (dev only)
// ============================================
// Pomôže identifikovať, ktoré endpointy sa volajú príliš často
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const apiDebugStats = {
    requests: new Map<string, Array<{ time: number; method: string; url: string; status?: number }>>(),
    startTime: Date.now(),
  };

  // Uložiť štatistiky do window pre prístup z konzoly
  (window as any).__API_DEBUG_STATS__ = apiDebugStats;

  // Funkcia na výpis štatistík (volateľná z konzoly: window.__API_DEBUG__.print())
  (window as any).__API_DEBUG__ = {
    print: () => {
      const now = Date.now();
      const elapsed = now - apiDebugStats.startTime;
      console.group('🔍 API Request Statistics');
      console.log(`Total time: ${(elapsed / 1000).toFixed(2)}s`);
      
      apiDebugStats.requests.forEach((calls, endpoint) => {
        const callsInLastMinute = calls.filter(c => now - c.time < 60000).length;
        const callsInLast10Seconds = calls.filter(c => now - c.time < 10000).length;
        const errors = calls.filter(c => c.status && c.status >= 400).length;
        const rateLimited = calls.filter(c => c.status === 429).length;
        
        console.group(`📍 ${endpoint}`);
        console.log(`Total calls: ${calls.length}`);
        console.log(`Calls in last 10s: ${callsInLast10Seconds}`);
        console.log(`Calls in last 60s: ${callsInLastMinute}`);
        console.log(`Errors: ${errors} (429 rate-limited: ${rateLimited})`);
        if (calls.length > 0) {
          console.log(`Last call: ${((now - calls[calls.length - 1].time) / 1000).toFixed(2)}s ago`);
          // Zobraziť posledných 5 volaní
          const recent = calls.slice(-5).reverse();
          console.table(recent.map(c => ({
            time: new Date(c.time).toLocaleTimeString(),
            method: c.method,
            status: c.status || 'pending',
            ago: `${((now - c.time) / 1000).toFixed(2)}s`,
          })));
        }
        console.groupEnd();
      });
      console.groupEnd();
    },
    clear: () => {
      apiDebugStats.requests.clear();
      apiDebugStats.startTime = Date.now();
      console.log('✅ API debug stats cleared');
    },
    getStats: () => apiDebugStats,
  };

  // eslint-disable-next-line no-console
  console.log('🔍 API Debug enabled! Use window.__API_DEBUG__.print() in console to see statistics');
}

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  (config) => {
    // DEBUGGING: Track request
    if (typeof window !== 'undefined' && (window as any).__API_DEBUG_STATS__) {
      const stats = (window as any).__API_DEBUG_STATS__;
      const url = config.url || '';
      const fullUrl = config.baseURL ? `${config.baseURL}${url}` : url;
      const method = (config.method || 'GET').toUpperCase();
      
      // Extract endpoint pattern (remove IDs for grouping)
      const endpoint = url.replace(/\/\d+\//g, '/:id/').replace(/\/\d+$/, '/:id');
      const key = `${method} ${endpoint}`;
      
      if (!stats.requests.has(key)) {
        stats.requests.set(key, []);
      }
      
      const requestInfo = {
        time: Date.now(),
        method,
        url: fullUrl,
      };
      
      stats.requests.get(key)!.push(requestInfo);
      
      // Attach to config for response interceptor
      (config as any).__debugRequestInfo = requestInfo;
      (config as any).__debugKey = key;
    }

    // Ak posielame FormData (upload súboru), odstráň Content-Type, aby Axios pridal multipart boundary
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData) {
      if (config.headers) {
        // Normalize to plain object to manipulate header keys
        const headers: Record<string, any> = (config.headers as any);
        delete headers['Content-Type'];
        delete headers['content-type'];
      }
    } else {
      // Pre JSON požiadavky nastav Content-Type len ak nie je nastavený
      if (config.headers) {
        const headers: Record<string, any> = (config.headers as any);
        if (!('Content-Type' in headers) && !('content-type' in headers)) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    // Pridaj CSRF token pre POST/PUT/PATCH/DELETE requesty
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    // DEBUGGING: Update request info with status
    if (typeof window !== 'undefined' && response.config && (response.config as any).__debugRequestInfo) {
      const stats = (window as any).__API_DEBUG_STATS__;
      const key = (response.config as any).__debugKey;
      if (stats && key && stats.requests.has(key)) {
        const calls = stats.requests.get(key)!;
        const requestInfo = (response.config as any).__debugRequestInfo;
        const index = calls.findIndex((c: any) => c === requestInfo);
        if (index !== -1) {
          calls[index].status = response.status;
        }
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // DEBUGGING: Update request info with error status
    if (typeof window !== 'undefined' && originalRequest && (originalRequest as any).__debugRequestInfo) {
      const stats = (window as any).__API_DEBUG_STATS__;
      const key = (originalRequest as any).__debugKey;
      if (stats && key && stats.requests.has(key)) {
        const calls = stats.requests.get(key)!;
        const requestInfo = (originalRequest as any).__debugRequestInfo;
        const index = calls.findIndex((c: any) => c === requestInfo);
        if (index !== -1) {
          calls[index].status = error.response?.status || 0;
        }
      }
      
      // Auto-log 429 errors
      if (error.response?.status === 429) {
        console.warn('🚨 429 Rate Limit Hit!', {
          endpoint: key,
          url: error.config?.url,
          method: error.config?.method,
        });
        // Auto-print stats when 429 occurs
        setTimeout(() => {
          if ((window as any).__API_DEBUG__) {
            (window as any).__API_DEBUG__.print();
          }
        }, 100);
      }
    }

    const status = error.response?.status;
    const url = originalRequest?.url;

    if (status === 401) {
      // If we already know the session is invalid, never refresh again.
      // Just reject deterministically (and signal AuthContext once).
      if (sessionInvalid) {
        if (typeof window !== 'undefined' && !redirectedAfterInvalidation) {
          redirectedAfterInvalidation = true;
          clearAuthState();
          dispatchSessionInvalid();
        }
        return Promise.reject(error);
      }

      // Guard: no config -> nothing to retry
      if (!originalRequest) return Promise.reject(error);

      // Never retry the same request more than once
      if ((originalRequest as any)._retry === true) {
        return Promise.reject(error);
      }

      // Never attempt refresh for login/logout/refresh/csrf/oauth endpoints
      if (shouldSkipRefresh(url)) {
        return Promise.reject(error);
      }

      // Try refresh exactly once per original request
      (originalRequest as any)._retry = true;
      const refreshed = await ensureRefreshed();

      if (refreshed) {
        return api(originalRequest);
      }

      // Refresh failed -> hard stop. Subsequent 401 will not try refresh again.
      markSessionInvalid();
      if (typeof window !== 'undefined' && !redirectedAfterInvalidation) {
        redirectedAfterInvalidation = true;
        // No hard reload here; AuthContext will handle navigation (router.replace)
        dispatchSessionInvalid();
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login/',
    register: '/auth/register/',
    refresh: '/token/refresh/',
    logout: '/auth/logout/',
    me: '/auth/me/',
    verifyEmail: '/auth/verify-email/',
    resendVerification: '/auth/resend-verification/',
    oauthCallback: '/oauth/callback/',
    googleLoginUrl: '/oauth/google/login-url/',
    csrfToken: '/auth/csrf-token/',
  },
  // Dashboard
  dashboard: {
    home: '/auth/dashboard/home/',
    search: '/auth/dashboard/search/',
    favorites: '/auth/dashboard/favorites/',
    profile: '/auth/dashboard/profile/',
    userProfile: (id: number) => `/auth/dashboard/users/${id}/profile/`,
    userSkills: (id: number) => `/auth/dashboard/users/${id}/skills/`,
    // Slug-based endpointy pre profily používateľov (musí podporovať backend)
    userProfileBySlug: (slug: string) => `/auth/dashboard/users/slug/${slug}/profile/`,
    userSkillsBySlug: (slug: string) => `/auth/dashboard/users/slug/${slug}/skills/`,
    settings: '/auth/dashboard/settings/',
  },
  // Skills
  skills: {
    list: '/auth/skills/',
    detail: (id: number) => `/auth/skills/${id}/`,
    images: (skillId: number) => `/auth/skills/${skillId}/images/`,
    imageDetail: (skillId: number, imageId: number) => `/auth/skills/${skillId}/images/${imageId}/`,
    reviews: (offerId: number) => `/auth/skills/${offerId}/reviews/`,
  },
  // Recenzie
  reviews: {
    list: (offerId: number) => `/auth/skills/${offerId}/reviews/`,
    detail: (reviewId: number) => `/auth/reviews/${reviewId}/`,
    respond: (reviewId: number) => `/auth/reviews/${reviewId}/respond/`,
    report: (reviewId: number) => `/auth/reviews/${reviewId}/report/`,
  },
  // Žiadosti
  requests: {
    list: '/auth/skill-requests/',
    detail: (id: number) => `/auth/skill-requests/${id}/`,
    status: '/auth/skill-requests/status/',
    requestCompletion: (id: number) => `/auth/skill-requests/${id}/request-completion/`,
    confirmCompletion: (id: number) => `/auth/skill-requests/${id}/confirm-completion/`,
  },
  // Nahlásenia používateľov
  users: {
    report: (userId: number) => `/auth/users/${userId}/report/`,
  },
  // Notifikácie
  notifications: {
    list: '/auth/notifications/',
    unreadCount: '/auth/notifications/unread-count/',
    markAllRead: '/auth/notifications/mark-all-read/',
  },
};

export default api;

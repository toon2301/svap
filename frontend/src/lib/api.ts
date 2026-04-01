import axios from 'axios';
import { fetchCsrfToken, getCsrfToken } from '@/utils/csrf';
import { buildApiUrl, getConfiguredApiUrl } from '@/lib/apiUrl';

type TraceMeta = Record<string, unknown>;
type RefreshResult = 'refreshed' | 'invalid_session' | 'transient_failure';
type AuthFailureKind = 'invalid_session' | 'transient_refresh_failure';
type AuthTaggedError = Error & {
  __svaplyAuthFailure?: AuthFailureKind;
};

const OAUTH_TRACE_ENABLED =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_OAUTH_TRACE === 'true';
const OAUTH_TRACE_KEY = '__oauth_trace_v1__';
const OAUTH_TRACE_MAX = 400;

function oauthTrace(event: string, meta?: TraceMeta): void {
  if (!OAUTH_TRACE_ENABLED || typeof window === 'undefined') return;
  try {
    const entry = {
      ts: new Date().toISOString(),
      event,
      ...(meta || {}),
    };
    const raw = window.localStorage.getItem(OAUTH_TRACE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(arr) ? [...arr, entry].slice(-OAUTH_TRACE_MAX) : [entry];
    window.localStorage.setItem(OAUTH_TRACE_KEY, JSON.stringify(next));
  } catch {
    // best-effort only
  }
}

if (typeof window !== 'undefined' && OAUTH_TRACE_ENABLED) {
  (window as any).__OAUTH_TRACE__ = {
    log: (event: string, meta?: TraceMeta) => oauthTrace(event, meta),
    dump: () => {
      try {
        return JSON.parse(window.localStorage.getItem(OAUTH_TRACE_KEY) || '[]');
      } catch {
        return [];
      }
    },
    clear: () => {
      try {
        window.localStorage.removeItem(OAUTH_TRACE_KEY);
      } catch {
        // ignore
      }
    },
  };
  oauthTrace('trace_bootstrap', { href: window.location.href });
}

// ============================================================
// Cookie-only refresh control (HttpOnly cookies, no JS access)
// ============================================================
// Global refresh lock: only one refresh request at a time
let refreshInFlight: Promise<RefreshResult> | null = null;
// Circuit breaker: after 429 cooldown or 401 disable until reload
let refreshDisabledUntil: number | null = null;
// Hard stop: after refresh 401 or explicit logout, never attempt refresh again until reload/login
let sessionInvalid = false;
// Avoid redirect storms after invalidation
let redirectedAfterInvalidation = false;
// Allow aborting refresh in-flight (e.g. logout)
let refreshAbortController: AbortController | null = null;
const REFRESH_HINT_STORAGE_KEY = '__svaply_refresh_hint__';

function readRefreshHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(REFRESH_HINT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeRefreshHint(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem(REFRESH_HINT_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(REFRESH_HINT_STORAGE_KEY);
    }
  } catch {
    // best-effort only
  }
}

let mayHaveRefreshCookieHint = readRefreshHint();

export function setMayHaveRefreshCookie(value: boolean): void {
  oauthTrace('set_may_have_refresh_cookie', { value });
  mayHaveRefreshCookieHint = value;
  writeRefreshHint(value);
  if (value) {
    refreshDisabledUntil = null;
    sessionInvalid = false;
    redirectedAfterInvalidation = false;
  }
}

/** Call on explicit logout to prevent any refresh attempts. */
export function invalidateSession(): void {
  oauthTrace('invalidate_session_called');
  mayHaveRefreshCookieHint = false;
  writeRefreshHint(false);
  sessionInvalid = true;
  refreshDisabledUntil = Number.MAX_SAFE_INTEGER;
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
  // Never attempt refresh for these endpoints (login, logout, refresh samotný, oauth)
  // /auth/me/ už nie je v skip – pri 401 skúsime refresh, ak uspeje, retry /me
  return (
    u.includes('/token/refresh/') ||
    u.includes('/auth/login/') ||
    u.includes('/auth/logout/') ||
    u.includes('/auth/csrf-token/') ||
    u.includes('/oauth/')
  );
}

function isMutatingMethod(method?: string): boolean {
  const normalized = String(method || '').toUpperCase();
  return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE';
}

function extractResponseMessage(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    return (
      (typeof record.detail === 'string' && record.detail) ||
      (typeof record.error === 'string' && record.error) ||
      (typeof record.message === 'string' && record.message) ||
      ''
    );
  }

  return '';
}

function shouldRetryWithFreshCsrf(error: any): boolean {
  const originalRequest = error?.config;
  if (!originalRequest || error?.response?.status !== 403) {
    return false;
  }

  if ((originalRequest as any)._csrfRetry === true) {
    return false;
  }

  if (!isMutatingMethod(originalRequest?.method)) {
    return false;
  }

  const requestUrl = String(originalRequest?.url || '');
  if (requestUrl.includes('/auth/csrf-token/')) {
    return false;
  }

  return extractResponseMessage(error?.response?.data).toLowerCase().includes('csrf');
}

function dispatchSessionInvalid(): void {
  oauthTrace('dispatch_session_invalid');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:session-invalid'));
  }
}

function markSessionInvalid(): void {
  if (sessionInvalid) return;
  oauthTrace('mark_session_invalid');
  mayHaveRefreshCookieHint = false;
  writeRefreshHint(false);
  sessionInvalid = true;
  refreshDisabledUntil = Number.MAX_SAFE_INTEGER;
  refreshInFlight = null;
  redirectedAfterInvalidation = true;
  try {
    refreshAbortController?.abort();
  } catch {
    // ignore
  }
  refreshAbortController = null;
  if (typeof window !== 'undefined') {
    dispatchSessionInvalid();
  }
}

function tagAuthFailure<T extends Error>(error: T, failure: AuthFailureKind): T {
  (error as AuthTaggedError).__svaplyAuthFailure = failure;
  return error;
}

export function isTransientAuthFailureError(error: unknown): boolean {
  return (error as AuthTaggedError | undefined)?.__svaplyAuthFailure === 'transient_refresh_failure';
}

async function probeSessionAfterRefresh401(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const response = await axios.get(buildApiUrl('/auth/me/'), {
      withCredentials: true,
      headers: { Accept: 'application/json' },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

export async function ensureSessionRefreshed(): Promise<RefreshResult> {
  if (sessionInvalid) {
    oauthTrace('refresh_skipped', { reason: 'session_invalid' });
    return 'invalid_session';
  }
  const now = Date.now();
  if (refreshDisabledUntil && now < refreshDisabledUntil) {
    oauthTrace('refresh_skipped', { reason: 'cooldown' });
    return 'transient_failure';
  }
  // Pri 401 vždy skúsime refresh, aby sme session neodhlásili pri timing issue
  // alebo pri rotácii cookies medzi paralelnými requestmi/tabmi.
  if (refreshInFlight) {
    oauthTrace('refresh_coalesced');
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      oauthTrace('refresh_start');
      // Ensure CSRF token exists (refresh endpoint enforces CSRF)
      if (!getCsrfToken()) {
        oauthTrace('refresh_fetch_csrf_start');
        await fetchCsrfToken();
        oauthTrace('refresh_fetch_csrf_done');
      }
      const csrfToken = getCsrfToken();
      const controller = new AbortController();
      refreshAbortController = controller;

      await axios.post(
        buildApiUrl('/token/refresh/'),
        {},
        {
          withCredentials: true,
          headers: csrfToken ? { 'X-CSRFToken': csrfToken } : undefined,
          signal: controller.signal,
        }
      );

      refreshDisabledUntil = null;
      oauthTrace('refresh_success');
      return 'refreshed';
    } catch (e: any) {
      const status = e?.response?.status;
      oauthTrace('refresh_failed', { status: status ?? null });
      if (status === 429) {
        // Cooldown 60s on rate-limit
        refreshDisabledUntil = Date.now() + 60_000;
        return 'transient_failure';
      }
      if (status === 401) {
        const recovered = await probeSessionAfterRefresh401();
        if (recovered) {
          refreshDisabledUntil = null;
          sessionInvalid = false;
          redirectedAfterInvalidation = false;
          oauthTrace('refresh_recovered_after_401');
          return 'refreshed';
        }
        return 'invalid_session';
      }
      return 'transient_failure';
    } finally {
      refreshInFlight = null;
      refreshAbortController = null;
    }
  })();

  return refreshInFlight;
}

const API_URL = getConfiguredApiUrl();
const RUNTIME_API_URL = API_URL;

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
    const traceUrl = String(config.url || '');
    if (
      traceUrl.includes('/oauth/') ||
      traceUrl.includes('/auth/me/') ||
      traceUrl.includes('/token/refresh/')
    ) {
      oauthTrace('api_request', {
        method: (config.method || 'GET').toUpperCase(),
        url: traceUrl,
      });
    }

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
    const traceUrl = String(response?.config?.url || '');
    if (
      traceUrl.includes('/oauth/') ||
      traceUrl.includes('/auth/me/') ||
      traceUrl.includes('/token/refresh/')
    ) {
      oauthTrace('api_response', {
        method: (response?.config?.method || 'GET').toUpperCase(),
        url: traceUrl,
        status: response.status,
      });
    }

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
    const traceUrl = String(originalRequest?.url || '');
    if (
      traceUrl.includes('/oauth/') ||
      traceUrl.includes('/auth/me/') ||
      traceUrl.includes('/token/refresh/')
    ) {
      oauthTrace('api_response_error', {
        method: (originalRequest?.method || 'GET').toUpperCase(),
        url: traceUrl,
        status: error?.response?.status ?? null,
      });
    }

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

    if (shouldRetryWithFreshCsrf(error)) {
      (originalRequest as any)._csrfRetry = true;
      oauthTrace('csrf_retry_start', {
        method: String(originalRequest?.method || 'GET').toUpperCase(),
        url: String(url || ''),
      });

      await fetchCsrfToken();
      const csrfToken = getCsrfToken();

      if (csrfToken) {
        originalRequest.headers = originalRequest.headers || {};
        (originalRequest.headers as Record<string, string>)['X-CSRFToken'] = csrfToken;
        oauthTrace('csrf_retry_success', {
          url: String(url || ''),
        });
        return api(originalRequest);
      }

      oauthTrace('csrf_retry_missing_token', {
        url: String(url || ''),
      });
    }

    if (status === 401) {
      oauthTrace('api_401_interceptor', { url: String(url || '') });
      // If we already know the session is invalid, never refresh again.
      // Just reject deterministically (and signal AuthContext once).
      if (sessionInvalid) {
        if (typeof window !== 'undefined' && !redirectedAfterInvalidation) {
          redirectedAfterInvalidation = true;
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

      // Anonymous bootstrap on public routes should not trigger refresh/probe loops.
      // We only attempt refresh if we have some signal that a refresh cookie may exist.
      const requestUrl = String(url || '');
      const isMeBootstrapRequest =
        requestUrl.includes('/auth/me/') &&
        String(originalRequest?.method || 'get').toLowerCase() === 'get';

      if (isMeBootstrapRequest && !mayHaveRefreshCookieHint) {
        oauthTrace('refresh_skipped', {
          reason: 'no_refresh_hint',
          url: requestUrl,
        });
        return Promise.reject(error);
      }

      // Try refresh exactly once per original request
      (originalRequest as any)._retry = true;
      const refreshed = await ensureSessionRefreshed();

      if (refreshed === 'refreshed') {
        return api(originalRequest);
      }

      if (refreshed === 'invalid_session') {
        markSessionInvalid();
        return Promise.reject(tagAuthFailure(error, 'invalid_session'));
      }

      return Promise.reject(tagAuthFailure(error, 'transient_refresh_failure'));
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
    searchRecommendations: '/auth/dashboard/search/recommendations/',
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
    imageUploadInit: (skillId: number) => `/auth/skills/${skillId}/images/upload-init/`,
    imageUploadComplete: (skillId: number) => `/auth/skills/${skillId}/images/upload-complete/`,
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
  // Verejné vyhľadávanie (OfferedSkill)
  search: '/auth/search/',
  // Globálne verejné vyhľadávanie (users + offers)
  searchGlobal: '/auth/search/global/',
  // Notifikácie
  notifications: {
    list: '/auth/notifications/',
    unreadCount: '/auth/notifications/unread-count/',
    markAllRead: '/auth/notifications/mark-all-read/',
  },
  // Web push
  push: {
    vapidPublicKey: '/auth/push/vapid-public-key/',
    subscriptions: '/auth/push/subscriptions/',
    subscriptionCurrent: '/auth/push/subscriptions/current/',
    preferences: '/auth/push/preferences/',
  },
};

export default api;

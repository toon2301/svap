import axios from 'axios';
import Cookies from 'js-cookie';
import { clearAuthTokens, getAuthHeader, getRefreshToken } from '@/utils/auth';
import { getCsrfToken } from '@/utils/csrf';

// API URL konfigurácia - používa environment premenné
const getApiUrl = () => {
  const explicitApi = process.env.NEXT_PUBLIC_API_URL;
  const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

  // Ak je explicitná absolútna API URL, použij ju (https://...)
  if (explicitApi && /^https?:\/\//.test(explicitApi)) {
    return explicitApi;
  }

  // Preferuj BACKEND_ORIGIN, ak je k dispozícii (oddelený frontend/backend)
  if (backendOrigin) {
    return `${backendOrigin}/api`;
  }

  // Inak použi explicitnú (môže byť relatívna, napr. '/api')
  if (explicitApi) {
    return explicitApi;
  }

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

    // Pri cross-origin OAuth sú tokeny v localStorage – posielame Authorization header
    const authHeader = getAuthHeader();
    if (authHeader) {
      config.headers['Authorization'] = authHeader;
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh: cookie (same-origin) alebo body (cross-origin, tokeny z localStorage)
        const refreshToken = getRefreshToken();
        const csrfToken = getCsrfToken();
        const refreshResponse = await axios.post(
          `${API_URL}/token/refresh/`,
          refreshToken ? { refresh: refreshToken } : {},
          {
            withCredentials: true,
            headers: csrfToken ? { 'X-CSRFToken': csrfToken } : undefined,
          }
        );
        // Pri cross-origin nové tokeny neprídu v cookies – uložiť do localStorage
        const data = refreshResponse?.data;
        if (data?.access && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('access_token', data.access);
            if (data.refresh) window.localStorage.setItem('refresh_token', data.refresh);
          } catch {}
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh zlyhal (400 = chýbajúci cookie pri cross-origin, 401 = neplatný/expired). Nevolať logout API – vyžaduje auth a vráti 401.
        if (typeof window !== 'undefined') {
          clearAuthTokens();
          window.location.href = '/';
        }
      }
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
  },
  // Žiadosti
  requests: {
    list: '/auth/skill-requests/',
    detail: (id: number) => `/auth/skill-requests/${id}/`,
    status: '/auth/skill-requests/status/',
  },
  // Notifikácie
  notifications: {
    list: '/auth/notifications/',
    unreadCount: '/auth/notifications/unread-count/',
    markAllRead: '/auth/notifications/mark-all-read/',
  },
};

export default api;

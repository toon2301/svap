import axios from 'axios';
import Cookies from 'js-cookie';

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

// Utility funkcia na získanie CSRF tokenu z cookies
const getCsrfToken = (): string | undefined => {
  // Django štandardne používa cookie s názvom 'csrftoken'
  return Cookies.get('csrftoken');
};

// Create axios instance
export const api = axios.create({
  baseURL: RUNTIME_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 sekúnd timeout pre mobile
  withCredentials: true, // Povoliť posielanie cookies pre CSRF
});

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  (config) => {
    // Pridaj JWT auth token ak existuje
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          Cookies.set('access_token', access);
          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        window.location.href = '/auth/login';
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
    home: '/dashboard/home/',
    search: '/dashboard/search/',
    favorites: '/dashboard/favorites/',
    profile: '/dashboard/profile/',
    settings: '/dashboard/settings/',
  },
};

export default api;

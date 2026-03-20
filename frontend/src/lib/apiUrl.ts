const DEV_DEFAULT_API_URL = 'http://localhost:8000/api';

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getConfiguredApiUrl(): string {
  const explicitApi = process.env.NEXT_PUBLIC_API_URL;
  const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

  if (explicitApi) return normalizeUrl(explicitApi);

  if (backendOrigin) return `${normalizeUrl(backendOrigin)}/api`;

  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    try {
      const saved = window.sessionStorage.getItem('API_BASE_URL');
      if (saved && /^https?:\/\//.test(saved)) {
        return normalizeUrl(saved);
      }
    } catch {
      // ignore
    }
  }

  return DEV_DEFAULT_API_URL;
}

export function buildApiUrl(path: string): string {
  const base = getConfiguredApiUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

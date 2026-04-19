import { getConfiguredApiUrl } from '@/lib/apiUrl';

const MESSAGE_IMAGE_PATH_RE =
  /^\/api\/auth\/messaging\/conversations\/\d+\/messages\/\d+\/image\/?$/;

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

function getSameOriginApiBasePath(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const configuredApiUrl = getConfiguredApiUrl();
  if (!configuredApiUrl) {
    return null;
  }

  if (configuredApiUrl.startsWith('/')) {
    return normalizePathname(configuredApiUrl);
  }

  try {
    const parsed = new URL(configuredApiUrl, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }

    return normalizePathname(parsed.pathname);
  } catch {
    return null;
  }
}

export function resolveMessagingImageUrl(rawUrl: string | null | undefined): string | null {
  if (typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  if (typeof window === 'undefined') {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (!MESSAGE_IMAGE_PATH_RE.test(parsed.pathname)) {
      return trimmed;
    }

    const sameOriginApiBasePath = getSameOriginApiBasePath();
    if (!sameOriginApiBasePath) {
      return trimmed;
    }

    const normalizedPathname = normalizePathname(parsed.pathname);
    const normalizedApiBasePath = normalizePathname(sameOriginApiBasePath);
    if (!normalizedPathname.startsWith(`${normalizedApiBasePath}/`)) {
      return trimmed;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return trimmed;
  }
}


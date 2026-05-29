const MAX_TRACES_SAMPLE_RATE = 0.2;
const DEFAULT_BROWSER_TRACES_SAMPLE_RATE = 0.05;
const DEFAULT_SERVER_TRACES_SAMPLE_RATE = 0.1;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrftoken',
  'x-csrf-token',
]);

type SentryLikeEvent = {
  transaction?: unknown;
  request?: {
    url?: unknown;
    query_string?: unknown;
    cookies?: unknown;
    data?: unknown;
    headers?: Record<string, unknown>;
  };
  spans?: Array<{
    op?: unknown;
    description?: unknown;
  }>;
};

function readEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function stripQuery(value: string): string {
  return String(value || '').split('?', 1)[0];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function safeSentryTracesSampleRate(
  rawValue: string | number | undefined,
  fallback = DEFAULT_BROWSER_TRACES_SAMPLE_RATE,
): number {
  const parsed =
    typeof rawValue === 'number'
      ? rawValue
      : rawValue && rawValue.trim()
        ? Number(rawValue)
        : fallback;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(MAX_TRACES_SAMPLE_RATE, parsed));
}

export function normalizeSentryPath(value: string): string {
  const withoutMethod = stripQuery(value).trim().replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i, '');
  if (!withoutMethod) return withoutMethod;

  let path = withoutMethod;
  try {
    const parsed = new URL(withoutMethod, 'https://svaply.local');
    path = parsed.pathname || '/';
  } catch {
    path = withoutMethod;
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  return path
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Keep the raw value when decoding fails.
      }
      if (/^\d+$/.test(decoded) || UUID_PATTERN.test(decoded)) return ':id';
      if (decoded.includes('@')) return ':value';
      return segment;
    })
    .join('/') || '/';
}

export function sanitizeSentryEvent<T extends SentryLikeEvent>(event: T): T {
  if (typeof event.transaction === 'string') {
    event.transaction = normalizeSentryPath(event.transaction);
  }

  const request = event.request;
  if (request) {
    if (typeof request.url === 'string') {
      request.url = normalizeSentryPath(request.url);
    }
    delete request.query_string;
    delete request.cookies;
    delete request.data;

    if (request.headers) {
      for (const key of Object.keys(request.headers)) {
        if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
          delete request.headers[key];
        }
      }
    }
  }

  for (const span of event.spans || []) {
    const op = String(span.op || '');
    if (op.startsWith('http') && typeof span.description === 'string') {
      span.description = normalizeSentryPath(span.description);
    }
  }

  return event;
}

export function sentryEnvironment(): string {
  return (
    readEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT') ||
    readEnv('SENTRY_ENVIRONMENT') ||
    process.env.NODE_ENV ||
    'production'
  );
}

export function sentryRelease(): string | undefined {
  return (
    readEnv('NEXT_PUBLIC_SENTRY_RELEASE') ||
    readEnv('SENTRY_RELEASE') ||
    readEnv('RAILWAY_GIT_COMMIT_SHA') ||
    readEnv('VERCEL_GIT_COMMIT_SHA')
  );
}

export function sentryBrowserTracesSampleRate(): number {
  return safeSentryTracesSampleRate(
    readEnv('NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE'),
    DEFAULT_BROWSER_TRACES_SAMPLE_RATE,
  );
}

export function sentryServerTracesSampleRate(): number {
  return safeSentryTracesSampleRate(
    readEnv('SENTRY_TRACES_SAMPLE_RATE') || readEnv('NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE'),
    DEFAULT_SERVER_TRACES_SAMPLE_RATE,
  );
}

export function sentryTracePropagationTargets(): Array<string | RegExp> {
  const targets: Array<string | RegExp> = [/^\/api\//];
  const origins = [
    readEnv('NEXT_PUBLIC_BACKEND_ORIGIN'),
    readEnv('NEXT_PUBLIC_API_URL'),
    readEnv('BACKEND_ORIGIN'),
  ].filter(Boolean) as string[];

  for (const origin of origins) {
    try {
      const parsed = new URL(origin, 'https://svaply.local');
      if (parsed.origin && parsed.origin !== 'https://svaply.local') {
        targets.push(new RegExp(`^${escapeRegex(parsed.origin)}/api/`));
      }
    } catch {
      // Ignore malformed env values.
    }
  }

  return targets;
}


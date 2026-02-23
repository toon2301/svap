import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function generateNonce(): string {
  // Edge-compatible, per-request nonce (no Node.js Buffer dependency).
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // base64url (no padding) – safe token for CSP nonce
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function middleware(request: NextRequest) {
  // Nonce-based CSP only in production.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const nonce = generateNonce();

  // Preserve existing directives and add nonce to script-src.
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ]
    .join('; ')
    .trim();

  // Next.js uses request headers during rendering; set both request + response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Match all request paths except for:
      // - api (backend proxy endpoints, not documents)
      // - _next/static, _next/image (static assets)
      // - favicon.ico
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      // Ignore Next prefetches
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prevent CDN/edge caching for HTML documents in production.
  // CSP je nastavovaná staticky v next.config.js headers().
  if (process.env.NODE_ENV === 'production') {
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      response.headers.set('Cache-Control', 'no-store');
    }
  }

  return response;
}

export const config = {
  matcher: [
    {
      // Match all request paths except for:
      // - api (backend proxy endpoints, not documents)
      // - _next/static, _next/image (static assets)
      // - _next/data (internal data requests)
      // - favicon.ico
      // - any file with an extension (public/static files like .png, .json, .xml, ...)
      source: '/((?!api|_next/static|_next/image|_next/data|favicon.ico|.*\\..*).*)',
      // Ignore Next prefetches
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};


const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dôležité pre Django API s trailing slashmi:
  // nechceme aby Next automaticky presmerovával `/api/.../` -> `/api/...`
  // (inak vznikajú 301 na backende kvôli APPEND_SLASH).
  skipTrailingSlashRedirect: true,

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  
  images: {
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/media/**',
      },
    ],
  },

  env: {
    // V produkcii nech front volá relatívne /api (proxy/ingress sa postará)
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },

  async rewrites() {
    // Proxy /api/* na backend (užitočné na Railway pri oddelenom FE/BE, aby cookies boli 1st-party)
    const backendOrigin =
      process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_FRONTEND_ORIGIN;

    if (!backendOrigin) return [];

    const norm = (u) => String(u || '').trim().replace(/\/+$/, '');
    const be = norm(backendOrigin);
    const fe = norm(frontendOrigin);
    // Zabráň self-proxy loopu, ak by niekto omylom nastavil backendOrigin == frontendOrigin
    if (fe && be && be === fe) return [];

    // Dôležité: zachovať trailing slash (Django/DRF ho používa).
    // Next.js pri :path* často "zje" koncové `/`, takže pridáme osobitné pravidlo pre URL s `/`.
    return [
      { source: '/api/:path*/', destination: `${be}/api/:path*/` },
      { source: '/api/:path*', destination: `${be}/api/:path*` },
    ];
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const headers = [];

    if (isProd) {
      // Statická CSP iba v produkcii (HTTP response header).
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.gstatic.com/",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com/",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https://www.google.com https://www.gstatic.com",
        "connect-src 'self' https://www.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/",
        "frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join('; ');
      headers.push({
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: csp }],
      });
    } else {
      headers.push({
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      });
    }

    return headers;
  },

  compress: true,

  // Server-side rendering pre Railway
  // output: 'export', // Zakomentované pre Railway deployment
};

module.exports = nextConfig;


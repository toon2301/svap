const path = require('path');

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function toWsConnectSrc(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return '';
  if (normalized.startsWith('https://')) return normalized.replace(/^https:\/\//, 'wss://');
  if (normalized.startsWith('http://')) return normalized.replace(/^http:\/\//, 'ws://');
  return '';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dôležité pre Django API s trailing slashmi:
  // nechceme aby Next automaticky presmerovával `/api/.../` -> `/api/...`
  // (inak vznikajú 301 na backende kvôli APPEND_SLASH).
  skipTrailingSlashRedirect: true,

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    if (dev) {
      // Avoid unstable filesystem cache state on Windows dev runs.
      // We prefer slightly slower recompiles over broken chunk graphs in .next/server.
      config.cache = false;
    }

    return config;
  },
  
  images: {
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

  async redirects() {
    return [
      {
        source: '/dashboard/messages/:conversationId',
        destination: '/dashboard/messages?conversationId=:conversationId',
        permanent: false,
      },
      {
        source: '/dashboard/messages/:conversationId/',
        destination: '/dashboard/messages?conversationId=:conversationId',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    // Prehliadače žiadajú /favicon.ico — bez súboru Next/Dev často ukáže predvolenú Vercel ikonu.
    const faviconRewrite = { source: '/favicon.ico', destination: '/favicon.png' };

    // Proxy /api/* na backend (užitočné na Railway pri oddelenom FE/BE, aby cookies boli 1st-party)
    const backendHttpOrigin =
      process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
    const backendWsOrigin =
      process.env.BACKEND_WS_ORIGIN ||
      process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN ||
      backendHttpOrigin;
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_FRONTEND_ORIGIN;

    if (!backendHttpOrigin) return [faviconRewrite];

    const beHttp = normalizeOrigin(backendHttpOrigin);
    const beWs = normalizeOrigin(backendWsOrigin);
    const fe = normalizeOrigin(frontendOrigin);
    // Zabráň self-proxy loopu, ak by niekto omylom nastavil backendOrigin == frontendOrigin
    if (fe && beHttp && beHttp === fe && (!beWs || beWs === fe)) return [faviconRewrite];

    // Dôležité: zachovať trailing slash (Django/DRF ho používa).
    // Next.js pri :path* často "zje" koncové `/`, takže pridáme osobitné pravidlo pre URL s `/`.
    // /ws/* proxy pre WebSocket (notifikácie v reálnom čase) – same-origin = cookies fungujú.
    // /media/* proxy pre avatary/media (keď backend servuje /media/, napr. lokálne alebo s volume)
    return [
      faviconRewrite,
      { source: '/api/:path*/', destination: `${beHttp}/api/:path*/` },
      { source: '/api/:path*', destination: `${beHttp}/api/:path*` },
      { source: '/ws/:path*/', destination: `${beWs}/ws/:path*/` },
      { source: '/ws/:path*', destination: `${beWs}/ws/:path*` },
      { source: '/media/:path*', destination: `${beHttp}/media/:path*` },
    ];
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const headers = [];

    if (isProd) {
      // Povolené pôvody pre obrázky (avatary, media z S3 alebo backendu)
      const imgSrcCandidates = [
        "'self'",
        'data:',
        'blob:',
        'https://www.google.com',
        'https://www.gstatic.com',
        process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.trim(),
        process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.trim(),
        // Špecifické buckety (ak NEXT_PUBLIC_MEDIA_ORIGIN nie je nastavený)
        'https://svaply-media.s3.amazonaws.com',
        'https://svaply-media.s3.eu-north-1.amazonaws.com',
        // Wildcards pre ľubovoľný S3 bucket (Railway môže použiť vlastný bucket)
        'https://*.s3.amazonaws.com',
        'https://*.s3.eu-north-1.amazonaws.com',
        'https://*.s3.eu-central-1.amazonaws.com',
        'https://*.s3.us-east-1.amazonaws.com',
        'https://*.s3.eu-west-1.amazonaws.com',
      ].filter(Boolean);

      const isValidOrigin = (o) =>
        o.startsWith("'") ||
        o.startsWith('data') ||
        o.startsWith('blob:') ||
        /^https:\/\/[a-z0-9.*.-]+$/.test(String(o).replace(/\/+$/, '')); // * pre S3 wildcard subdomény

      const imgSrcOrigins = imgSrcCandidates
        .filter(isValidOrigin)
        .map((o) => (o.startsWith('https') ? String(o).replace(/\/+$/, '') : o));
      const imgSrcUnique = [...new Set(imgSrcOrigins)];

      const imgSrc = imgSrcUnique.join(' ');
      // connect-src: Fetch/XHR (vrátane Service Worker fetch pre obrázky z S3) musí mať povolené media origins
      const connectSrcExtra = imgSrcUnique.filter((o) => o.startsWith('https')).join(' ');
      const backendConnectCandidates = [
        process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.trim(),
        process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN?.trim(),
      ]
        .filter(Boolean)
        .map((origin) => normalizeOrigin(origin));
      const wsConnectExtra = backendConnectCandidates
        .map((origin) => toWsConnectSrc(origin))
        .filter(Boolean)
        .join(' ');
      const connectSrc = [
        "'self'",
        'https://www.google.com',
        'https://www.google.com/recaptcha/',
        'https://www.gstatic.com/',
        'https://www.recaptcha.net/',
        'https://ipapi.co',
        connectSrcExtra,
        wsConnectExtra,
      ]
        .filter(Boolean)
        .join(' ');

      // Statická CSP iba v produkcii (HTTP response header).
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.gstatic.com/ https://www.recaptcha.net/",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com/",
        "font-src 'self' https://fonts.gstatic.com",
        `img-src ${imgSrc}`,
        `connect-src ${connectSrc}`,
        "frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://www.recaptcha.net/",
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


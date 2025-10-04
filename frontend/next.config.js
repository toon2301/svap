const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    domains: ['localhost', '127.0.0.1', '192.168.68.103'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.68.103',
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
    // V produkcii vypni proxy, aby nevznikol self-proxy loop a header overflow
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    const backendOrigin = process.env.BACKEND_ORIGIN;
    if (!backendOrigin) return [];
    return [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }];
  },

  compress: true,

  // Server-side rendering pre Railway
  // output: 'export', // Zakomentované pre Railway deployment
};

module.exports = nextConfig;


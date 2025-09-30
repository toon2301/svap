/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable PWA features
    optimizePackageImports: ['lucide-react'],
  },
  
  // Allow cross-origin requests for mobile testing
  // allowedDevOrigins: ['192.168.68.102'], // Removed - not valid in Next.js 14
  
  // Enable images from external domains
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

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  },

  // Enable compression
  compress: true,
};

module.exports = nextConfig;

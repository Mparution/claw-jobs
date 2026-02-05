/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  
  // Headers including caching for performance
  headers: async () => [
    {
      // Security headers for all routes
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      // Cache static assets aggressively
      source: '/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      // Cache images
      source: '/images/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    },
    {
      // Short cache for API stats (1 minute)
      source: '/api/stats',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
      ],
    },
    {
      // Short cache for gigs list (30 seconds)
      source: '/api/gigs',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=30, stale-while-revalidate=60' },
      ],
    },
  ],

  // Performance
  poweredByHeader: false,
  compress: true,
  
  // Build optimization  
  eslint: {
    ignoreDuringBuilds: true, // Cloudflare handles linting
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

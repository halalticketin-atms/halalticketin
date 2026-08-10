import { dirname } from 'path';
import { fileURLToPath } from 'url';
import type { NextConfig } from 'next';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const noIndexHeader = {
  key: 'X-Robots-Tag',
  value: 'noindex, nofollow, noarchive',
};

const noIndexRoutes = [
  '/_mobile-testflight-qr-a7f42c9d13e84b6a/:path*',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/dashboard/:path*',
  '/profile',
  '/settings',
  '/admin',
  '/events/create',
  '/events/create/:path*',
  '/events/new',
  '/events/new/:path*',
  '/events/:id/edit',
  '/events/:id/preview',
  '/events/preview/:path*',
  '/events/published',
  '/checkout/:path*',
  '/auth/:path*',
  '/invitations/:path*',
  '/check-in/:path*',
  '/gift/:path*',
  '/embed/:path*',
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      {
        source: '/events/marriage-through-the-season',
        destination: '/events/marriage-through-the-seasons',
        permanent: true,
      },
    ];
  },
  async headers() {
    return noIndexRoutes.map((source) => ({
      source,
      headers: [noIndexHeader],
    }));
  },
  images: {
    // Keep WebP optimization while avoiding AVIF decoding issues in some runtimes.
    formats: ['image/webp'],
    // Define device breakpoints for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Smaller sizes for icons and thumbnails
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cfduyfqkwassngaifvub.supabase.co',
      },
    ],
  },
};

export default nextConfig;

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import type { NextConfig } from 'next';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: '/_mobile-testflight-qr-a7f42c9d13e84b6a/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
    ];
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

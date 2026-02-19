import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

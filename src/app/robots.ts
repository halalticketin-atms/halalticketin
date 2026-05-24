import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/_mobile-testflight-qr-a7f42c9d13e84b6a/',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

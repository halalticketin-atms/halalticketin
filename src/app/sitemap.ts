import type { MetadataRoute } from 'next';
import { fetchPublicEvents } from '@/lib/events-api';
import { getSiteUrl } from '@/lib/seo';

export const revalidate = 3600;

const siteUrl = getSiteUrl();

const routes = [
  '/',
  '/about',
  '/contact',
  '/cookie-policy',
  '/events',
  '/faq',
  '/pricing',
  '/privacy',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));

  try {
    const response = await fetchPublicEvents({ limit: 100 });
    const eventRoutes = response.events
      .filter((event) => event.slug || event.id)
      .map((event) => ({
        url: `${siteUrl}/events/${event.slug || event.id}`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));

    const organizerRoutes = Array.from(
      new Set(response.events.map((event) => event.organizerId).filter(Boolean))
    ).map((organizerId) => ({
      url: `${siteUrl}/organizers/${organizerId}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...eventRoutes, ...organizerRoutes];
  } catch {
    return staticRoutes;
  }
}

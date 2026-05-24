import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: "Browse Meaningful Events | HalalTicketin'",
  description:
    "Discover meaningful halal-friendly events, workshops, conferences, charity gatherings, and community experiences near you.",
  path: '/events',
  keywords: ['browse halal events', 'muslim events near me', 'islamic workshops', 'community events'],
});

export default function EventsLayout({ children }: { children: ReactNode }) {
  return children;
}

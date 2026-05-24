import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: "About HalalTicketin'",
  description:
    "Learn how HalalTicketin' helps Muslim communities create, manage, and sell tickets for meaningful halal-friendly events.",
  path: '/about',
  keywords: ['about halal ticketing', 'muslim community events'],
});

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}

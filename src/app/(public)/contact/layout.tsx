import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: "Contact HalalTicketin'",
  description:
    "Contact HalalTicketin' for organiser support, partnerships, billing, refunds, and event ticketing questions.",
  path: '/contact',
  keywords: ['contact halal ticketing', 'event organiser support'],
});

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: "Pricing for Event Organisers | HalalTicketin'",
  description:
    "Simple, transparent ticketing pricing for organisers running meaningful halal-friendly events.",
  path: '/pricing',
  keywords: ['event ticketing pricing', 'event organiser pricing', 'halal event platform pricing'],
});

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}

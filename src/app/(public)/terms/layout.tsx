import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: "Terms of Use | HalalTicketin'",
  description:
    "Read the HalalTicketin' terms for organisers, attendees, payments, refunds, and platform use.",
  path: '/terms',
  keywords: ['terms of use', 'event ticketing terms'],
});

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: "FAQ | HalalTicketin'",
  description:
    "Answers to common questions about tickets, refunds, gift tickets, payments, and organising events on HalalTicketin'.",
  path: '/faq',
  keywords: ['halal ticketing faq', 'ticket refund help', 'event ticket questions'],
});

export default function FaqLayout({ children }: { children: ReactNode }) {
  return children;
}

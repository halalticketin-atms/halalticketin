import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: "Page Not Found | HalalTicketin'",
  description: "This page is currently unavailable on HalalTicketin'.",
  openGraph: {
    title: "Page Not Found | HalalTicketin'",
    description: "This page is currently unavailable on HalalTicketin'.",
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "Page Not Found | HalalTicketin'",
    description: "This page is currently unavailable on HalalTicketin'.",
  },
};

export default function GiftClaimLayout({ children }: { children: ReactNode }) {
  return children;
}

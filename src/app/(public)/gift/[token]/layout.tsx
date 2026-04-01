import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: "Claim Your Gifted Ticket | HalalTicketin'",
  description: "Open your secure gifted ticket link and complete your ticket claim on HalalTicketin'.",
  openGraph: {
    title: "Claim Your Gifted Ticket | HalalTicketin'",
    description:
      "Open your secure gifted ticket link and complete your ticket claim on HalalTicketin'.",
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "Claim Your Gifted Ticket | HalalTicketin'",
    description:
      "Open your secure gifted ticket link and complete your ticket claim on HalalTicketin'.",
  },
};

export default function GiftClaimLayout({ children }: { children: ReactNode }) {
  return children;
}

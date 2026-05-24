import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: "Privacy Policy | HalalTicketin'",
  description:
    "Read the HalalTicketin' privacy policy, including how event, organiser, attendee, and payment-related data is handled.",
  path: '/privacy',
  keywords: ['privacy policy', 'data protection'],
});

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}

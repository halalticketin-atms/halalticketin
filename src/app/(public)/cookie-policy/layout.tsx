import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: "Cookie Policy | HalalTicketin'",
  description:
    "Read how HalalTicketin' uses essential browser storage and optional marketing technology.",
  path: '/cookie-policy',
  keywords: ['cookie policy', 'privacy'],
});

export default function CookiePolicyLayout({ children }: { children: ReactNode }) {
  return children;
}

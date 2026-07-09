import type { ReactNode } from 'react';
import { createPageMetadata, absoluteUrl } from '@/lib/seo';
import { FAQ_SECTIONS, faqPlainAnswer } from '@/lib/faq-data';

export const metadata = createPageMetadata({
  title: "FAQ | HalalTicketin'",
  description:
    "Answers to common questions about tickets, refunds, gift tickets, payments, and organising events on HalalTicketin'.",
  path: '/faq',
  keywords: ['halal ticketing faq', 'ticket refund help', 'event ticket questions'],
});

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  url: absoluteUrl('/faq'),
  mainEntity: FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      url: absoluteUrl(`/faq#${item.id}`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: faqPlainAnswer(item.answer),
      },
    }))
  ),
};

export default function FaqLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      {children}
    </>
  );
}

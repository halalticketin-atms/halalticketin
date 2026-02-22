'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { BROWSER_STORAGE_ITEMS, FIRST_PARTY_COOKIES, MARKETING_TECHNOLOGIES } from '@/lib/consent-inventory';

type Section = {
  title: string;
  body: string | string[];
  note?: string;
};

const consentCookie = FIRST_PARTY_COOKIES[0];
const consentCookieName = consentCookie?.name ?? 'ht_consent';
const consentCookieRetention = consentCookie?.retention ?? '180 days';
const effectiveDate = '22 February 2026';
const browserStorageSummary =
  BROWSER_STORAGE_ITEMS.length > 0
    ? `${BROWSER_STORAGE_ITEMS.length} essential browser-storage keys`
    : 'our essential browser storage keys';
const marketingToolsSummary =
  MARKETING_TECHNOLOGIES.length > 0 ? MARKETING_TECHNOLOGIES.map((tech) => tech.name).join(', ') : 'any marketing tooling we enable';
const marketingRunsWhen = MARKETING_TECHNOLOGIES[0]?.runsWhen ?? 'Optional scripts only load after you accept marketing storage.';

const sections: Section[] = [
  {
    title: '1. Introduction',
    body:
      'Halal Ticketin’ respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit or use our platform.',
  },
  {
    title: '2. Who We Are',
    body:
      'Halal Ticketin is a trading name of ATMS Limited, incorporated in Ireland. In this policy, “Halal Ticketin”, “we”, “us”, and “our” refer to ATMS Limited acting as the data controller. Event organisers and certain third parties (e.g., Stripe or PayPal) may also process data under their own privacy terms and are independently responsible for that processing.',
  },
  {
    title: '3. Information We Collect',
    body: [
      'Identity and contact data (name, email, address, phone number).',
      'Event registration details provided during checkout or RSVP.',
      'Technical data (e.g., IP address, browser type, device information) collected automatically by hosting, analytics, or payment providers for security and functionality. Halal Ticketin’ does not collect this directly.',
      'Marketing preferences and consent status.',
    ],
  },
  {
    title: '4. How We Use Your Data',
    body: [
      'Facilitate ticket purchases and event registrations.',
      'Operate, maintain, and improve the platform.',
      'Meet legal or regulatory obligations.',
      'Provide customer support.',
      'Send marketing communications (only with your consent).',
    ],
  },
  {
    title: '5. Legal Basis for Processing',
    body: [
      'Contractual necessity (e.g., fulfilling ticket sales).',
      'Legitimate interests (security, fraud prevention, product improvement).',
      'Consent (marketing communications or optional features).',
      'Legal compliance (responding to lawful requests).',
    ],
  },
  {
    title: '6. Sharing Your Data',
    body: [
      'Event organisers (to manage registrations and attendees).',
      'Payment processors such as Stripe for secure transactions.',
      'IT and infrastructure providers (hosting, support tools).',
      'Regulators or authorities where required by law.',
    ],
    note:
      'Event organisers act as independent data controllers when using attendee data outside Halal Ticketin’s scope.',
  },
  {
    title: '7. Data Retention',
    body:
      'We retain personal data only for as long as necessary to fulfill the purposes outlined in this policy or to satisfy legal, tax, or regulatory requirements.',
  },
  {
    title: '8. Your Rights',
    body: [
      'Access the personal data we hold about you.',
      'Correct inaccurate or incomplete data.',
      'Request deletion of your data.',
      'Object to or restrict certain processing.',
      'Withdraw consent where processing relies on consent.',
      'Request data portability to another service.',
    ],
    note: 'Submit requests by contacting us at info@halalticketin.com.',
  },
  {
    title: '9. Cookies',
    body: [
      `We directly set a single first-party cookie (${consentCookieName}) to remember whether you opted into marketing storage. It expires after ${consentCookieRetention}.`,
      `We also use ${browserStorageSummary} in localStorage/sessionStorage for secure login, invitation handling, draft recovery, organiser setup, and purchase deduplication. We do not store auth cookies.`,
      `${marketingToolsSummary}: ${marketingRunsWhen} You can change this any time via “Manage cookies” in the site footer (or via cookie controls in embedded event/checkout views). See our Cookie Policy for the full inventory.`
    ],
  },
  {
    title: '10. Children’s Data',
    body:
      'Our services are not intended for children under 13, and we do not knowingly collect personal data from children.',
  },
  {
    title: '11. Security',
    body:
      'We implement appropriate technical and organisational safeguards to protect your data. However, no online system is completely secure, and we cannot guarantee absolute protection.',
  },
  {
    title: '12. Changes to This Policy',
    body:
      'We may update this Privacy Policy periodically. Significant changes will be communicated via the platform or email and noted with a revised effective date.',
  },
  {
    title: '13. Contact Us',
    body:
      'If you have questions about this policy or wish to exercise your data rights, contact us at: info@halalticketin.com.',
  },
  {
    title: '14. Regional Disclosures',
    body: [
      'California Residents: We do not sell your personal data. You may exercise CCPA rights by contacting us, and we will not discriminate for doing so.',
      'International Users: Your information may be transferred to and processed in countries with different data protection standards. We use Standard Contractual Clauses and other safeguards to protect your data.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="container py-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Halal Ticketin’</p>
            <h1 className="font-display text-4xl font-bold mt-3">Privacy Policy</h1>
            <p className="mt-3 text-muted-foreground">Effective Date: {effectiveDate}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Need assistance?{' '}
              <Link href="/contact" className="text-primary underline">
                Contact us
              </Link>
              .
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <Card className="border-border/50">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  {Array.isArray(section.body) ? (
                    <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                      {section.body.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">{section.body}</p>
                  )}
                  {section.note && (
                    <p className="text-sm text-muted-foreground italic">{section.note}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

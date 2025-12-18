'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';

type Section = {
  title: string;
  body: string | string[];
};

const sections: Section[] = [
  {
    title: '1. Introduction',
    body:
      'Welcome to Halal Ticketin’, a platform dedicated to the sale and discovery of events aligned with Islamic values. These Terms and Conditions (“Terms”) govern your access to and use of our platform, services, and website (collectively, the “Services”). By accessing or using our Services, you agree to comply with these Terms. If you do not agree, you must not use the Services.',
  },
  {
    title: '2. Who We Are',
    body:
      'Halal Ticketin’ is operated by [Halal Ticketin’ Legal Name], an Irish company incorporated under the laws of Ireland. Our Services connect event organisers (“Organisers”) with attendees (“Consumers”) seeking events that comply with Islamic principles.',
  },
  {
    title: '3. Platform Use and Role',
    body:
      'Halal Ticketin’ acts solely as a technology platform. We do not organise or host events and are not a party to any contract between Organisers and Consumers. Organisers are responsible for their events, including compliance with applicable laws and Islamic principles.',
  },
  {
    title: '4. Islamic Event Compliance',
    body: [
      'Events promoting or involving alcohol, gambling, music-based entertainment, or parties.',
      'Events with immodest advertising or themes contrary to Islamic ethics.',
      'All listings are subject to manual review by our admin team.',
    ],
  },
  {
    title: '5. Account Registration',
    body:
      'Organisers must create accounts to access certain features. You agree to provide accurate and complete information and to keep your credentials confidential.',
  },
  {
    title: '6. Fees and Payment',
    body:
      'Organisers may be charged a per-ticket service fee, which can be absorbed by the Organiser or passed to the Consumer. Payments are processed via Stripe. By using the Services, you agree to the payment processor’s terms.',
  },
  {
    title: '7. Data and Privacy',
    body:
      'We collect and process personal data in accordance with our Privacy Policy. Consumers’ data may be shared with Organisers for event-related purposes, and Organisers are independently responsible for their handling of that data.',
  },
  {
    title: '8. Intellectual Property',
    body:
      'All content, branding, and software related to Halal Ticketin’ are the property of Halal Ticketin’ or its licensors. You may not reproduce or exploit our materials without permission.',
  },
  {
    title: '9. Disclaimers and Limitation of Liability',
    body:
      'Halal Ticketin’ provides the Services “as is” and disclaims all warranties. We are not liable for issues arising from events, including cancellations, conduct, or disputes between Organisers and Consumers.',
  },
  {
    title: '10. Indemnity',
    body:
      'You agree to indemnify and hold Halal Ticketin’ harmless from any claims arising from your use of the Services or violation of these Terms.',
  },
  {
    title: '11. Termination',
    body:
      'We may suspend or terminate access if you breach these Terms or for other valid reasons. We reserve the right to remove any content at our discretion.',
  },
  {
    title: '12. Governing Law',
    body:
      'These Terms are governed by the laws of Ireland. Disputes arising from these Terms will be subject to the exclusive jurisdiction of the Irish courts.',
  },
  {
    title: '13. Changes to Terms',
    body:
      'We may update these Terms from time to time. Continued use of the Services constitutes acceptance of the revised Terms.',
  },
  {
    title: 'Contact',
    body:
      'For questions, contact us at: info@halalticketin.com',
  },
];

export default function TermsPage() {
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
            <h1 className="font-display text-4xl font-bold mt-3">Terms and Conditions</h1>
            <p className="mt-3 text-muted-foreground">Effective Date: 18 December 2025</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Need help?{' '}
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
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

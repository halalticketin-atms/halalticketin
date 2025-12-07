'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';

const sections = [
  {
    title: '1. Introduction',
    body:
      'This Cookie Policy explains how Halal Ticketin’ (“we”, “us”, or “our”) uses cookies and similar technologies when you visit our website or use our services. It describes what cookies are, why we use them, and your rights to control their use.',
  },
  {
    title: '2. What Are Cookies?',
    body:
      'Cookies are small data files stored on your device (computer, smartphone, tablet) when you visit a website. They help the website recognize your device and remember information about your visit.',
  },
  {
    title: '3. Types of Cookies We Use',
    body: [
      'Strictly Necessary Cookies: Required for the operation of our website (e.g., log-in, security).',
      'Performance Cookies: Collect anonymized data on how users interact with our website to improve performance (e.g., Google Analytics, if implemented).',
      'Functionality Cookies: Remember user preferences to enhance user experience.',
      'Third-Party Cookies: Set by third-party services (e.g., Stripe) to facilitate payment or embedded services.',
    ],
  },
  {
    title: '4. Why We Use Cookies',
    body: [
      'Maintain secure login sessions.',
      'Facilitate secure payments through third-party processors (e.g., Stripe).',
      'Analyze website usage and performance (if analytics are used).',
      'Enhance site functionality and user experience.',
    ],
  },
  {
    title: '5. Your Choices',
    body:
      'You can manage or disable cookies through your browser settings. However, disabling certain cookies may affect the functionality of our services. You can also opt out of certain third-party cookies directly via their privacy settings.',
  },
  {
    title: '6. Consent',
    body:
      'Where required by law, we request your consent before placing cookies (e.g., through a cookie banner or preferences tool).',
  },
  {
    title: '7. Updates to This Policy',
    body:
      'We may update this Cookie Policy from time to time. Any changes will be posted on this page with a revised effective date.',
  },
  {
    title: '8. Contact Us',
    body:
      'If you have any questions about our use of cookies, please contact us at: [Insert Email Address]',
  },
];

export default function CookiePolicyPage() {
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
            <h1 className="font-display text-4xl font-bold mt-3">Cookie Policy</h1>
            <p className="mt-3 text-muted-foreground">
              Effective Date: [Insert Date]
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Need more details?{' '}
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

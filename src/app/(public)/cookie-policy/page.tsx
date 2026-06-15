'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import {
    BROWSER_STORAGE_ITEMS,
    FIRST_PARTY_COOKIES,
    OPTIONAL_TECHNOLOGIES,
    getConsentCategory,
} from '@/lib/consent-inventory';

type Section = {
    title: string;
    content: ReactNode;
};

const essentialCategory = getConsentCategory('essential');
const analyticsCategory = getConsentCategory('analytics');
const marketingCategory = getConsentCategory('marketing');
const essentialBrowserStorage = BROWSER_STORAGE_ITEMS.filter((item) => item.categoryId === 'essential');
const effectiveDate = '14 June 2026';

const sections: Section[] = [
    {
        title: '1. Storage categories we use',
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p>{essentialCategory?.description ?? "Essential storage keeps Halal Ticketin' working across visits."}</p>
                <p>{analyticsCategory?.description ?? 'Analytics storage only runs after you opt in.'}</p>
                <p>{marketingCategory?.description ?? 'Marketing storage only runs after you opt in.'}</p>
            </div>
        )
    },
    {
        title: '2. Our first-party cookie',
        content: (
            <ul className="space-y-4">
                {FIRST_PARTY_COOKIES.map((cookie) => (
                    <li key={cookie.name} className="rounded-lg border p-4">
                        <p className="font-medium">{cookie.name}</p>
                        <p className="text-sm text-muted-foreground">{cookie.purpose}</p>
                        <p className="text-xs text-muted-foreground mt-1">Retention: {cookie.retention}</p>
                    </li>
                ))}
                {FIRST_PARTY_COOKIES.length === 0 && (
                    <li className="text-sm text-muted-foreground">We do not set any first-party cookies.</li>
                )}
            </ul>
        )
    },
    {
        title: '3. Essential browser storage (non-cookie)',
        content: (
            <ul className="space-y-4">
                {essentialBrowserStorage.map((item) => (
                    <li key={item.key} className="rounded-lg border p-4">
                        <p className="font-medium">
                            {item.storage} — {item.key}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.purpose}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.retention}</p>
                    </li>
                ))}
            </ul>
        )
    },
    {
        title: '4. Optional analytics and marketing technology',
        content: (
            <ul className="space-y-4">
                {OPTIONAL_TECHNOLOGIES.map((tech) => (
                    <li key={tech.name} className="rounded-lg border p-4">
                        <p className="font-medium">{tech.name}</p>
                        <p className="text-sm text-muted-foreground">{tech.purpose}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Provider: {tech.provider} &middot; Host: {tech.host}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Cookies placed: {tech.cookies.join(', ')} &middot; {tech.runsWhen}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Category: {getConsentCategory(tech.categoryId)?.label ?? tech.categoryId}
                        </p>
                    </li>
                ))}
                {OPTIONAL_TECHNOLOGIES.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                        We are not loading any optional analytics or marketing scripts right now.
                    </li>
                )}
            </ul>
        )
    },
    {
        title: '5. Your choices',
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p>
                    You can change analytics and marketing storage at any time using the “Manage cookies” control in
                    our site footer. In embedded event/checkout views, the same controls are available in the cookie
                    banner.
                </p>
                <p>
                    Choosing “Reject optional” keeps Halal Ticketin running but stops optional analytics and marketing
                    tracking. Clearing cookies or browser storage in your browser settings will also sign you out and
                    reset cached data described above.
                </p>
            </div>
        )
    },
    {
        title: '6. Legal basis',
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p>
                    For EEA users, optional cookies and similar technologies are managed under the ePrivacy rules and
                    GDPR consent standards. Essential storage is always on because it is necessary to provide requested
                    services and secure key account flows.
                </p>
                <p>
                    If you are in regions such as California where ad-related identifiers can be treated as
                    data-sharing for advertising, you can keep optional marketing storage disabled at any time through
                    our cookie controls. Analytics storage is separately controlled and can also stay disabled.
                </p>
            </div>
        )
    },
    {
        title: '7. Updates & contact',
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p>We update this policy whenever our storage inventory changes and will note the new effective date.</p>
                <p>
                    Questions? Email us at info@halalticketin.com or{' '}
                    <Link href="/contact" className="text-primary underline">
                        contact support
                    </Link>
                    .
                </p>
            </div>
        )
    }
];

export default function CookiePolicyPage() {
    return (
        <div className="min-h-screen bg-muted/30">
            <div className="border-b bg-background">
                <div className="container py-10 text-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">Halal Ticketin’</p>
                        <h1 className="font-display text-4xl font-bold mt-3">Cookie Policy</h1>
                        <p className="mt-3 text-muted-foreground">Effective Date: {effectiveDate}</p>
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
                                    <div>{section.content}</div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

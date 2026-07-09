'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
    CalendarCheck,
    ChevronDown,
    CreditCard,
    Mail,
    ReceiptText,
    Search,
    Ticket,
    X,
} from 'lucide-react';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const inlineLinkClassName =
    'font-medium text-[var(--brand-teal)] underline underline-offset-2 transition-colors hover:text-[var(--brand-cyan)]';

type FaqItem = {
    id: string;
    question: string;
    answer: ReactNode;
    /** Plain-text copy of the answer plus extra keywords, used only for search. */
    search: string;
};

type FaqSection = {
    id: string;
    title: string;
    icon: typeof Ticket;
    items: FaqItem[];
};

const FAQ_SECTIONS: FaqSection[] = [
    {
        id: 'tickets',
        title: 'Your tickets',
        icon: Ticket,
        items: [
            {
                id: 'where-are-my-tickets',
                question: 'Where are my tickets?',
                answer: (
                    <>
                        Your tickets are emailed to you straight after purchase, in a confirmation
                        email with a QR code for each ticket. They also appear on the order
                        confirmation screen right after checkout, where you can download the QR
                        codes.
                    </>
                ),
                search:
                    'tickets emailed confirmation email qr code download order confirmation find my tickets lost',
            },
            {
                id: 'no-confirmation-email',
                question: "I haven't received my confirmation email",
                answer: (
                    <>
                        First, check your spam or junk folder and make sure you&rsquo;re looking in
                        the inbox for the email address you entered at checkout. If it&rsquo;s still
                        missing, contact the event organiser using the{' '}
                        <span className="font-medium text-foreground">Contact organiser</span>{' '}
                        button on the event page. They can look up your order and resend your
                        confirmation.
                    </>
                ),
                search:
                    'missing confirmation email spam junk folder resend tickets not received didnt arrive',
            },
            {
                id: 'phone-entry',
                question: 'Do I need to print my ticket?',
                answer: (
                    <>
                        No. Showing the QR code on your phone at the door is all you need. Each QR
                        code is scanned once at check-in, so have your confirmation email or
                        downloaded QR codes ready.
                    </>
                ),
                search: 'print ticket paper phone qr code entry door check in scan',
            },
            {
                id: 'tickets-for-others',
                question: 'I bought tickets for friends or family. How does entry work?',
                answer: (
                    <>
                        All the tickets from your order arrive in one confirmation email, each with
                        its own QR code. You can forward the email or send each person their QR
                        code, and everyone is scanned in individually.
                    </>
                ),
                search: 'multiple tickets group friends family forward share entry separate qr codes',
            },
        ],
    },
    {
        id: 'refunds',
        title: 'Refunds & cancellations',
        icon: ReceiptText,
        items: [
            {
                id: 'request-refund',
                question: 'How do I request a refund?',
                answer: (
                    <>
                        Refunds are handled by the event organiser, in line with the refund policy
                        they set for their event. The fastest route is the{' '}
                        <span className="font-medium text-foreground">Contact organiser</span>{' '}
                        button on the event page; their contact details are also in your
                        confirmation email. Include your order number so they can find your booking
                        quickly.
                    </>
                ),
                search: 'refund request money back cancel my ticket order number contact organiser',
            },
            {
                id: 'what-is-refunded',
                question: 'What does a refund cover?',
                answer: (
                    <>
                        That depends on the organiser&rsquo;s refund policy. Unless stated
                        otherwise, refunds cover the ticket price only; platform and payment
                        processing fees are non-refundable. See our{' '}
                        <Link href="/terms" className={inlineLinkClassName}>
                            Terms &amp; Conditions
                        </Link>{' '}
                        for the full details.
                    </>
                ),
                search: 'refund amount fees non-refundable ticket price partial booking fee terms',
            },
            {
                id: 'event-cancelled',
                question: 'The event was cancelled or postponed. What happens now?',
                answer: (
                    <>
                        The organiser is responsible for letting ticket holders know and arranging
                        refunds or transfers to a new date. If you haven&rsquo;t heard anything,
                        reach out to them first, and if you can&rsquo;t get a response,{' '}
                        <Link href="/contact" className={inlineLinkClassName}>
                            contact us
                        </Link>{' '}
                        and we&rsquo;ll help.
                    </>
                ),
                search: 'event cancelled postponed rescheduled new date refund transfer',
            },
            {
                id: 'organiser-not-responding',
                question: "The organiser isn't responding. Can you help?",
                answer: (
                    <>
                        Yes. Give the organiser a reasonable window to reply first, as they handle
                        refunds and ticket questions directly. If you&rsquo;re still stuck,{' '}
                        <Link href="/contact" className={inlineLinkClassName}>
                            send us a message
                        </Link>{' '}
                        with your order number and the event name, and we&rsquo;ll step in to
                        resolve it.
                    </>
                ),
                search: 'organiser not responding no reply ignored escalate help dispute complaint refund tickets',
            },
        ],
    },
    {
        id: 'payments',
        title: 'Payments & checkout',
        icon: CreditCard,
        items: [
            {
                id: 'payment-security',
                question: 'Is my payment secure?',
                answer: (
                    <>
                        Yes. All payments are processed by Stripe, a leading payment provider used
                        by millions of businesses. Your card details go directly to Stripe and are
                        never stored on our servers.
                    </>
                ),
                search: 'payment secure safe stripe card details stored security pay',
            },
            {
                id: 'promo-codes',
                question: "My promo code isn't working",
                answer: (
                    <>
                        Promo codes are created by organisers and can expire or have a limited
                        number of uses. Check the spelling first, and if it still doesn&rsquo;t
                        apply, contact the organiser to confirm the code is still active.
                    </>
                ),
                search: 'promo code discount voucher coupon not working invalid expired',
            },
            {
                id: 'charged-no-tickets',
                question: 'I was charged but have no tickets',
                answer: (
                    <>
                        Occasionally a confirmation email is delayed or lands in spam, so check
                        there first. If there&rsquo;s genuinely no order confirmation,{' '}
                        <Link href="/contact" className={inlineLinkClassName}>
                            contact us
                        </Link>{' '}
                        with the email address you used and the approximate time of payment, and
                        we&rsquo;ll track it down.
                    </>
                ),
                search: 'charged no tickets payment taken money missing order failed double charge',
            },
        ],
    },
    {
        id: 'organisers',
        title: 'For organisers',
        icon: CalendarCheck,
        items: [
            {
                id: 'organiser-cost',
                question: 'How much does it cost to sell tickets?',
                answer: (
                    <>
                        Creating an event is free, and free tickets stay free. For paid tickets we
                        charge a small fee per ticket sold. See the full breakdown on our{' '}
                        <Link href="/pricing" className={inlineLinkClassName}>
                            pricing page
                        </Link>
                        .
                    </>
                ),
                search: 'cost fees pricing sell tickets commission charge organiser free',
            },
            {
                id: 'organiser-payouts',
                question: 'How and when do I get paid?',
                answer: (
                    <>
                        Payouts go through Stripe. You connect your own Stripe account during
                        onboarding, and ticket revenue is paid out to your bank account on
                        Stripe&rsquo;s payout schedule.
                    </>
                ),
                search: 'payout paid bank account stripe connect money revenue when',
            },
            {
                id: 'organiser-check-in',
                question: 'How do I check people in at the door?',
                answer: (
                    <>
                        Use the free HalalTicketin&rsquo; organiser app on the App Store to scan
                        ticket QR codes at the door. You can also search orders by name and check
                        people in manually if they can&rsquo;t find their ticket.
                    </>
                ),
                search: 'check in scan qr code door entry app organiser manual search orders',
            },
        ],
    },
];

function normalize(text: string): string {
    return text.toLowerCase().replace(/['’]/g, '');
}

export default function FaqPageClient() {
    const [query, setQuery] = useState('');
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());
    const prefersReducedMotion = useReducedMotion();

    const trimmedQuery = normalize(query.trim());
    const isSearching = trimmedQuery.length > 0;

    const visibleSections = useMemo(() => {
        if (!isSearching) return FAQ_SECTIONS;
        const terms = trimmedQuery.split(/\s+/);
        return FAQ_SECTIONS.map((section) => ({
            ...section,
            items: section.items.filter((item) => {
                const haystack = normalize(`${item.question} ${item.search}`);
                return terms.every((term) => haystack.includes(term));
            }),
        })).filter((section) => section.items.length > 0);
    }, [isSearching, trimmedQuery]);

    const resultCount = isSearching
        ? visibleSections.reduce((total, section) => total + section.items.length, 0)
        : 0;

    const toggleItem = (id: string) => {
        setOpenItems((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const isItemOpen = (id: string) => isSearching || openItems.has(id);

    const expandTransition = prefersReducedMotion
        ? { duration: 0 }
        : {
              height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
              opacity: { duration: 0.2, ease: 'easeOut' as const },
          };

    return (
        <div className="relative min-h-screen w-full overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] pt-[calc(var(--nav-safe-offset)+3rem)] pb-16 md:pt-[calc(var(--nav-safe-offset)+4.5rem)] md:pb-24">
            <div className="hidden md:block">
                <AmbientBackground showNoise={false} />
            </div>

            <div className="container relative z-10 mx-auto max-w-3xl">
                {/* Hero: title + search, the way people actually arrive here */}
                <header className="animate-fade-up text-center">
                    <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                        Frequently asked{' '}
                        <span className="text-gradient">questions</span>
                    </h1>
                    <div className="relative mx-auto mt-8 max-w-xl">
                        <Search
                            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search, e.g. refund or gift ticket"
                            aria-label="Search frequently asked questions"
                            className="h-13 rounded-2xl border-slate-200/80 bg-white/85 pl-12 pr-11 text-base shadow-sm transition-[color,box-shadow,border-color] focus-visible:border-[var(--brand-teal)] focus-visible:ring-[var(--brand-teal)]/20 md:backdrop-blur-sm [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    <p className="mt-3 min-h-5 text-sm text-muted-foreground" aria-live="polite">
                        {isSearching
                            ? `${resultCount} ${resultCount === 1 ? 'answer' : 'answers'} found`
                            : ''}
                    </p>
                </header>

                {/* Q&A sections */}
                <div className="animate-fade-up mt-8 space-y-10 md:mt-10">
                    {visibleSections.map((section) => (
                        <section key={section.id} aria-labelledby={`faq-${section.id}`}>
                            <div className="mb-3 flex items-center gap-2.5 px-1">
                                <section.icon
                                    className="h-4.5 w-4.5 text-[var(--brand-teal)]"
                                    aria-hidden="true"
                                />
                                <h2
                                    id={`faq-${section.id}`}
                                    className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                                >
                                    {section.title}
                                </h2>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-white/60 ring-1 ring-white/50 glass-surface shadow-[0_2px_8px_-2px_oklch(0.65_0.12_190_/_0.12),0_16px_50px_-24px_oklch(0.65_0.12_190_/_0.3)]">
                                {section.items.map((item, index) => {
                                    const open = isItemOpen(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            className={
                                                index > 0
                                                    ? 'border-t border-slate-200/60'
                                                    : undefined
                                            }
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleItem(item.id)}
                                                aria-expanded={open}
                                                aria-controls={`faq-answer-${item.id}`}
                                                className="flex min-h-[44px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-teal)]/40 md:px-6"
                                            >
                                                <span className="text-[15px] font-medium leading-snug text-foreground md:text-base">
                                                    {item.question}
                                                </span>
                                                <ChevronDown
                                                    className={`h-4.5 w-4.5 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                            <AnimatePresence initial={false}>
                                                {open && (
                                                    <motion.div
                                                        id={`faq-answer-${item.id}`}
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={expandTransition}
                                                        className="overflow-hidden"
                                                    >
                                                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground md:px-6 md:text-[15px]">
                                                            {item.answer}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}

                    {isSearching && visibleSections.length === 0 && (
                        <div className="rounded-2xl border border-white/60 ring-1 ring-white/50 glass-surface px-6 py-12 text-center">
                            <p className="font-medium text-foreground">
                                No answers match &ldquo;{query.trim()}&rdquo;
                            </p>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                                Try a different word, or send us your question directly and
                                we&rsquo;ll get back to you.
                            </p>
                            <Button asChild className="mt-5 rounded-xl">
                                <Link href="/contact">
                                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Contact us
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Escalation: still stuck */}
                <div className="animate-fade-up mt-12 rounded-2xl border border-primary/10 bg-primary/5 px-6 py-6 md:mt-16 md:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="font-display text-base font-semibold text-foreground">
                                Still need help?
                            </h2>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                For a specific booking, contact the event organiser first. For
                                anything else, or if you&rsquo;re not getting a response, we&rsquo;re
                                here.
                            </p>
                        </div>
                        <Button asChild className="shrink-0">
                            <Link href="/contact">
                                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                                Contact us
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

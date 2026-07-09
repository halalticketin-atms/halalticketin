'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { FAQ_SECTIONS } from '@/lib/faq-data';

// Plain string so the Tailwind scanner picks the utility up (it misses
// candidates embedded at the start of template literals).
const faqItemScrollClassName = 'scroll-mt-[calc(var(--nav-safe-offset)+1rem)]';

const inlineLinkClassName =
    'font-medium text-[var(--brand-teal)] underline underline-offset-2 transition-colors hover:text-[var(--brand-cyan)]';

const SECTION_ICONS: Record<string, typeof Ticket> = {
    tickets: Ticket,
    refunds: ReceiptText,
    payments: CreditCard,
    organisers: CalendarCheck,
};

/** Renders the minimal markdown subset used in faq-data answers: [text](href) and **bold**. */
function renderAnswer(answer: string): ReactNode {
    const parts = answer.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
            return (
                <Link key={index} href={link[2]} className={inlineLinkClassName}>
                    {link[1]}
                </Link>
            );
        }
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) {
            return (
                <span key={index} className="font-medium text-foreground">
                    {bold[1]}
                </span>
            );
        }
        return part;
    });
}


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

    // Deep links: /faq#<item-id> opens that question and scrolls to it.
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (!id) return;
        const exists = FAQ_SECTIONS.some((section) =>
            section.items.some((item) => item.id === id)
        );
        if (!exists) return;
        const frame = requestAnimationFrame(() => {
            setOpenItems((current) => new Set(current).add(id));
        });
        // Scroll after Next's own hash scroll and the 0.6s fade-up entrance
        // settle. Explicit scrollTo because scrollIntoView loses the
        // scroll-margin offset inside the page's overflow-hidden wrapper.
        const timeout = window.setTimeout(() => {
            const el = document.getElementById(id);
            if (!el) return;
            const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
            window.scrollTo({
                top: el.getBoundingClientRect().top + window.scrollY - margin,
                behavior: 'smooth',
            });
        }, 650);
        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(timeout);
        };
    }, []);

    const handleToggle = (id: string) => {
        const willOpen = !openItems.has(id);
        toggleItem(id);
        // Keep the URL shareable without adding history entries or scrolling.
        const nextUrl = willOpen
            ? `#${id}`
            : window.location.pathname + window.location.search;
        window.history.replaceState(null, '', nextUrl);
    };

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
                    {visibleSections.map((section) => {
                        const SectionIcon = SECTION_ICONS[section.id] ?? Ticket;
                        return (
                        <section key={section.id} aria-labelledby={`faq-${section.id}`}>
                            <div className="mb-3 flex items-center gap-2.5 px-1">
                                <SectionIcon
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
                                            id={item.id}
                                            className={`${faqItemScrollClassName}${
                                                index > 0
                                                    ? ' border-t border-slate-200/60'
                                                    : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleToggle(item.id)}
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
                                                            {renderAnswer(item.answer)}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                        );
                    })}

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

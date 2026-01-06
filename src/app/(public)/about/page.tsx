'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, HandHeart, Landmark, ShieldCheck } from 'lucide-react';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const VALUES = [
    {
        icon: Landmark,
        label: 'Community-led',
        description: 'Community infrastructure we can rely on. Resilient by design.',
    },
    {
        icon: ShieldCheck,
        label: 'Halal-first',
        description: 'Events aligned with Islamic values. No alcohol, no party culture.',
    },
    {
        icon: HandHeart,
        label: 'Ecosystem',
        description: 'By Muslims, for the Muslim economy. Supporting the Ummah.',
    },
];

const STORY_POINTS = [
    'During the boycotts and the heartbreak in Gaza and Palestine, it became painfully clear how much our community relies on third‑party platforms.',
    'A group of young Muslims came together to build a space that reflects our values.',
    'Halal-friendly events, all in one place: clean, transparent discovery and ticketing.',
    "We're building for the long term with the community at the centre.",
];

export default function AboutPage() {
    return (
        <div className="min-h-screen w-full relative overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] pt-[calc(var(--nav-safe-offset)+4rem)] pb-16 md:pb-24">
            <div className="hidden md:block">
                <AmbientBackground />
            </div>

            {/* Soft organic curve decorations */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                {/* Top flowing curve */}
                <div
                    className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-40"
                    style={{
                        background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, rgba(6,182,212,0.08) 50%, transparent 70%)',
                    }}
                />
                {/* Bottom flowing curve */}
                <div
                    className="absolute -bottom-48 -left-32 w-[500px] h-[500px] rounded-full opacity-30"
                    style={{
                        background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, rgba(20,184,166,0.06) 50%, transparent 70%)',
                    }}
                />
            </div>

            <div className="container relative z-10 max-w-6xl mx-auto">
                {/* Hero Section - Centered, organic flow */}
                <header className="text-center mb-16 md:mb-24 animate-fade-up">
                    <Badge
                        variant="secondary"
                        className="mb-6 px-5 py-2.5 text-sm font-medium border border-white/50 rounded-full shadow-sm"
                    >
                        Built by Muslims, for halal-friendly gatherings
                    </Badge>

                    <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                        A home for events that{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)]">
                            respect our values
                        </span>
                        .
                    </h1>

                    <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg leading-relaxed text-slate-700/90">
                        dependent on platforms that don&apos;t share our values. We wanted a Muslim space:
                        clean, trustworthy, and built for the Ummah.
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Button asChild size="lg" className="rounded-full font-bold px-8">
                            <Link href="/events/new">
                                Create an event <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                            <Link href="/events">Browse events</Link>
                        </Button>
                    </div>
                </header>

                {/* Values Section - 3 column grid on desktop */}
                <section className="mb-16 md:mb-24 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-center font-display text-2xl md:text-3xl font-bold text-slate-900 mb-10">
                        What we stand for
                    </h2>

                    <div className="grid gap-5 md:gap-6 md:grid-cols-3">
                        {VALUES.map((value) => (
                            <div
                                key={value.label}
                                className="flex flex-col items-center text-center p-6 md:p-8 rounded-[2rem] border border-white/60 shadow-md bg-gradient-to-br from-white/80 to-white/50 backdrop-blur-sm transition-all hover:shadow-lg hover:scale-[1.02]"
                            >
                                <span className="h-14 w-14 rounded-full bg-gradient-to-br from-[var(--brand-mint)]/30 to-[var(--brand-cyan)]/20 flex items-center justify-center ring-1 ring-white/70 shadow-sm mb-5">
                                    <value.icon className="h-6 w-6 text-[var(--brand-teal)]" />
                                </span>
                                <div className="font-display text-xl font-bold text-slate-900 mb-2">
                                    {value.label}
                                </div>
                                <p className="text-sm md:text-base text-slate-700/90 leading-relaxed">
                                    {value.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Story + CTA Section - Two columns on large screens */}
                <section className="animate-fade-up grid gap-8 lg:grid-cols-2" style={{ animationDelay: '0.2s' }}>
                    {/* Story Section */}
                    <div
                        className="relative rounded-[2.5rem] p-8 md:p-10 overflow-hidden h-full"
                        style={{
                            background: 'linear-gradient(135deg, rgba(240,253,250,0.9) 0%, rgba(236,254,255,0.7) 50%, rgba(255,255,255,0.8) 100%)',
                        }}
                    >
                        {/* Soft decorative blob */}
                        <div
                            aria-hidden="true"
                            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30"
                            style={{
                                background: 'radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 60%)',
                            }}
                        />

                        <h2 className="relative font-display text-2xl md:text-3xl font-bold text-slate-900 mb-6">
                            Why we started
                        </h2>

                        <div className="relative space-y-4">
                            {STORY_POINTS.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <span className="flex-shrink-0 mt-1 h-6 w-6 rounded-full bg-white/80 shadow-sm flex items-center justify-center ring-1 ring-[var(--brand-mint)]/30">
                                        <CheckCircle2 className="h-4 w-4 text-[var(--brand-teal)]" />
                                    </span>
                                    <p className="text-slate-700/90 leading-relaxed">{point}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="relative rounded-[2.5rem] p-8 md:p-10 overflow-hidden bg-gradient-to-br from-white/90 to-[var(--brand-mint)]/10 border border-white/60 shadow-xl flex flex-col justify-center">
                        {/* Decorative curve */}
                        <div
                            aria-hidden="true"
                            className="absolute bottom-0 left-0 w-full h-32 opacity-20"
                            style={{
                                background: 'linear-gradient(180deg, transparent 0%, rgba(20,184,166,0.15) 100%)',
                                borderRadius: '0 0 2.5rem 2.5rem',
                            }}
                        />

                        <div className="relative">
                            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-600 mb-3">
                                Ready to host?
                            </div>
                            <h3 className="font-display text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">
                                Bring your next event to a platform built for the Ummah.
                            </h3>
                            <p className="text-slate-700/90 mb-8">
                                Create, sell, and manage tickets with a clean experience that puts trust
                                first, for organisers and attendees.
                            </p>

                            <div className="flex flex-col gap-3">
                                <Button asChild size="lg" className="rounded-full font-bold">
                                    <Link href="/events/new">
                                        Create event <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <div className="flex gap-3">
                                    <Button asChild size="lg" variant="outline" className="rounded-full flex-1">
                                        <Link href="/pricing">See pricing</Link>
                                    </Button>
                                    <Button asChild size="lg" variant="ghost" className="rounded-full flex-1">
                                        <Link href="/contact">Talk to us</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div >
    );
}

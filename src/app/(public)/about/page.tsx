'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
    ArrowRight,
    CheckCircle2,
    HandHeart,
    Landmark,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FadeStyle = CSSProperties & { '--fade-delay'?: string };
const fadeStyle = (delay: string): FadeStyle => ({ '--fade-delay': delay });

type Pillar = {
    id: 'sovereignty' | 'halal-first' | 'ecosystem';
    label: string;
    title: string;
    summary: string;
    bullets: string[];
    Icon: typeof Landmark;
};

const PILLARS: Pillar[] = [
    {
        id: 'sovereignty',
        label: 'Sovereignty',
        title: 'Community infrastructure we can rely on.',
        summary:
            'When the world shifts, our community shouldn’t be one policy change away from losing its event spaces.',
        bullets: [
            'Built for Muslim organisers, not “edgy nightlife”.',
            'Resilient by design: our roadmap prioritises continuity and control.',
            'A platform that answers to the community it serves.',
        ],
        Icon: Landmark,
    },
    {
        id: 'halal-first',
        label: 'Halal-first',
        title: 'Events aligned with Islamic values.',
        summary:
            'We bring together gatherings that respect adab: no alcohol, no party culture, and no environments that compromise our principles.',
        bullets: [
            'Clear expectations and respectful spaces.',
            'Family-friendly by default; organisers set the tone transparently.',
            'Discovery that highlights what matters, not what trends.',
        ],
        Icon: ShieldCheck,
    },
    {
        id: 'ecosystem',
        label: 'Ecosystem',
        title: 'By Muslims, for the Muslim economy.',
        summary:
            'Halal Ticketin is a contribution to the Muslim ecosystem — helping creators, masajid, and community builders grow sustainably.',
        bullets: [
            'Make it easier for good events to get found.',
            'Support organisers with modern tools and fair pricing.',
            'Keep value circulating within the Ummah.',
        ],
        Icon: HandHeart,
    },
];

type Milestone = {
    id: 'realised' | 'built' | 'launched' | 'next';
    label: string;
    title: string;
    body: string;
};

const MILESTONES: Milestone[] = [
    {
        id: 'realised',
        label: 'The wake-up call',
        title: 'We realised how dependent we were.',
        body:
            'During the boycotts and the heartbreak in Gaza and Palestine, it became painfully clear how much our community relies on third‑party platforms. If they de‑platform us — or simply change the rules — our events disappear.',
    },
    {
        id: 'built',
        label: 'The response',
        title: 'So we built our own home.',
        body:
            'A group of young Muslims came together to create a space that reflects our values. Not a “Muslim category” on someone else’s platform — a product designed for our needs from day one.',
    },
    {
        id: 'launched',
        label: 'The promise',
        title: 'Halal-friendly events, all in one place.',
        body:
            'No alcohol. No party culture. No free-mixing environments pushed as the default. Just clean, transparent discovery and ticketing for gatherings that uplift the community.',
    },
    {
        id: 'next',
        label: 'What’s next',
        title: 'A platform the community can grow with.',
        body:
            'We’re building for the long term: better discovery, better organiser tooling, and a trustworthy standard for halal-friendly event experiences — with the community at the centre.',
    },
];

function SpotlightCard({
    className,
    style,
    children,
    enableSpotlight = true,
}: {
    className?: string;
    style?: CSSProperties;
    children: React.ReactNode;
    enableSpotlight?: boolean;
}) {
    const [spotlight, setSpotlight] = useState({ x: 0, y: 0, active: false });
    const isSpotlightActive = enableSpotlight && spotlight.active;
    const mergedStyle = enableSpotlight
        ? ({
            '--x': `${spotlight.x}px`,
            '--y': `${spotlight.y}px`,
            ...style,
        } as CSSProperties)
        : style;

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-[2rem] glass-surface md:backdrop-blur-2xl shadow-xl ring-1 ring-white/60',
                'before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300',
                'before:bg-[radial-gradient(600px_circle_at_var(--x)_var(--y),rgba(6,182,212,0.18),transparent_42%)]',
                isSpotlightActive ? 'before:opacity-100' : 'before:opacity-0',
                className
            )}
            style={mergedStyle}
            onPointerEnter={
                enableSpotlight ? () => setSpotlight((s) => ({ ...s, active: true })) : undefined
            }
            onPointerLeave={
                enableSpotlight ? () => setSpotlight((s) => ({ ...s, active: false })) : undefined
            }
            onPointerMove={
                enableSpotlight
                    ? (e) => {
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        setSpotlight({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true });
                    }
                    : undefined
            }
        >
            <div className="relative">{children}</div>
        </div>
    );
}

export default function AboutPage() {
    const prefersReducedMotion = useReducedMotion();
    const [isMobile, setIsMobile] = useState(false);
    const [hasFinePointer, setHasFinePointer] = useState(false);
    const [activePillarId, setActivePillarId] = useState<Pillar['id']>('sovereignty');
    const [activeMilestoneId, setActiveMilestoneId] = useState<Milestone['id']>('realised');
    const motionEase: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];
    const reduceMotion = prefersReducedMotion || isMobile;
    const enableSpotlight = hasFinePointer && !reduceMotion;
    const fadeUpClass = (baseClassName: string) =>
        cn(baseClassName, !reduceMotion && 'animate-fade-up');
    const fadeUpStyle = (delay: string): CSSProperties | undefined =>
        reduceMotion ? undefined : fadeStyle(delay);
    const panelMotion = reduceMotion
        ? {
            initial: { opacity: 1, y: 0 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 1, y: 0 },
            transition: { duration: 0 },
        }
        : {
            initial: { opacity: 0, y: 12 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -12 },
            transition: { duration: 0.35, ease: motionEase },
        };
    const cardMotion = (idx: number) => ({
        initial: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-100px' },
        transition: reduceMotion
            ? { duration: 0 }
            : { duration: 0.45, delay: idx * 0.05, ease: motionEase },
    });
    const belowFoldStyle = {
        contentVisibility: 'auto',
        containIntrinsicSize: '1000px',
    } as CSSProperties;

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const updateMobile = () => setIsMobile(mediaQuery.matches);
        updateMobile();
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', updateMobile);
            return () => mediaQuery.removeEventListener('change', updateMobile);
        }
        mediaQuery.addListener(updateMobile);
        return () => mediaQuery.removeListener(updateMobile);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
        const updatePointer = () => setHasFinePointer(mediaQuery.matches);
        updatePointer();
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', updatePointer);
            return () => mediaQuery.removeEventListener('change', updatePointer);
        }
        mediaQuery.addListener(updatePointer);
        return () => mediaQuery.removeListener(updatePointer);
    }, []);

    const activePillar = useMemo(
        () => PILLARS.find((p) => p.id === activePillarId) ?? PILLARS[0],
        [activePillarId]
    );

    const activeMilestone = useMemo(
        () => MILESTONES.find((m) => m.id === activeMilestoneId) ?? MILESTONES[0],
        [activeMilestoneId]
    );

    return (
        <div className="min-h-screen w-full relative overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] pt-[calc(var(--nav-safe-offset)+4rem)] pb-16 md:pb-24">
            <div className="hidden md:block">
                <AmbientBackground />
            </div>

            {/* Decorative grid + aura */}
            <div
                aria-hidden="true"
                className={cn(
                    'pointer-events-none absolute inset-0 opacity-50',
                    '[mask-image:radial-gradient(ellipse_at_top,black_45%,transparent_70%)]'
                )}
            >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.07)_1px,transparent_1px)] bg-[size:56px_56px]" />
                <motion.div
                    className="absolute -inset-24 blur-3xl mix-blend-multiply hidden md:block"
                    style={{
                        background:
                            'conic-gradient(from 160deg at 50% 50%, rgba(34,197,94,0.12), rgba(6,182,212,0.14), rgba(20,184,166,0.12), rgba(34,197,94,0.12))',
                    }}
                    animate={
                        prefersReducedMotion
                            ? undefined
                            : {
                                rotate: [0, 8, 0],
                                scale: [1, 1.05, 1],
                            }
                    }
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            <div className="container relative z-10">
                {/* Hero */}
                <header className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
                    <div className="lg:col-span-7">
                        <Badge
                            variant="secondary"
                            className={fadeUpClass('mb-6 px-4 py-2 text-sm font-medium border border-border/50')}
                            style={fadeUpStyle('0s')}
                        >
                            <Sparkles className="mr-2 h-4 w-4 text-[oklch(0.8_0.16_85)]" />
                            Built by Muslims, for halal-friendly gatherings
                        </Badge>

                        <h1
                            className={fadeUpClass('font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900')}
                            style={fadeUpStyle('0.05s')}
                        >
                            A home for events that{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)]">
                                respect our values
                            </span>
                            .
                        </h1>

                        <p
                            className={fadeUpClass('mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-slate-700/90')}
                            style={fadeUpStyle('0.12s')}
                        >
                            Halal Ticketin started as a simple realisation: even our community events are
                            dependent on platforms that don’t share our values. If they decide to de‑platform
                            us, we’re at their mercy. We wanted a Muslim space — clean, trustworthy, and built
                            for the Ummah.
                        </p>

                        <div
                            className={fadeUpClass('mt-8 flex flex-col sm:flex-row gap-3')}
                            style={fadeUpStyle('0.18s')}
                        >
                            <Button asChild size="lg" className="rounded-xl font-bold">
                                <Link href="/events/new">
                                    Create an event <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="rounded-xl">
                                <Link href="/events">Browse events</Link>
                            </Button>
                        </div>

                        <ul
                            className={fadeUpClass('mt-8 grid gap-3 sm:grid-cols-3')}
                            style={fadeUpStyle('0.24s')}
                        >
                            {[
                                { label: 'Alcohol‑free focus', icon: ShieldCheck },
                                { label: 'Community-first discovery', icon: Users },
                                { label: 'Transparent organiser standards', icon: CheckCircle2 },
                            ].map(({ label, icon: Icon }) => (
                                <li
                                    key={label}
                                    className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 md:bg-white/40 md:backdrop-blur-xl px-4 py-3 shadow-sm"
                                >
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-white to-white/50 ring-1 ring-white/70">
                                        <Icon className="h-4 w-4 text-[var(--brand-teal)]" />
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">{label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-5">
                        <SpotlightCard
                            className={fadeUpClass('p-6 md:p-8')}
                            style={fadeUpStyle('0.3s')}
                            enableSpotlight={enableSpotlight}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-600">
                                        Our commitment
                                    </div>
                                    <div className="mt-2 font-display text-2xl md:text-3xl font-bold text-slate-900">
                                        Halal-first, always.
                                    </div>
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--brand-mint)]/30 to-[var(--brand-cyan)]/30 ring-1 ring-white/70 flex items-center justify-center">
                                    <ShieldCheck className="h-6 w-6 text-[var(--brand-teal)]" />
                                </div>
                            </div>

                            <p className="mt-4 text-sm md:text-[15px] leading-relaxed text-slate-700/90">
                                We’re building a standard for events that respect Islamic etiquette — not a
                                “night out” marketplace. Organisers can clearly communicate boundaries and
                                expectations, and attendees can discover with confidence.
                            </p>

                            <div className="mt-6 grid gap-3">
                                {[
                                    'No alcohol, no party-first positioning.',
                                    'Designed for masajid, students, families, and creators.',
                                    'Tools that make it easier to host with ihsan.',
                                ].map((item) => (
                                    <div key={item} className="flex items-start gap-3">
                                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/70 ring-1 ring-white/70">
                                            <CheckCircle2 className="h-4 w-4 text-[var(--brand-teal)]" />
                                        </span>
                                        <span className="text-sm text-slate-700">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </SpotlightCard>
                    </div>
                </header>

                {/* Pillars */}
                <section className="mt-16 md:mt-24" style={belowFoldStyle}>
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div className="max-w-2xl">
                            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 relative inline-block">
                                What we’re building
                                <span className="absolute -bottom-1 left-0 w-16 h-1 rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] opacity-70" />
                            </h2>
                            <p className="mt-3 text-slate-700/90 leading-relaxed">
                                A platform that feels like it was designed by people who actually attend
                                Islamic events — because it was.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 md:bg-white/40 md:backdrop-blur-xl p-2 shadow-sm">
                            {PILLARS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActivePillarId(id)}
                                    className={cn(
                                        'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                                        id === activePillarId
                                            ? 'bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-md'
                                            : 'text-slate-700 hover:bg-white/60'
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-5 space-y-4">
                            {PILLARS.map(({ id, title, summary, Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActivePillarId(id)}
                                    className={cn(
                                        'w-full text-left rounded-[1.5rem] p-5 md:p-6 transition-all border shadow-sm',
                                        'bg-white/75 md:bg-white/45 md:backdrop-blur-xl ring-1 ring-white/70',
                                        id === activePillarId
                                            ? 'border-[var(--brand-cyan)]/40 shadow-lg shadow-[var(--brand-cyan)]/10 ring-[var(--brand-cyan)]/30'
                                            : 'border-white/50 hover:shadow-md hover:border-[var(--brand-mint)]/30'
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <span
                                            className={cn(
                                                'h-11 w-11 rounded-2xl flex items-center justify-center',
                                                'bg-gradient-to-br from-white to-white/50 ring-1 ring-white/70'
                                            )}
                                        >
                                            <Icon className="h-5 w-5 text-[var(--brand-teal)]" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="font-display text-lg font-bold text-slate-900">
                                                {title}
                                            </div>
                                            <div className="mt-1 text-sm leading-relaxed text-slate-700/90">
                                                {summary}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="lg:col-span-7">
                            <div className="rounded-[2rem] glass-surface md:backdrop-blur-2xl p-6 md:p-8 shadow-xl ring-1 ring-white/60 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activePillar.id}
                                        initial={panelMotion.initial}
                                        animate={panelMotion.animate}
                                        exit={panelMotion.exit}
                                        transition={panelMotion.transition}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-600">
                                                    Pillar
                                                </div>
                                                <div className="mt-2 font-display text-2xl md:text-3xl font-bold text-slate-900">
                                                    {activePillar.title}
                                                </div>
                                            </div>
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--brand-mint)]/25 to-[var(--brand-cyan)]/25 ring-1 ring-white/70 flex items-center justify-center">
                                                <activePillar.Icon className="h-6 w-6 text-[var(--brand-teal)]" />
                                            </div>
                                        </div>

                                        <p className="mt-4 text-slate-700/90 leading-relaxed">
                                            {activePillar.summary}
                                        </p>

                                        <div className="mt-6 grid gap-3">
                                            {activePillar.bullets.map((item) => (
                                                <div key={item} className="flex items-start gap-3">
                                                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/70 ring-1 ring-white/70">
                                                        <CheckCircle2 className="h-4 w-4 text-[var(--brand-teal)]" />
                                                    </span>
                                                    <span className="text-sm text-slate-700">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Story */}
                <section className="mt-16 md:mt-24" style={belowFoldStyle}>
                    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 items-start">
                        <div className="lg:col-span-5">
                            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 relative inline-block">
                                Why we started
                                <span className="absolute -bottom-1 left-0 w-14 h-1 rounded-full bg-gradient-to-r from-[var(--brand-mint)] to-[var(--brand-cyan)] opacity-70" />
                            </h2>
                            <p className="mt-3 text-slate-700/90 leading-relaxed">
                                Halal Ticketin is our response to a fragile reality: the tools we rely on can
                                disappear overnight. We decided to build something we can stand behind — and
                                stand on.
                            </p>
                        </div>

                        <div className="lg:col-span-7 rounded-[2rem] glass-surface md:backdrop-blur-2xl shadow-xl ring-1 ring-white/60 overflow-hidden">
                            <div className="grid md:grid-cols-2">
                                <div className="border-b md:border-b-0 md:border-r border-white/30 p-5 md:p-6">
                                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-600">
                                        Timeline
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {MILESTONES.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setActiveMilestoneId(m.id)}
                                                className={cn(
                                                    'w-full text-left rounded-2xl px-4 py-3 transition-all',
                                                    'ring-1',
                                                    m.id === activeMilestoneId
                                                        ? 'bg-white/80 shadow-md ring-[var(--brand-cyan)]/40 border-l-2 border-[var(--brand-teal)]'
                                                        : 'ring-white/50 bg-white/50 hover:bg-white/70 hover:ring-[var(--brand-mint)]/30'
                                                )}
                                            >
                                                <div className="text-sm font-bold text-slate-900">{m.label}</div>
                                                <div className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                                                    {m.title}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 md:p-7">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeMilestone.id}
                                            initial={panelMotion.initial}
                                            animate={panelMotion.animate}
                                            exit={panelMotion.exit}
                                            transition={panelMotion.transition}
                                        >
                                            <div className="font-display text-2xl font-bold text-slate-900">
                                                {activeMilestone.title}
                                            </div>
                                            <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-slate-700/90">
                                                {activeMilestone.body}
                                            </p>

                                            <div className="mt-6 rounded-2xl border border-[var(--brand-mint)]/30 bg-gradient-to-br from-white/60 to-[var(--brand-mint)]/5 p-4">
                                                <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-600">
                                                    In practice
                                                </div>
                                                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                                    {[
                                                        'Clear event guidelines and expectations.',
                                                        'A discovery experience that prioritises trust.',
                                                        'Tools to help organisers run events smoothly.',
                                                    ].map((item) => (
                                                        <li key={item} className="flex items-start gap-2">
                                                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--brand-teal)]" />
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ + CTA */}
                <section className="mt-16 md:mt-24 grid gap-8 lg:grid-cols-12 lg:gap-10 items-start" style={belowFoldStyle}>
                    <div className="lg:col-span-5">
                        <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 relative inline-block">
                            Questions
                            <span className="absolute -bottom-1 left-0 w-12 h-1 rounded-full bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-mint)] opacity-70" />
                        </h2>
                        <p className="mt-3 text-slate-700/90 leading-relaxed">
                            A few quick answers — and if you’re building something beautiful for the community,
                            we’d love to host you.
                        </p>

                        <div className="mt-6 space-y-3">
                            {[
                                {
                                    q: 'Is Halal Ticketin only for “big” events?',
                                    a: 'Not at all — community iftars, workshops, halaqahs, conferences, charity dinners, student society events… if it’s halal-friendly, it belongs here.',
                                },
                                {
                                    q: 'How do you define “halal-friendly”?',
                                    a: 'We focus on events that avoid alcohol and party-first positioning, and that respect Islamic etiquette. Organisers can describe their standards clearly so attendees can decide with confidence.',
                                },
                                {
                                    q: 'Can my masjid or organisation use this?',
                                    a: 'Yes. We’re building with masajid and community organisations in mind — simple setup, clean checkout, and tools to manage attendees.',
                                },
                            ].map(({ q, a }) => (
                                <details
                                    key={q}
                                    className="group rounded-2xl border border-white/60 bg-white/70 md:bg-white/40 md:backdrop-blur-xl shadow-sm p-5"
                                >
                                    <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-center justify-between gap-3">
                                        <span>{q}</span>
                                        <span className="text-[var(--brand-teal)] font-bold text-lg transition-transform duration-300 group-open:rotate-45">
                                            +
                                        </span>
                                    </summary>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-700/90">{a}</p>
                                </details>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        <SpotlightCard className="p-7 md:p-10" enableSpotlight={enableSpotlight}>
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                                <div className="max-w-xl">
                                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-600">
                                        Ready to host?
                                    </div>
                                    <h3 className="mt-2 font-display text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                                        Bring your next event to a platform built for the Ummah.
                                    </h3>
                                    <p className="mt-4 text-slate-700/90 leading-relaxed">
                                        Create, sell, and manage tickets with a clean experience that puts trust
                                        first — for organisers and attendees.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 md:min-w-[220px]">
                                    <Button asChild size="lg" className="rounded-xl font-bold">
                                        <Link href="/events/new">
                                            Create event <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="outline" className="rounded-xl">
                                        <Link href="/pricing">See pricing</Link>
                                    </Button>
                                    <Button asChild size="lg" variant="ghost" className="rounded-xl">
                                        <Link href="/contact">Talk to us</Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                {[
                                    {
                                        title: 'Clean checkout',
                                        body: 'Fast, mobile-first ticket buying with clarity and trust.',
                                    },
                                    {
                                        title: 'Organiser tools',
                                        body: 'Practical features for real community event logistics.',
                                    },
                                    {
                                        title: 'Community discovery',
                                        body: 'A place where halal-friendly events can actually get found.',
                                    },
                                    ].map((card, idx) => (
                                        <motion.div
                                            key={card.title}
                                            className="rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm"
                                            initial={cardMotion(idx).initial}
                                            whileInView={cardMotion(idx).whileInView}
                                            viewport={cardMotion(idx).viewport}
                                            transition={cardMotion(idx).transition}
                                        >
                                        <div className="font-display text-lg font-bold text-slate-900">
                                            {card.title}
                                        </div>
                                        <p className="mt-2 text-sm text-slate-700/90 leading-relaxed">
                                            {card.body}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </SpotlightCard>
                    </div>
                </section>
            </div>
        </div>
    );
}

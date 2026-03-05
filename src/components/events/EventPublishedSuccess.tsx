'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Copy,
    Check,
    Facebook,
    Mail,
    ExternalLink,
    ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface EventPublishedSuccessProps {
    eventTitle: string;
    eventDate?: string | null;
    eventTime?: string | null;
    eventVenue?: string | null;
    eventCity?: string | null;
    eventSlug: string;
    dashboardHref: string;
    isPrivate?: boolean;
    isUpdate?: boolean;
    onClose?: () => void;
}

// -----------------------------------------------------------------------------
// Custom Icons
// -----------------------------------------------------------------------------

function InstagramIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
    );
}

function WhatsAppIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
            <path d="M19.11 17.2c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.16-.43-2.2-1.38-.81-.72-1.36-1.62-1.52-1.89-.16-.27-.02-.41.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.54-.45-.47-.61-.47l-.52-.01c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.26s.98 2.63 1.12 2.81c.14.18 1.93 2.95 4.67 4.14.65.28 1.16.44 1.56.56.66.21 1.26.18 1.73.11.53-.08 1.6-.65 1.82-1.27.23-.62.23-1.15.16-1.27-.07-.12-.25-.2-.52-.34z" />
            <path d="M16 3.2C9.05 3.2 3.4 8.85 3.4 15.8c0 2.23.58 4.31 1.6 6.12L3 29l7.25-1.9a12.52 12.52 0 0 0 5.75 1.4c6.95 0 12.6-5.65 12.6-12.6S22.95 3.2 16 3.2zm0 22.72c-1.94 0-3.85-.52-5.52-1.51l-.4-.24-4.3 1.12 1.15-4.18-.26-.43a10.4 10.4 0 0 1-1.61-5.56c0-5.74 4.68-10.4 10.4-10.4 5.73 0 10.4 4.66 10.4 10.4 0 5.72-4.67 10.4-10.4 10.4z" />
        </svg>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

// -----------------------------------------------------------------------------
// Celebration Animation - Radial Burst of Geometric Shapes
// -----------------------------------------------------------------------------

interface FloatingShapeProps {
    delay: number;
    duration: number;
    size: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    rotation: number;
    shape: 'ticket' | 'diamond' | 'circle';
}

const pseudoRandom = (seed: number) => {
    const value = Math.sin(seed) * 10000;
    return value - Math.floor(value);
};

function FloatingShape({ delay, duration, size, startX, startY, endX, endY, rotation, shape }: FloatingShapeProps) {
    const shapeElement = useMemo(() => {
        const baseClass = 'absolute';

        if (shape === 'ticket') {
            return (
                <div
                    className={cn(baseClass, "rounded-sm bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-teal)]")}
                    style={{ width: size, height: size * 0.6 }}
                />
            );
        }

        if (shape === 'diamond') {
            return (
                <div
                    className={cn(baseClass, "bg-gradient-to-br from-[var(--brand-mint)] to-[var(--brand-cyan)] rotate-45")}
                    style={{ width: size * 0.8, height: size * 0.8 }}
                />
            );
        }

        // circle
        return (
            <div
                className={cn(baseClass, "rounded-full bg-gradient-to-br from-[var(--brand-teal)]/60 to-[var(--brand-cyan)]/60")}
                style={{ width: size, height: size }}
            />
        );
    }, [shape, size]);

    return (
        <motion.div
            className="absolute pointer-events-none"
            initial={{
                x: startX,
                y: startY,
                scale: 0,
                opacity: 0,
                rotate: 0
            }}
            animate={{
                x: endX,
                y: endY,
                scale: [0, 1.2, 1, 0.8, 0],
                opacity: [0, 0.9, 0.7, 0.4, 0],
                rotate: rotation
            }}
            transition={{
                duration,
                delay,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
        >
            {shapeElement}
        </motion.div>
    );
}

function CelebrationBurst() {
    const shapes = useMemo(() => {
        const items: FloatingShapeProps[] = [];
        const shapeTypes: Array<'ticket' | 'diamond' | 'circle'> = ['ticket', 'diamond', 'circle'];

        // Create 12 shapes radiating outward
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) * (Math.PI / 180);
            const distance = 120 + pseudoRandom(i + 1) * 80;
            const shape = shapeTypes[i % 3];

            items.push({
                delay: 0.1 + (i * 0.05),
                duration: 1.8 + pseudoRandom(i + 2) * 0.4,
                size: 12 + pseudoRandom(i + 3) * 10,
                startX: 0,
                startY: 0,
                endX: Math.cos(angle) * distance,
                endY: Math.sin(angle) * distance,
                rotation: 180 + pseudoRandom(i + 4) * 360,
                shape,
            });
        }

        return items;
    }, []);

    return (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            {shapes.map((props, i) => (
                <FloatingShape key={i} {...props} />
            ))}
        </div>
    );
}

// -----------------------------------------------------------------------------
// Checkmark Animation
// -----------------------------------------------------------------------------

function AnimatedCheckmark() {
    return (
        <motion.div
            className="relative flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2
            }}
        >
            {/* Outer ring pulse */}
            <motion.div
                className="absolute w-24 h-24 rounded-full border-2 border-[var(--brand-teal)]/30"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.4, opacity: [0, 0.5, 0] }}
                transition={{ duration: 1.2, delay: 0.4 }}
            />

            {/* Main circle */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand-cyan)] via-[var(--brand-teal)] to-[var(--brand-mint)] flex items-center justify-center shadow-lg shadow-[var(--brand-teal)]/25">
                <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                >
                    <Check className="w-10 h-10 text-white stroke-[3]" />
                </motion.div>
            </div>
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Share Tile
// -----------------------------------------------------------------------------

interface ShareTileProps {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClassName: string;
    surfaceClassName: string;
}

function ShareTile({ label, href, icon: Icon, iconClassName, surfaceClassName }: ShareTileProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-w-0 flex-col items-center gap-2 rounded-xl p-3 text-center transition-all hover:bg-muted/50 active:scale-95"
        >
            <span
                className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-all group-hover:shadow-md group-hover:scale-105',
                    surfaceClassName
                )}
            >
                <Icon className={cn('h-5 w-5', iconClassName)} />
            </span>
            <span className="text-xs font-medium text-foreground/80">{label}</span>
        </a>
    );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function EventPublishedSuccess({
    eventTitle,
    eventDate,
    eventTime,
    eventVenue,
    eventCity,
    eventSlug,
    dashboardHref,
    isPrivate = false,
    isUpdate = false,
}: EventPublishedSuccessProps) {
    const [copied, setCopied] = useState(false);

    // Build the event URL
    const eventUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return `${window.location.origin}/events/${eventSlug}`;
    }, [eventSlug]);

    // Format location
    const locationDisplay = useMemo(() => {
        const parts = [eventVenue, eventCity].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    }, [eventVenue, eventCity]);

    // Format date/time
    const dateTimeDisplay = useMemo(() => {
        const parts = [eventDate, eventTime].filter(Boolean);
        return parts.length > 0 ? parts.join(' • ') : null;
    }, [eventDate, eventTime]);

    // Copy handler
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(eventUrl);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    // Build share URLs
    const encodedUrl = encodeURIComponent(eventUrl);
    const shareText = `Check out ${eventTitle}!`;
    const encodedText = encodeURIComponent(`${shareText} ${eventUrl}`);

    const shareItems: ShareTileProps[] = [
        {
            label: 'Instagram',
            // Instagram doesn't have direct share URL, so we'll use stories link
            href: `https://www.instagram.com/`,
            icon: InstagramIcon,
            iconClassName: 'text-[#E4405F]',
            surfaceClassName: 'bg-gradient-to-br from-[#833AB4]/15 via-[#E4405F]/15 to-[#FCAF45]/15',
        },
        {
            label: 'WhatsApp',
            href: `https://wa.me/?text=${encodedText}`,
            icon: WhatsAppIcon,
            iconClassName: 'text-[#25D366]',
            surfaceClassName: 'bg-[#25D366]/15',
        },
        {
            label: 'Facebook',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon: Facebook,
            iconClassName: 'text-[#1877F2]',
            surfaceClassName: 'bg-[#1877F2]/15',
        },
        {
            label: 'X',
            href: `https://twitter.com/intent/tweet?text=${encodedText}`,
            icon: XIcon,
            iconClassName: 'text-foreground',
            surfaceClassName: 'bg-foreground/10',
        },
        {
            label: 'Email',
            href: `mailto:?subject=${encodeURIComponent(eventTitle)}&body=${encodedText}`,
            icon: Mail,
            iconClassName: 'text-slate-600 dark:text-slate-400',
            surfaceClassName: 'bg-slate-100 dark:bg-slate-800',
        },
    ];

    return (
        <div className="min-h-screen overflow-x-clip bg-gradient-to-br from-background via-background to-[var(--brand-mint)]/5">
            <div className="container py-8 lg:py-16">
                <div className="mx-auto max-w-5xl">
                    {/* Split View Layout */}
                    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">

                        {/* Left Side - Celebration */}
                        <motion.div
                            className="min-w-0 flex flex-col items-center justify-center text-center lg:items-start lg:text-left lg:py-12 overflow-hidden lg:overflow-visible"
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            {/* Celebration animation container */}
                            <div className="relative mb-8 lg:mb-10">
                                <CelebrationBurst />
                                <AnimatedCheckmark />
                            </div>

                            <motion.div
                                className="w-full max-w-full"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                            >
                                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                                    {isUpdate ? 'Updated!' : 'Congratulations!'}
                                </h1>
                                <p className="mt-3 text-lg text-muted-foreground lg:text-xl">
                                    {isUpdate
                                        ? 'Your event changes are now live.'
                                        : `Your event is now ${isPrivate ? 'ready' : 'live'}.`}
                                </p>

                                {isPrivate && (
                                    <motion.p
                                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100/80 dark:bg-amber-900/30 px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200 max-w-full flex-wrap sm:flex-nowrap"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.7 }}
                                    >
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        Private event — Only people with the link can access
                                    </motion.p>
                                )}
                            </motion.div>
                        </motion.div>

                        {/* Right Side - Event Details & Actions */}
                        <motion.div
                            className="min-w-0 flex flex-col gap-6"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            {/* Event Card */}
                            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                                <h2 className="font-display text-xl font-semibold text-foreground line-clamp-2">
                                    {eventTitle}
                                </h2>

                                {(dateTimeDisplay || locationDisplay) && (
                                    <div className="mt-4 space-y-2">
                                        {dateTimeDisplay && (
                                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="text-base">📅</span>
                                                {dateTimeDisplay}
                                            </p>
                                        )}
                                        {locationDisplay && (
                                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="text-base">📍</span>
                                                {locationDisplay}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Share Link Section */}
                            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Share your event
                                </p>

                                {/* Link Box */}
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex-1 min-w-0 rounded-lg border border-border bg-muted/50 px-4 py-3">
                                        <p className="truncate text-sm font-medium text-foreground/90">
                                            {eventUrl || 'Loading...'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleCopy}
                                        className="shrink-0 h-12 w-12 border-[var(--brand-teal)]/40 hover:bg-[var(--brand-cyan)]/10"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                {/* Social Share Grid */}
                                <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-1">
                                    {shareItems.map((item) => (
                                        <ShareTile key={item.label} {...item} />
                                    ))}
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    asChild
                                    className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] hover:from-[var(--brand-cyan)]/90 hover:to-[var(--brand-teal)]/90"
                                >
                                    <Link href={`/events/${eventSlug}`}>
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        View Event Page
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="flex-1 h-12 text-base font-semibold"
                                >
                                    <Link href={dashboardHref}>
                                        Go to Dashboard
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}

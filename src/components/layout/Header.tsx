'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useOptionalAuth } from '@/context/auth-context';

// Animation variants from v0 design
const itemVariants = {
    initial: { rotateX: 0, opacity: 1 },
    hover: { rotateX: -90, opacity: 0 },
};

const backVariants = {
    initial: { rotateX: 90, opacity: 0 },
    hover: { rotateX: 0, opacity: 1 },
};

const glowVariants = {
    initial: { opacity: 0, scale: 0.8 },
    hover: {
        opacity: 1,
        scale: 2,
        transition: {
            opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
            scale: { duration: 0.5, type: 'spring' as const, stiffness: 300, damping: 25 },
        },
    },
};

const navGlowVariants = {
    initial: { opacity: 0 },
    hover: {
        opacity: 1,
        transition: {
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1] as const,
        },
    },
};

const sharedTransition = {
    type: 'spring' as const,
    stiffness: 100,
    damping: 20,
    duration: 0.5,
};

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setIsScrolled(latest > 50);
    });

    const router = useRouter();
    const pathname = usePathname();
    const auth = useOptionalAuth();
    const user = auth?.user ?? null;

    // Navigation Items with Icons and Brand Gradients
    const navLinks = [
        {
            id: 'home',
            href: '/',
            label: 'Home',
            // Bright Green (Logo Green) - Stronger
            gradient:
                'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.1) 50%, rgba(34, 197, 94, 0) 100%)',
            iconColor: 'text-green-600',
        },
        {
            id: 'browse-events',
            href: '/events',
            label: 'Browse Events',
            // Turquoise - Stronger
            gradient:
                'radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(20, 184, 166, 0.1) 50%, rgba(20, 184, 166, 0) 100%)',
            iconColor: 'text-teal-500',
        },
        {
            id: 'pricing',
            href: '/pricing',
            label: 'Pricing',
            // Cyan - Stronger
            gradient:
                'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, rgba(6, 182, 212, 0.1) 50%, rgba(6, 182, 212, 0) 100%)',
            iconColor: 'text-cyan-600',
        },
        {
            id: 'contact',
            href: '/contact',
            label: 'Contact',
            // Blue - Stronger
            gradient:
                'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(59, 130, 246, 0) 100%)',
            iconColor: 'text-blue-600',
        },
    ];

    const displayName = user?.name || user?.email || 'Guest User';
    const displayEmail = user?.email || 'guest@example.com';
    const avatarInitial = displayName.charAt(0).toUpperCase();
    const isAuthenticated = Boolean(user);

    const handleSignOut = () => {
        auth?.signOut?.();
        router.push('/login');
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-6',
                'pt-[max(env(safe-area-inset-top),1rem)]',
                isScrolled ? 'pb-4' : 'pb-6'
            )}
        >
            <div
                className={cn(
                    'max-w-7xl mx-auto rounded-[2rem] transition-all duration-300 flex items-center justify-between px-4 py-2',
                    'bg-white/95 border border-white/70 shadow-lg ring-1 ring-white/60 relative overflow-hidden',
                    'md:bg-white/60 md:backdrop-blur-xl md:border-white/50'
                )}
            >
                {/* Background Glow Effect */}
                <motion.div
                    className="hidden md:block absolute -inset-2 bg-gradient-radial from-transparent via-blue-400/10 via-30% via-purple-400/10 via-60% via-red-400/10 via-90% to-transparent rounded-3xl z-0 pointer-events-none"
                    variants={navGlowVariants}
                    initial="initial"
                    whileHover="hover"
                />

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 relative z-50 pl-2">
                    <Image
                        src="/images/HTlogocr.png"
                        alt="HalalTicketin' Logo"
                        width={120}
                        height={35}
                        className="h-8 w-auto"
                        priority
                    />
                </Link>

                {/* Centered Desktop Menu - Liquid Glass Dock */}
                <div className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <ul className="flex items-center gap-2">
                        {navLinks.map((link) => (
                            <motion.li key={link.id} className="relative">
                                <motion.div
                                    className="block rounded-xl overflow-visible group relative"
                                    style={{ perspective: '600px' }}
                                    whileHover="hover"
                                    initial="initial"
                                >
                                    <motion.div
                                        className="absolute inset-0 z-0 pointer-events-none"
                                        variants={glowVariants}
                                        style={{
                                            background: link.gradient,
                                            opacity: 0,
                                            borderRadius: '16px',
                                        }}
                                    />
                                    <motion.div>
                                        <Link href={link.href}>
                                            <motion.div
                                                className="flex items-center gap-2 px-4 py-2 relative z-10 bg-transparent text-muted-foreground transition-colors rounded-xl"
                                                variants={itemVariants}
                                                transition={sharedTransition}
                                                style={{
                                                    transformStyle: 'preserve-3d',
                                                    transformOrigin: 'center bottom',
                                                }}
                                            >
                                                <span
                                                    className={`text-sm font-medium transition-colors duration-300 group-hover:${link.iconColor} text-slate-600`}
                                                >
                                                    {link.label}
                                                </span>
                                            </motion.div>
                                        </Link>
                                        <Link href={link.href} className="absolute inset-0 z-20">
                                            <motion.div
                                                className="flex items-center gap-2 px-4 py-2 bg-transparent text-muted-foreground group-hover:text-foreground transition-colors rounded-xl h-full w-full"
                                                variants={backVariants}
                                                transition={sharedTransition}
                                                style={{
                                                    transformStyle: 'preserve-3d',
                                                    transformOrigin: 'center top',
                                                    rotateX: 90,
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                }}
                                            >
                                                <span
                                                    className={`text-sm font-medium transition-colors duration-300 group-hover:${link.iconColor} text-slate-900`}
                                                >
                                                    {link.label}
                                                </span>
                                            </motion.div>
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            </motion.li>
                        ))}
                    </ul>
                </div>

                {/* Right Side Actions */}
                <div className="hidden md:flex items-center gap-3 ml-auto relative z-50">
                    {isAuthenticated ? (
                        <>
                            <Button
                                className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 rounded-full px-6 font-semibold shadow-md"
                                asChild
                            >
                                <Link href="/events/new">Create Event</Link>
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="relative h-9 w-9 rounded-full ring-2 ring-white hover:ring-[var(--brand-cyan)] transition-all p-0"
                                    >
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} />
                                            <AvatarFallback className="bg-[var(--brand-mint)] text-[var(--brand-teal)] font-bold">
                                                {avatarInitial}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-56 backdrop-blur-xl bg-white/90"
                                    align="end"
                                    forceMount
                                >
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium">{displayName}</p>
                                            <p className="text-xs text-muted-foreground">{displayEmail}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile">Profile</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard">Dashboard</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/settings">Settings</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleSignOut();
                                        }}
                                    >
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="text-sm font-semibold text-slate-800 hover:text-[var(--brand-teal)]"
                            >
                                Log in
                            </Link>
                            <Button
                                className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 rounded-full px-6 font-semibold shadow-md"
                                asChild
                            >
                                <Link href="/events/new">Create Event</Link>
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden relative z-50 text-slate-800 p-2 rounded-full hover:bg-white/70 transition-colors bg-white/90 border border-white/80 shadow-sm"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Mobile Menu Dropdown */}

            </div>
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop to close on click outside */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/5" // Subtle dim
                            onClick={() => setMobileMenuOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -16, scale: 0.98 }}
                            transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                            className="absolute top-[calc(100%-0.5rem)] left-0 right-0 mx-4 p-6 md:hidden z-50 rounded-3xl bg-white shadow-2xl border border-white/70 flex flex-col gap-6"
                        >
                            <div className="flex flex-col gap-2">
                                {navLinks.map((link) => {
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.id}
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                'text-lg font-medium px-4 py-3 rounded-2xl transition-all flex items-center justify-end gap-3',
                                                isActive
                                                    ? 'text-[var(--brand-teal)] bg-white/50'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/30'
                                            )}
                                        >
                                            {link.label}
                                        </Link>
                                    );
                                })}
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                            <div className="flex flex-col gap-3">
                                {isAuthenticated ? (
                                    <>
                                        <Button
                                            className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-teal-500/20"
                                            asChild
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Link href="/events/new">Create Event</Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 rounded-xl text-md border-slate-200 bg-white/50 hover:bg-white"
                                            asChild
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Link href="/dashboard">Dashboard</Link>
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-teal-500/20"
                                            asChild
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Link href="/events/new">Create Event</Link>
                                        </Button>
                                        <Link
                                            href="/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="w-full h-12 flex items-center justify-center rounded-xl text-md font-semibold text-slate-600 hover:bg-white/50 transition-colors"
                                        >
                                            Log in
                                        </Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}

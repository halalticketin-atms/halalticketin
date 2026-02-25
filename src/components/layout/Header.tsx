'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { createPortal } from 'react-dom';
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
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useScrollVisibility } from '@/hooks/useScrollVisibility';

// Simplified animation - CSS handles most hover effects now
const sharedTransition = {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1] as const,
};

export function Header() {
    const [isInteracting, setIsInteracting] = useState(false);
    const { isScrolled, isVisible } = useScrollVisibility({ isInteracting });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    // Lock body scroll when mobile menu is open
    useBodyScrollLock(mobileMenuOpen);

    useEffect(() => {
        // Mark as mounted after a frame to enable transitions
        requestAnimationFrame(() => setHasMounted(true));
    }, []);

    useEffect(() => {
        if (!mobileMenuOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [mobileMenuOpen]);

    const pathname = usePathname();
    const router = useRouter();
    const auth = useOptionalAuth();
    const user = auth?.user ?? null;
    const isOrganizer = auth?.isOrganizer ?? false;
    const isPreviewRoute = Boolean(
        pathname &&
        (/^\/events\/preview(\/|$)/.test(pathname) || /^\/events\/[^/]+\/preview$/.test(pathname))
    );
    const isEmbedRoute = pathname?.startsWith('/embed');

    if (isPreviewRoute || isEmbedRoute) {
        return null;
    }

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
            id: 'about',
            href: '/about',
            label: 'About',
            // Emerald - Stronger
            gradient:
                'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(16, 185, 129, 0) 100%)',
            iconColor: 'text-emerald-600',
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

    // Keep header visible when mobile menu is open
    const shouldBeVisible = isVisible || mobileMenuOpen;
    const mobileMenuOverlay = hasMounted
        ? createPortal(
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop to close on click outside */}
                        <motion.button
                            type="button"
                            aria-label="Close mobile menu"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[59] bg-black/5 overscroll-contain touch-none md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={sharedTransition}
                            className="fixed top-[calc(var(--nav-safe-offset)+0.5rem)] left-4 right-4 p-6 md:hidden z-[60] rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col gap-6 transform-gpu"
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
                                        {/* User Profile Link */}
                                        <Link
                                            href="/profile"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[var(--brand-mint)]/50 to-white/50 border border-[var(--brand-teal)]/10 hover:border-[var(--brand-teal)]/30 transition-all"
                                        >
                                            <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
                                                <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} className="object-cover" />
                                                <AvatarFallback className="bg-[var(--brand-mint)] text-[var(--brand-teal)] font-bold">
                                                    {avatarInitial}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-semibold text-slate-800">{displayName}</span>
                                        </Link>

                                        <Button
                                            className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-teal-500/20"
                                            asChild
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Link href="/events/new">Create Event</Link>
                                        </Button>
                                        {isOrganizer && (
                                            <Button
                                                variant="outline"
                                                className="w-full h-12 rounded-xl text-md border-slate-200 bg-white/50 hover:bg-white"
                                                asChild
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <Link href="/dashboard">Dashboard</Link>
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 rounded-xl text-md border-red-200 bg-red-50/50 hover:bg-red-100 text-red-600 font-semibold"
                                            onClick={() => {
                                                setMobileMenuOpen(false);
                                                handleSignOut();
                                            }}
                                        >
                                            Sign Out
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
            </AnimatePresence>,
            document.body
        )
        : null;

    return (
        <>
            <nav
                className={cn(
                    'fixed top-0 left-0 right-0 z-50 px-4 md:px-6',
                    'pt-[max(env(safe-area-inset-top),1rem)]',
                    isScrolled ? 'pb-4' : 'pb-6',
                    // Smooth transform transition for hide/show
                    'transition-[transform,padding] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    // Slide up when hidden, down when visible
                    shouldBeVisible ? 'translate-y-0' : '-translate-y-full',
                    // Only enable transitions after mount to prevent initial stutter
                    !hasMounted && 'motion-reduce:transition-none',
                    // CSS entrance animation using tw-animate-css
                    hasMounted && 'animate-in fade-in duration-300 fill-mode-forwards'
                )}
                onMouseEnter={() => setIsInteracting(true)}
                onMouseLeave={() => setIsInteracting(false)}
            >
                <div
                    className={cn(
                        'max-w-7xl mx-auto rounded-4xl flex items-center justify-between px-4 py-2',
                        'bg-white border border-white/70 shadow-lg ring-1 ring-white/60 relative overflow-hidden',
                        isScrolled && 'shadow-xl',
                        // Only enable shadow transition after mount
                        hasMounted && 'transition-shadow duration-200'
                    )}
                >

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

                    {/* Centered Desktop Menu - Simplified for Performance */}
                    <div className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <ul className="flex items-center gap-1">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <li key={link.id}>
                                        <Link
                                            href={link.href}
                                            className={cn(
                                                'block px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                                                'hover:bg-[var(--brand-cyan)]/10 hover:text-[var(--brand-teal)] active:scale-95',
                                                isActive
                                                    ? 'text-[var(--brand-teal)] bg-[var(--brand-cyan)]/5 font-semibold'
                                                    : 'text-slate-600'
                                            )}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                );
                            })}
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
                                            aria-label="Account menu"
                                        >
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} className="object-cover" />
                                                <AvatarFallback className="bg-[var(--brand-mint)] text-[var(--brand-teal)] font-bold">
                                                    {avatarInitial}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="w-56 bg-white shadow-xl"
                                        align="end"
                                        forceMount
                                    >
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium truncate">{displayName}</p>
                                                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href="/profile">Profile</Link>
                                        </DropdownMenuItem>
                                        {isOrganizer && (
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard">Dashboard</Link>
                                            </DropdownMenuItem>
                                        )}
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
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </nav>
            {mobileMenuOverlay}
        </>
    );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { Menu, X, Search, CreditCard, LayoutDashboard, QrCode, Mail, User } from 'lucide-react';
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
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';

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
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setIsScrolled(latest > 50);
    });

    const router = useRouter();
    const { user, signOut } = useAuth();
    const { activeOrganizerId } = useOrganizers();

    // Navigation Items with Icons and Brand Gradients
    const navLinks = [
        {
            id: 'browse-events',
            href: '/events',
            label: 'Browse',
            icon: <Search className="h-5 w-5" />,
            gradient:
                'radial-gradient(circle, rgba(184, 233, 234, 0.15) 0%, rgba(115, 203, 205, 0.06) 50%, rgba(56, 189, 248, 0) 100%)', // Cyan/Teal
            iconColor: 'text-[var(--brand-cyan)]',
        },
        {
            id: 'pricing',
            href: '/pricing',
            label: 'Pricing',
            icon: <CreditCard className="h-5 w-5" />,
            gradient:
                'radial-gradient(circle, rgba(167, 243, 208, 0.15) 0%, rgba(52, 211, 153, 0.06) 50%, rgba(16, 185, 129, 0) 100%)', // Mint/Green
            iconColor: 'text-[var(--brand-mint)]',
        },
        {
            id: 'dashboard',
            href: '/dashboard',
            label: 'Dashboard',
            icon: <LayoutDashboard className="h-5 w-5" />,
            gradient:
                'radial-gradient(circle, rgba(253, 186, 116, 0.15) 0%, rgba(251, 146, 60, 0.06) 50%, rgba(249, 115, 22, 0) 100%)', // Orange (keeping distinction)
            iconColor: 'text-orange-500',
        },
        {
            id: 'check-in',
            href: activeOrganizerId ? `/dashboard/o/${activeOrganizerId}/check-in` : '/dashboard',
            label: 'Check-in',
            icon: <QrCode className="h-5 w-5" />,
            gradient:
                'radial-gradient(circle, rgba(196, 181, 253, 0.15) 0%, rgba(167, 139, 250, 0.06) 50%, rgba(139, 92, 246, 0) 100%)', // Purple
            iconColor: 'text-purple-500',
        },
        {
            id: 'contact',
            href: '/contact',
            label: 'Contact',
            icon: <Mail className="h-5 w-5" />,
            gradient:
                'radial-gradient(circle, rgba(252, 165, 165, 0.15) 0%, rgba(248, 113, 113, 0.06) 50%, rgba(239, 68, 68, 0) 100%)', // Red
            iconColor: 'text-red-500',
        },
    ];

    const displayName = user?.name || user?.email || 'Guest User';
    const displayEmail = user?.email || 'guest@example.com';
    const avatarInitial = displayName.charAt(0).toUpperCase();
    const isAuthenticated = Boolean(user);

    const handleSignOut = () => {
        signOut();
        router.push('/login');
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-6',
                isScrolled ? 'py-4' : 'py-6'
            )}
        >
            <div
                className={cn(
                    'max-w-7xl mx-auto rounded-full transition-all duration-300 flex items-center justify-between px-4 py-2',
                    'backdrop-blur-xl bg-white/60 border border-white/50 shadow-lg ring-1 ring-white/60 relative overflow-hidden'
                )}
            >
                {/* Background Glow Effect */}
                <motion.div
                    className="absolute -inset-2 bg-gradient-radial from-transparent via-blue-400/10 via-30% via-purple-400/10 via-60% via-red-400/10 via-90% to-transparent rounded-3xl z-0 pointer-events-none"
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
                                                className="flex items-center gap-2 px-3 py-2 relative z-10 bg-transparent text-muted-foreground group-hover:text-foreground transition-colors rounded-xl"
                                                variants={itemVariants}
                                                transition={sharedTransition}
                                                style={{
                                                    transformStyle: 'preserve-3d',
                                                    transformOrigin: 'center bottom',
                                                }}
                                            >
                                                <span
                                                    className={`transition-colors duration-300 group-hover:${link.iconColor} text-slate-600`}
                                                >
                                                    {link.icon}
                                                </span>
                                                <span className="text-sm font-medium">{link.label}</span>
                                            </motion.div>
                                        </Link>
                                        <Link href={link.href} className="absolute inset-0 z-20">
                                            <motion.div
                                                className="flex items-center gap-2 px-3 py-2 bg-transparent text-muted-foreground group-hover:text-foreground transition-colors rounded-xl h-full w-full"
                                                variants={backVariants}
                                                transition={sharedTransition}
                                                style={{
                                                    transformStyle: 'preserve-3d',
                                                    transformOrigin: 'center top',
                                                    rotateX: 90,
                                                    position: 'absolute', top: 0, left: 0
                                                }}
                                            >
                                                <span
                                                    className={`transition-colors duration-300 group-hover:${link.iconColor} text-slate-900`}
                                                >
                                                    {link.icon}
                                                </span>
                                                <span className="text-sm font-medium text-slate-900">{link.label}</span>
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
                                className="bg-white text-slate-900 hover:bg-slate-50 rounded-full px-6 font-semibold shadow-sm border border-slate-200"
                                asChild
                            >
                                <Link href="/register">Sign Up</Link>
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <Sheet>
                    <SheetTrigger asChild>
                        <button className="md:hidden relative z-50 text-slate-800 p-2 rounded-full hover:bg-white/50 transition-colors">
                            <Menu className="h-6 w-6" />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="top" className="w-full h-full bg-white/95 backdrop-blur-xl border-none p-0">
                        <div className="flex flex-col items-center justify-center h-full gap-8 p-4 text-center">
                            <SheetClose asChild className="absolute top-6 right-6">
                                <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
                                    <X className="h-6 w-6 text-slate-800" />
                                </button>
                            </SheetClose>

                            {navLinks.map((link) => (
                                <SheetClose asChild key={link.id}>
                                    <Link
                                        href={link.href}
                                        className="text-3xl font-light text-slate-800 hover:text-[var(--brand-teal)] transition-colors font-display flex items-center gap-3"
                                    >
                                        {link.icon}
                                        {link.label}
                                    </Link>
                                </SheetClose>
                            ))}

                            <div className="flex flex-col gap-4 mt-8 w-full max-w-sm">
                                {isAuthenticated ? (
                                    <>
                                        <SheetClose asChild>
                                            <Button
                                                className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white w-full h-12 rounded-full text-lg font-bold shadow-lg"
                                                asChild
                                            >
                                                <Link href="/events/new">Create Event</Link>
                                            </Button>
                                        </SheetClose>
                                        <SheetClose asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full h-12 rounded-full text-lg border-slate-300"
                                                asChild
                                            >
                                                <Link href="/dashboard">Dashboard</Link>
                                            </Button>
                                        </SheetClose>
                                    </>
                                ) : (
                                    <>
                                        <SheetClose asChild>
                                            <Button
                                                className="bg-white text-slate-900 w-full h-12 rounded-full text-lg font-bold shadow-md border border-slate-200"
                                                asChild
                                            >
                                                <Link href="/register">Sign Up Free</Link>
                                            </Button>
                                        </SheetClose>
                                        <SheetClose asChild>
                                            <Link href="/login" className="text-lg font-medium text-slate-600">
                                                Log in
                                            </Link>
                                        </SheetClose>
                                    </>
                                )}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </motion.nav>
    );
}

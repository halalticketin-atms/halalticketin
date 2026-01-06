'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { memo, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
    LayoutDashboard,
    Calendar,
    Receipt,
    BarChart3,
    MoreHorizontal,
    Settings,
    Users,
    ScanLine,
    LogOut,
    X,
    Mail,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDashboardPath } from '@/lib/organizer-path';
import { useAuth } from '@/context/auth-context';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
}

interface MobileBottomNavProps {
    organizerId?: string;
}

const buildNavItems = (organizerId?: string): NavItem[] => {
    const base = organizerId ? buildDashboardPath(organizerId) : '/dashboard';
    return [
        { title: 'Overview', href: base, icon: LayoutDashboard },
        { title: 'Events', href: `${base}/events`, icon: Calendar },
        { title: 'Orders', href: `${base}/orders`, icon: Receipt },
        { title: 'Analytics', href: `${base}/analytics`, icon: BarChart3 },
    ];
};

const moreMenuItems = (organizerId?: string): NavItem[] => {
    const base = organizerId ? buildDashboardPath(organizerId) : '/dashboard';
    return [
        { title: 'Team', href: `${base}/team`, icon: Users },
        { title: 'Check-in', href: `${base}/check-in`, icon: ScanLine },
        { title: 'Email', href: `${base}/email-attendees`, icon: Mail },
        { title: 'Credits', href: `${base}/billing`, icon: Wallet },
        { title: 'Settings', href: '/settings', icon: Settings },
    ];
};

// Spring animation configs for buttery smooth feel
const springConfig = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
};

const gentleSpring = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
    mass: 0.8,
};

function MobileBottomNavComponent({ organizerId }: MobileBottomNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const { signOut } = useAuth();
    const prefersReducedMotion = useReducedMotion();

    const mainNavItems = useMemo(() => buildNavItems(organizerId), [organizerId]);
    const moreItems = useMemo(() => moreMenuItems(organizerId), [organizerId]);
    const allItems = useMemo(() => [...mainNavItems, ...moreItems], [mainNavItems, moreItems]);

    // Lock body scroll when expanded
    useBodyScrollLock(isExpanded);

    const handleSignOut = useCallback(() => {
        setIsExpanded(false);
        signOut();
        router.push('/login');
    }, [router, signOut]);

    const isActive = useCallback((href: string) => {
        const overviewHref = organizerId ? buildDashboardPath(organizerId) : '/dashboard';
        if (href === overviewHref) {
            return pathname === overviewHref;
        }
        return pathname.startsWith(href);
    }, [organizerId, pathname]);

    // Check if any "more" item is active
    const isMoreActive = useMemo(() => moreItems.some((item) => isActive(item.href)), [moreItems, isActive]);

    const handleNavClick = useCallback((href: string) => {
        setIsExpanded(false);
        router.push(href);
    }, [router]);

    // Animation variants
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    };

    const expandedNavVariants = {
        hidden: {
            opacity: 0,
            y: 20,
            scale: 0.95,
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: prefersReducedMotion ? { duration: 0.15 } : gentleSpring,
        },
        exit: {
            opacity: 0,
            y: 10,
            scale: 0.98,
            transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] as const },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 8 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: prefersReducedMotion
                ? { duration: 0.1 }
                : {
                    ...springConfig,
                    delay: i * 0.03,
                },
        }),
    };

    return (
        <>
            {/* Backdrop with blur */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 lg:hidden"
                        onClick={() => setIsExpanded(false)}
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Expanded Navigation Grid */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        variants={expandedNavVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        <div className="mx-3 mb-3 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <span className="text-sm font-semibold text-gray-900">Quick Navigation</span>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsExpanded(false)}
                                    className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </motion.button>
                            </div>

                            {/* Navigation Grid */}
                            <div className="p-4">
                                <div className="grid grid-cols-3 gap-2">
                                    {allItems.map((item, index) => {
                                        const active = isActive(item.href);
                                        return (
                                            <motion.button
                                                key={item.href}
                                                custom={index}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleNavClick(item.href)}
                                                className={cn(
                                                    'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-colors',
                                                    active
                                                        ? 'bg-gradient-to-br from-[var(--brand-mint)] to-[var(--brand-cyan)]/20 text-[var(--brand-teal)]'
                                                        : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                                                )}
                                            >
                                                <div className={cn(
                                                    'p-2.5 rounded-xl transition-all',
                                                    active
                                                        ? 'bg-white/80 shadow-sm'
                                                        : 'bg-gray-100'
                                                )}>
                                                    <item.icon className="h-5 w-5" />
                                                </div>
                                                <span className="text-xs font-medium">{item.title}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sign Out */}
                            <div className="px-4 pb-4">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSignOut}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Tab Bar - Always visible */}
            <motion.nav
                layout
                className={cn(
                    'fixed bottom-0 left-0 right-0 z-50 lg:hidden',
                    'bg-white/95 backdrop-blur-md border-t border-gray-200/80',
                    'shadow-[0_-4px_20px_rgba(0,0,0,0.06)]',
                    isExpanded && 'opacity-0 pointer-events-none'
                )}
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    WebkitBackdropFilter: 'blur(12px)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="flex items-center justify-around h-16 px-2">
                    {mainNavItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'relative flex flex-col items-center justify-center flex-1 h-full gap-1',
                                    'transition-all duration-200',
                                    active
                                        ? 'text-[var(--brand-teal)]'
                                        : 'text-gray-400 hover:text-gray-600'
                                )}
                            >
                                <motion.div
                                    whileTap={{ scale: 0.85 }}
                                    transition={springConfig}
                                    className="relative"
                                >
                                    {/* Active indicator pill */}
                                    {active && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-mint)]/60 to-[var(--brand-cyan)]/30 rounded-2xl"
                                            transition={prefersReducedMotion ? { duration: 0.15 } : springConfig}
                                        />
                                    )}
                                    <item.icon className="relative h-5 w-5" />
                                </motion.div>
                                <span className={cn(
                                    'text-[10px] font-medium transition-all',
                                    active && 'font-semibold'
                                )}>
                                    {item.title}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        transition={springConfig}
                        onClick={() => setIsExpanded(true)}
                        className={cn(
                            'relative flex flex-col items-center justify-center flex-1 h-full gap-1',
                            'transition-all duration-200',
                            isMoreActive
                                ? 'text-[var(--brand-teal)]'
                                : 'text-gray-400 hover:text-gray-600'
                        )}
                    >
                        <div className="relative">
                            {isMoreActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-mint)]/60 to-[var(--brand-cyan)]/30 rounded-2xl"
                                    transition={prefersReducedMotion ? { duration: 0.15 } : springConfig}
                                />
                            )}
                            <MoreHorizontal className="relative h-5 w-5" />
                        </div>
                        <span className={cn(
                            'text-[10px] font-medium transition-all',
                            isMoreActive && 'font-semibold'
                        )}>
                            More
                        </span>
                    </motion.button>
                </div>
            </motion.nav>
        </>
    );
}

export const MobileBottomNav = memo(MobileBottomNavComponent);

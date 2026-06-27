'use client';

import { usePathname, useRouter } from 'next/navigation';
import { memo, useCallback, useMemo, useState, useTransition } from 'react';
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
import { useScrollVisibility } from '@/hooks/useScrollVisibility';

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
        { title: 'Orders & Tickets', href: `${base}/orders`, icon: Receipt },
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

// Faster spring for snappy feedback
const snappySpring = {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
    mass: 0.8,
};

// Instant tween for zero-delay feedback
const instantTween = {
    type: 'tween' as const,
    duration: 0.1,
    ease: [0.2, 0, 0, 1] as const,
};

function MobileBottomNavComponent({ organizerId }: MobileBottomNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [, startTransition] = useTransition();
    const { signOut } = useAuth();
    const prefersReducedMotion = useReducedMotion();
    const [isInteracting, setIsInteracting] = useState(false);
    const { isVisible: isNavVisible } = useScrollVisibility({ isInteracting });

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

    // Instant navigation - no delay
    const navigate = useCallback((href: string) => {
        // Use startTransition for non-blocking navigation
        startTransition(() => {
            router.push(href);
        });
    }, [router]);

    const handleNavClick = useCallback((href: string) => {
        setIsExpanded(false);
        navigate(href);
    }, [navigate]);

    const handleMainNavClick = useCallback((e: React.MouseEvent | React.TouchEvent, href: string) => {
        e.preventDefault();
        navigate(href);
    }, [navigate]);

    return (
        <>
            {/* Backdrop with blur */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-40 lg:hidden"
                        onClick={() => setIsExpanded(false)}
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            touchAction: 'none',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Expanded Navigation Grid */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2, ease: [0.2, 0, 0, 1] }}
                        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
                        style={{
                            paddingBottom: 'env(safe-area-inset-bottom)',
                            touchAction: 'manipulation',
                        }}
                    >
                        <div className="mx-3 mb-3 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <span className="text-sm font-semibold text-gray-900">Quick Navigation</span>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 active:bg-gray-100 transition-colors"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Navigation Grid */}
                            <div className="p-4">
                                <div className="grid grid-cols-3 gap-2">
                                    {allItems.map((item) => {
                                        const active = isActive(item.href);
                                        return (
                                            <button
                                                key={item.href}
                                                onClick={() => handleNavClick(item.href)}
                                                className={cn(
                                                    'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl',
                                                    'active:scale-95 transition-transform duration-75',
                                                    active
                                                        ? 'bg-gradient-to-br from-[var(--brand-mint)] to-[var(--brand-cyan)]/20 text-[var(--brand-teal)]'
                                                        : 'text-gray-600 active:bg-gray-100'
                                                )}
                                                style={{ touchAction: 'manipulation' }}
                                            >
                                                <div className={cn(
                                                    'p-2.5 rounded-xl',
                                                    active
                                                        ? 'bg-white/80 shadow-sm'
                                                        : 'bg-gray-100'
                                                )}>
                                                    <item.icon className="h-5 w-5" />
                                                </div>
                                                <span className="text-xs font-medium text-center leading-tight">{item.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sign Out */}
                            <div className="px-4 pb-4">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-600 bg-red-50 active:bg-red-100 active:scale-[0.98] transition-all duration-75"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Tab Bar - Always visible */}
            <nav
                className={cn(
                    'fixed bottom-0 left-0 right-0 z-50 lg:hidden',
                    'bg-white/95 border-t border-gray-200/80',
                    'shadow-[0_-4px_20px_rgba(0,0,0,0.06)]',
                    'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    (isNavVisible || isExpanded) ? 'translate-y-0' : 'translate-y-[calc(100%+env(safe-area-inset-bottom))]',
                    isExpanded && 'opacity-0 pointer-events-none'
                )}
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    WebkitBackdropFilter: 'blur(12px)',
                    backdropFilter: 'blur(12px)',
                    touchAction: 'manipulation',
                }}
                onMouseEnter={() => setIsInteracting(true)}
                onMouseLeave={() => setIsInteracting(false)}
            >
                <div className="flex items-center justify-around h-16 px-2">
                    {mainNavItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <button
                                key={item.href}
                                onClick={(e) => handleMainNavClick(e, item.href)}
                                className={cn(
                                    'relative flex flex-col items-center justify-center flex-1 h-full gap-1',
                                    'active:scale-90 transition-transform duration-75',
                                    active
                                        ? 'text-[var(--brand-teal)]'
                                        : 'text-gray-400'
                                )}
                                style={{ touchAction: 'manipulation' }}
                            >
                                <div className="relative">
                                    {/* Active indicator pill */}
                                    {active && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-mint)]/60 to-[var(--brand-cyan)]/30 rounded-2xl"
                                            transition={prefersReducedMotion ? instantTween : snappySpring}
                                        />
                                    )}
                                    <item.icon className="relative h-5 w-5" />
                                </div>
                                <span className={cn(
                                    'text-[10px] font-medium text-center leading-tight px-0.5',
                                    active && 'font-semibold'
                                )}>
                                    {item.title}
                                </span>
                            </button>
                        );
                    })}

                    {/* More Button */}
                    <button
                        onClick={() => setIsExpanded(true)}
                        className={cn(
                            'relative flex flex-col items-center justify-center flex-1 h-full gap-1',
                            'active:scale-90 transition-transform duration-75',
                            isMoreActive
                                ? 'text-[var(--brand-teal)]'
                                : 'text-gray-400'
                        )}
                        style={{ touchAction: 'manipulation' }}
                    >
                        <div className="relative">
                            {isMoreActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-mint)]/60 to-[var(--brand-cyan)]/30 rounded-2xl"
                                    transition={prefersReducedMotion ? instantTween : snappySpring}
                                />
                            )}
                            <MoreHorizontal className="relative h-5 w-5" />
                        </div>
                        <span className={cn(
                            'text-[10px] font-medium',
                            isMoreActive && 'font-semibold'
                        )}>
                            More
                        </span>
                    </button>
                </div>
            </nav>
        </>
    );
}

export const MobileBottomNav = memo(MobileBottomNavComponent);

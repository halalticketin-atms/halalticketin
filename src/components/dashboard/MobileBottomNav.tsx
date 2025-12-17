'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDashboardPath } from '@/lib/organizer-path';
import { useAuth } from '@/context/auth-context';

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
        { title: 'Settings', href: '/settings', icon: Settings },
    ];
};

export function MobileBottomNav({ organizerId }: MobileBottomNavProps) {
    const pathname = usePathname();
    const [moreOpen, setMoreOpen] = useState(false);
    const { signOut } = useAuth();
    const mainNavItems = buildNavItems(organizerId);
    const moreItems = moreMenuItems(organizerId);

    const isActive = (href: string) => {
        const overviewHref = organizerId ? buildDashboardPath(organizerId) : '/dashboard';
        if (href === overviewHref) {
            return pathname === overviewHref;
        }
        return pathname.startsWith(href);
    };

    // Check if any "more" item is active
    const isMoreActive = moreItems.some((item) => isActive(item.href));

    return (
        <>
            {/* Bottom Tab Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-sm border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div
                    className="flex items-center justify-around h-16"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                    {mainNavItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                                    active
                                        ? 'text-[var(--brand-teal)]'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <div
                                    className={cn(
                                        'p-1.5 rounded-xl transition-colors',
                                        active && 'bg-[var(--brand-mint)]'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-medium">{item.title}</span>
                            </Link>
                        );
                    })}

                    {/* More Button */}
                    <button
                        onClick={() => setMoreOpen(true)}
                        className={cn(
                            'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                            isMoreActive || moreOpen
                                ? 'text-[var(--brand-teal)]'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <div
                            className={cn(
                                'p-1.5 rounded-xl transition-colors',
                                (isMoreActive || moreOpen) && 'bg-[var(--brand-mint)]'
                            )}
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </nav>

            {/* More Menu Modal */}
            <AnimatePresence>
                {moreOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
                            onClick={() => setMoreOpen(false)}
                        />

                        {/* More Menu Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-3xl shadow-2xl"
                            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                        >
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 bg-gray-300 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
                                <h3 className="text-lg font-semibold">More Options</h3>
                                <button
                                    onClick={() => setMoreOpen(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Menu Items */}
                            <div className="p-4 space-y-1">
                                {moreItems.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMoreOpen(false)}
                                            className={cn(
                                                'flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all',
                                                active
                                                    ? 'bg-[var(--brand-mint)] text-[var(--brand-teal)]'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            )}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span className="text-sm font-medium">{item.title}</span>
                                        </Link>
                                    );
                                })}

                                {/* Divider */}
                                <div className="h-px bg-gray-100 my-2" />

                                {/* Sign Out */}
                                <button
                                    onClick={() => {
                                        setMoreOpen(false);
                                        signOut();
                                    }}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-600 hover:bg-red-50 transition-all"
                                >
                                    <LogOut className="h-5 w-5" />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

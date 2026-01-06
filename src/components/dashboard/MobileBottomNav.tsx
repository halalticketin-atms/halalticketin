'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
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
        { title: 'Email Attendees', href: `${base}/email-attendees`, icon: Mail },
        { title: 'Credits', href: `${base}/billing`, icon: Wallet },
        { title: 'Settings', href: '/settings', icon: Settings },
    ];
};

export function MobileBottomNav({ organizerId }: MobileBottomNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [moreOpen, setMoreOpen] = useState(false);
    const { signOut } = useAuth();
    const mainNavItems = useMemo(() => buildNavItems(organizerId), [organizerId]);
    const moreItems = useMemo(() => moreMenuItems(organizerId), [organizerId]);

    // Lock body scroll when more menu is open (avoid on mobile to reduce layout work)
    useBodyScrollLock(false);

    const handleSignOut = () => {
        signOut();
        router.push('/login');
    };

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
            <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transform-gpu will-change-transform">
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
                                    'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-150 active:scale-95',
                                    active
                                        ? 'text-[var(--brand-teal)]'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <div
                                    className={cn(
                                        'p-1.5 rounded-xl transition-colors duration-150',
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
                        onClick={() => {
                            if (typeof performance !== 'undefined') {
                                performance.mark('dashboard-more-open');
                            }
                            setMoreOpen(true);
                        }}
                        className={cn(
                            'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-150 active:scale-95',
                            isMoreActive || moreOpen
                                ? 'text-[var(--brand-teal)]'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <div
                            className={cn(
                                'p-1.5 rounded-xl transition-colors duration-150',
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
            <>
                {/* Backdrop */}
                <div
                    className={cn(
                        'fixed inset-0 bg-black/50 z-50 lg:hidden overscroll-contain touch-none transition-opacity duration-150',
                        moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    )}
                    onClick={() => setMoreOpen(false)}
                    aria-hidden={!moreOpen}
                />

                {/* More Menu Sheet */}
                <div
                    className={cn(
                        'fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-3xl shadow-2xl transform-gpu will-change-transform transition-transform duration-200',
                        moreOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
                    )}
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    aria-hidden={!moreOpen}
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
                                        handleSignOut();
                                    }}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-600 hover:bg-red-50 transition-all"
                                >
                                    <LogOut className="h-5 w-5" />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </div>
                </div>
            </>
        </>
    );
}

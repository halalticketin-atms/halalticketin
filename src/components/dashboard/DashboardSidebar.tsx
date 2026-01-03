'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Calendar,
    BarChart3,
    Settings,
    LogOut,
    Receipt,
    ScanLine,
    Users,
    Mail,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganizerSwitcher } from './OrganizerSwitcher';
import { buildDashboardPath } from '@/lib/organizer-path';
import { useAuth } from '@/context/auth-context';

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
}

interface DashboardSidebarProps {
    organizerId?: string;
}

const buildNavItems = (organizerId?: string): NavItem[] => {
    const base = organizerId ? buildDashboardPath(organizerId) : '/dashboard';
    return [
        { title: 'Overview', href: base, icon: LayoutDashboard },
        { title: 'My Events', href: `${base}/events`, icon: Calendar },
        { title: 'Orders', href: `${base}/orders`, icon: Receipt },
        { title: 'Email Attendees', href: `${base}/email-attendees`, icon: Mail },
        { title: 'Team', href: `${base}/team`, icon: Users },
        { title: 'Check-in', href: `${base}/check-in`, icon: ScanLine },
        { title: 'Analytics', href: `${base}/analytics`, icon: BarChart3 },
        { title: 'Billing', href: `${base}/billing`, icon: Wallet },
    ];
};

const bottomNavItems: NavItem[] = [{ title: 'Settings', href: '/settings', icon: Settings }];

export function DashboardSidebar({ organizerId }: DashboardSidebarProps) {
    const pathname = usePathname();
    const { signOut } = useAuth();
    const mainNavItems = buildNavItems(organizerId);

    const isActive = (href: string) => {
        const overviewHref = organizerId ? buildDashboardPath(organizerId) : '/dashboard';
        if (href === overviewHref) {
            return pathname === overviewHref;
        }
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    const NavLink = ({ item }: { item: NavItem }) => (
        <Link
            href={item.href}
            className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium',
                isActive(item.href)
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
        >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.title}</span>
        </Link>
    );

    return (
        <>
            {/* Desktop Sidebar - Always visible on lg+ screens */}
            <aside className="hidden lg:flex fixed top-[var(--nav-safe-offset)] left-0 h-[calc(100vh-var(--nav-safe-offset))] w-[260px] bg-card/95 backdrop-blur-sm border-r border-border flex-col z-30 shadow-sm">
                {/* Organizer Switcher */}
                <div className="border-b border-border">
                    <OrganizerSwitcher />
                </div>

                {/* Main Navigation - Centered vertically */}
                <nav className="flex-1 flex flex-col justify-center px-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-2">
                        Menu
                    </p>
                    {mainNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                </nav>

                {/* Bottom Navigation */}
                <div className="p-4 border-t border-border space-y-1 bg-card">
                    {bottomNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                    <button
                        className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium',
                            'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
                        )}
                        onClick={() => signOut()}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

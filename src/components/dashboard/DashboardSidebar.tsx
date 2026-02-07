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
    Send,
    Wallet,
    Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganizerSwitcher } from './OrganizerSwitcher';
import { buildDashboardPath } from '@/lib/organizer-path';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import type { OrganizerRole } from '@/types';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    // Roles that can access this item (empty = all roles)
    allowedRoles?: OrganizerRole[];
}

interface DashboardSidebarProps {
    organizerId?: string;
}

// Define which roles can access which nav items
// Empty array means all roles can access
const buildNavItems = (organizerId?: string): NavItem[] => {
    const base = organizerId ? buildDashboardPath(organizerId) : '/dashboard';
    return [
        {
            title: 'Overview',
            href: base,
            icon: LayoutDashboard,
            allowedRoles: ['owner', 'co_owner', 'admin', 'editor'] // check_in excluded
        },
        {
            title: 'My Events',
            href: `${base}/events`,
            icon: Calendar,
            allowedRoles: ['owner', 'co_owner', 'admin', 'editor'] // check_in excluded
        },
        {
            title: 'Orders',
            href: `${base}/orders`,
            icon: Receipt,
            allowedRoles: ['owner', 'co_owner', 'admin', 'editor'] // check_in excluded
        },
        {
            title: 'Email Marketing',
            href: `${base}/email-marketing`,
            icon: Mail,
            allowedRoles: ['owner', 'co_owner', 'admin', 'editor'] // check_in excluded
        },
        {
            title: 'Email Attendees',
            href: `${base}/email-attendees`,
            icon: Send,
            allowedRoles: ['owner', 'co_owner', 'admin', 'editor'] // check_in excluded
        },
        {
            title: 'Team',
            href: `${base}/team`,
            icon: Users,
            allowedRoles: ['owner', 'co_owner', 'admin'] // editor, check_in excluded
        },
        {
            title: 'Check-in',
            href: `${base}/check-in`,
            icon: ScanLine,
            // All roles can access check-in
        },
        {
            title: 'Analytics',
            href: `${base}/analytics`,
            icon: BarChart3,
            allowedRoles: ['owner', 'co_owner', 'admin', 'editor'] // check_in excluded
        },
        {
            title: 'Credits',
            href: `${base}/billing`,
            icon: Wallet,
            allowedRoles: ['owner', 'co_owner'] // admin, editor, check_in excluded
        },
    ];
};

const bottomNavItems: NavItem[] = [{ title: 'Settings', href: '/settings', icon: Settings }];

export function DashboardSidebar({ organizerId }: DashboardSidebarProps) {
    const pathname = usePathname();
    const { signOut } = useAuth();
    const { organizers, activeOrganizerId } = useOrganizers();
    const mainNavItems = buildNavItems(organizerId);

    // Get the current user's role for the active organizer
    const activeOrganizer = organizers.find((org) => org.id === (organizerId || activeOrganizerId));
    const userRole = (activeOrganizer?.role as OrganizerRole) || 'check_in';

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

    const canAccessItem = (item: NavItem): boolean => {
        // If no allowedRoles specified, all roles can access
        if (!item.allowedRoles || item.allowedRoles.length === 0) {
            return true;
        }
        return item.allowedRoles.includes(userRole);
    };

    const NavLink = ({ item }: { item: NavItem }) => {
        const hasAccess = canAccessItem(item);

        if (!hasAccess) {
            // Render as disabled with tooltip
            return (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium cursor-not-allowed',
                                    'text-muted-foreground/50'
                                )}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span className="flex-1">{item.title}</span>
                                <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                            You don&apos;t have access to this feature
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return (
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
    };

    return (
        <>
            {/* Desktop Sidebar - Always visible on lg+ screens */}
            <aside className="hidden lg:flex fixed top-[var(--nav-safe-offset)] left-0 h-[calc(100vh-var(--nav-safe-offset))] w-[260px] bg-card border-r border-border flex-col z-30 shadow-sm">
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

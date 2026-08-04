'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
            title: 'Orders & Tickets',
            href: `${base}/orders`,
            icon: Receipt,
            allowedRoles: ['owner', 'co_owner', 'admin', 'editor'] // check_in excluded
        },
        {
            title: 'Email Attendees',
            href: `${base}/email-attendees`,
            icon: Mail,
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
    const logoHref = organizerId ? buildDashboardPath(organizerId) : '/dashboard';

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
            <aside className="fixed left-0 top-0 z-40 hidden min-h-[100dvh] w-[280px] flex-col border-r border-border/50 bg-card shadow-sm lg:flex">
                {/* Brand: bottom edge aligns with the top bar to read as one line */}
                <div className="flex h-16 items-center border-b border-border/50 px-5">
                    <Link href={logoHref} className="flex items-center gap-2">
                        <Image
                            src="/logos/HTlogocr.png"
                            alt="HalalTicketin' Logo"
                            width={120}
                            height={35}
                            className="h-8 w-auto"
                            priority
                        />
                    </Link>
                </div>

                {/* Organiser switcher, with no divider, blends into the nav below */}
                <div>
                    <OrganizerSwitcher size="lg" />
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 flex flex-col justify-start px-4 pt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-2">
                        Menu
                    </p>
                    {mainNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                </nav>

                {/* Bottom Navigation */}
                <div className="p-4 border-t border-border/50 space-y-1 bg-card">
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

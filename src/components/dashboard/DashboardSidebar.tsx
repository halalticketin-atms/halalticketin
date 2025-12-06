'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
    LayoutDashboard,
    Calendar,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
    { title: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { title: 'My Events', href: '/dashboard/events', icon: Calendar },
    { title: 'Orders', href: '/dashboard/orders', icon: Receipt },
    { title: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

const bottomNavItems: NavItem[] = [
    { title: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    const NavLink = ({ item }: { item: NavItem }) => (
        <Link
            href={item.href}
            onClick={() => setMobileOpen(false)}
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

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="flex items-center justify-between p-5 border-b border-border">
                <Link href="/" className="flex items-center">
                    <Image
                        src="/images/HTlogocr.png"
                        alt="HalalTicketin'"
                        width={140}
                        height={40}
                        className="h-9 w-auto"
                    />
                </Link>
                {/* Close button - mobile only */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setMobileOpen(false)}
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-3">
                    Menu
                </p>
                {mainNavItems.map((item) => (
                    <NavLink key={item.href} item={item} />
                ))}
            </nav>

            {/* Bottom Navigation */}
            <div className="p-4 border-t border-border space-y-1">
                {bottomNavItems.map((item) => (
                    <NavLink key={item.href} item={item} />
                ))}
                <button
                    className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium',
                        'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
                    )}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span>Sign Out</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <Button
                variant="outline"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden bg-background shadow-md"
                onClick={() => setMobileOpen(true)}
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Desktop Sidebar - Always visible, below header */}
            <aside className="hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] w-[260px] bg-card/95 backdrop-blur-sm border-r border-border flex-col z-30 shadow-sm">
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
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar - Slide out */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:hidden"
                            onClick={() => setMobileOpen(false)}
                        />

                        {/* Mobile Sidebar */}
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="fixed top-0 left-0 h-full w-[280px] bg-card border-r border-border flex flex-col z-50 lg:hidden shadow-xl"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

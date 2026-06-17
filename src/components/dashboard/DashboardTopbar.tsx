'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
import { useAuth } from '@/context/auth-context';

/**
 * Slim application top bar that sits above the dashboard content area (desktop only).
 * Pairs with the full-height DashboardSidebar so the organizer dashboard reads as a
 * single cohesive app shell instead of the public marketing header + sidebar.
 * On mobile the global marketing Header remains visible, so this is hidden there.
 */
export function DashboardTopbar() {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const displayName = user?.name || user?.email || 'User';
    const displayEmail = user?.email || '';
    const avatarInitial = displayName.charAt(0).toUpperCase();

    const handleSignOut = () => {
        signOut();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-20 hidden h-16 items-center gap-3 border-b border-border/50 bg-card/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-card/70 lg:flex">
            <Link
                href="/"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to site
            </Link>

            <div className="ml-auto flex items-center gap-3">
                <Button
                    className="rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] px-6 font-semibold text-white shadow-md hover:opacity-90"
                    asChild
                >
                    <Link href="/events/new">Create Event</Link>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative h-9 w-9 rounded-full p-0 ring-2 ring-white transition-all hover:ring-[var(--brand-cyan)]"
                            aria-label="Account menu"
                        >
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} className="object-cover" />
                                <AvatarFallback className="bg-[var(--brand-mint)] font-bold text-[var(--brand-teal)]">
                                    {avatarInitial}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-white shadow-xl" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="truncate text-sm font-medium">{displayName}</p>
                                {displayEmail && (
                                    <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
                                )}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile">Profile</Link>
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
            </div>
        </header>
    );
}

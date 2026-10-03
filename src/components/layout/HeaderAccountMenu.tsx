'use client';

import Link from 'next/link';
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

export interface HeaderAccountMenuProps {
    displayName: string;
    displayEmail: string;
    avatarInitial: string;
    avatarUrl?: string;
    isOrganizer: boolean;
    onSignOut: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function HeaderAccountMenu({
    displayName, displayEmail, avatarInitial, avatarUrl, isOrganizer,
    onSignOut, open, onOpenChange,
}: HeaderAccountMenuProps) {
    return (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full ring-2 ring-white hover:ring-[var(--brand-cyan)] transition-all p-0"
                    aria-label="Account menu"
                >
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                        <AvatarFallback className="bg-[var(--brand-mint)] text-[var(--brand-teal)] font-bold">
                            {avatarInitial}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 bg-white shadow-xl"
                align="end"
                forceMount
            >
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                {isOrganizer && (
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenChange(false);
                        onSignOut();
                    }}
                >
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

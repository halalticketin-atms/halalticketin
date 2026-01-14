'use client';

import { useState, useMemo } from 'react';
import { Plus, ChevronDown, Check, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Lazy load the dialog
const CreateOrganizerDialog = dynamic(
    () => import('@/components/auth/CreateOrganizerDialog').then(m => ({ default: m.CreateOrganizerDialog })),
    { ssr: false }
);

// Generate a consistent color based on org name
const getOrgColor = (name: string): { bg: string; text: string; border: string; gradient: string } => {
    const colors = [
        { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', gradient: 'from-emerald-500 to-teal-500' },
        { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30', gradient: 'from-violet-500 to-purple-500' },
        { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', gradient: 'from-amber-500 to-orange-500' },
        { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', gradient: 'from-rose-500 to-pink-500' },
        { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30', gradient: 'from-sky-500 to-cyan-500' },
        { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', gradient: 'from-indigo-500 to-blue-500' },
    ];

    // Simple hash based on name to get consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
};

interface OrgBadgeProps {
    name: string;
    avatarUrl?: string | null;
    isActive?: boolean;
    showChevron?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function OrgBadge({ name, avatarUrl, isActive = false, showChevron = false, size = 'md', className }: OrgBadgeProps) {
    const color = getOrgColor(name);
    const initial = name.charAt(0).toUpperCase();

    const sizes = {
        sm: 'h-6 w-6 text-xs',
        md: 'h-8 w-8 text-sm',
        lg: 'h-10 w-10 text-base',
    };

    const paddingSizes = {
        sm: 'pl-1.5 pr-2 py-1',
        md: 'pl-2 pr-3 py-1.5',
        lg: 'pl-2.5 pr-4 py-2',
    };

    const textSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 rounded-full transition-all duration-200',
                color.bg,
                isActive && 'ring-2 ring-offset-2 ring-offset-background',
                isActive && color.border.replace('border-', 'ring-'),
                paddingSizes[size],
                className
            )}
        >
            {/* Avatar or Gradient Initial */}
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={name}
                    className={cn('rounded-full object-cover border-0', sizes[size])}
                />
            ) : (
                <div
                    className={cn(
                        'rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white shadow-sm',
                        color.gradient,
                        sizes[size]
                    )}
                >
                    {initial}
                </div>
            )}

            {/* Org Name */}
            <span className={cn('font-medium truncate max-w-[120px]', color.text, textSizes[size])}>
                {name}
            </span>

            {showChevron && (
                <ChevronDown className={cn('opacity-60 shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4', color.text)} />
            )}
        </div>
    );
}

interface OrganizerSwitcherProps {
    variant?: 'sidebar' | 'inline';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function OrganizerSwitcher({ variant = 'sidebar', size = 'md', showLabel = true }: OrganizerSwitcherProps) {
    const router = useRouter();
    const { activeOrganizers, organizers, activeOrganizerId, setActiveOrganizerId, refresh, isLoading } = useOrganizers();
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Show only active orgs in the dropdown
    const options = useMemo(() => activeOrganizers, [activeOrganizers]);

    // Find current org (could be suspended)
    const currentOrganizer = organizers.find(org => org.id === activeOrganizerId);

    if (isLoading && options.length === 0) {
        return (
            <div className={variant === 'sidebar' ? 'px-4 py-3' : ''}>
                <div className="h-10 w-full animate-pulse rounded-full bg-muted" />
            </div>
        );
    }

    const handleSelect = (organizerId: string) => {
        setActiveOrganizerId(organizerId);
        if (variant === 'sidebar') {
            router.push(buildDashboardPath(organizerId));
        }
    };

    const handleOrgCreated = async (organizerId: string) => {
        setActiveOrganizerId(organizerId);
        await refresh();
        router.push(buildDashboardPath(organizerId));
    };

    return (
        <>
            <div className={variant === 'sidebar' ? 'px-4 py-3' : ''}>
                {showLabel && variant === 'sidebar' && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Organiser
                    </p>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full">
                            {currentOrganizer ? (
                                <OrgBadge
                                    name={currentOrganizer.name}
                                    avatarUrl={currentOrganizer.avatarUrl}
                                    isActive
                                    showChevron
                                    size={size}
                                    className="w-full justify-between hover:shadow-md cursor-pointer"
                                />
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 transition-colors cursor-pointer">
                                    <Building2 className="h-4 w-4" />
                                    <span className="text-sm">Select organization</span>
                                    <ChevronDown className="h-4 w-4 ml-auto opacity-60" />
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[260px] p-2">
                        <div className="px-2 py-1.5 mb-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Your Organizations
                            </p>
                        </div>

                        {options.map((org) => {
                            const isSelected = org.id === activeOrganizerId;
                            const color = getOrgColor(org.name);

                            return (
                                <DropdownMenuItem
                                    key={org.id}
                                    onClick={() => handleSelect(org.id)}
                                    className="cursor-pointer p-2 rounded-lg focus:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        {/* Avatar or Gradient Initial */}
                                        {org.avatarUrl ? (
                                            <img
                                                src={org.avatarUrl}
                                                alt={org.name}
                                                className="h-8 w-8 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div
                                                className={cn(
                                                    'h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white text-sm shrink-0',
                                                    color.gradient
                                                )}
                                            >
                                                {org.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{org.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{org.role.replace('_', ' ')}</p>
                                        </div>
                                        {isSelected && (
                                            <Check className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}

                        <DropdownMenuSeparator className="my-2" />

                        <DropdownMenuItem
                            onClick={() => setShowCreateDialog(true)}
                            className="cursor-pointer p-2 rounded-lg"
                        >
                            <div className="flex items-center gap-3 text-primary">
                                <div className="h-8 w-8 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center">
                                    <Plus className="h-4 w-4" />
                                </div>
                                <span className="font-medium">Create New Organization</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <CreateOrganizerDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSuccess={handleOrgCreated}
            />
        </>
    );
}

// Export the color helper for use in other components
export { getOrgColor };

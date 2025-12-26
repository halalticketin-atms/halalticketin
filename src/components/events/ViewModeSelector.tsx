'use client';

import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'desktop' | 'tablet' | 'mobile';

interface ViewModeSelectorProps {
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
    className?: string;
    includeTablet?: boolean;
}

export function ViewModeSelector({ value, onChange, className, includeTablet = false }: ViewModeSelectorProps) {
    const modes: { value: ViewMode; label: string; icon: typeof Monitor }[] = [
        { value: 'desktop', label: 'Desktop', icon: Monitor },
        ...(includeTablet ? [{ value: 'tablet' as ViewMode, label: 'Tablet', icon: Tablet }] : []),
        { value: 'mobile', label: 'Mobile', icon: Smartphone },
    ];

    return (
        <div className={cn('inline-flex items-center rounded-lg border bg-background p-1 gap-1', className)}>
            {modes.map((mode) => {
                const Icon = mode.icon;
                const isActive = value === mode.value;

                return (
                    <button
                        key={mode.value}
                        onClick={() => onChange(mode.value)}
                        className={cn(
                            'inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                            'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        type="button"
                    >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

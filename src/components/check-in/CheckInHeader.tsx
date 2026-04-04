'use client';

import { useMemo } from 'react';
import { Search, ScanLine, ChevronDown, Radio } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CheckInStats } from '@/types';

interface EventOption {
    id: string;
    name: string;
}

interface CheckInHeaderProps {
    events: EventOption[];
    selectedEventId: string;
    onEventChange: (eventId: string) => void;
    stats: CheckInStats;
    mode?: 'scan' | 'search';
    onModeChange?: (mode: 'scan' | 'search') => void;
    showModeToggle?: boolean;
    error?: string | null;
    subtitle?: string;
    isEventLoading?: boolean;
}

export function CheckInHeader({
    events,
    selectedEventId,
    onEventChange,
    stats,
    mode = 'scan',
    onModeChange,
    showModeToggle = true,
    isEventLoading,
}: CheckInHeaderProps) {
    const percentage = useMemo(() => {
        if (stats.totalTickets === 0) return 0;
        return Math.round((stats.checkedIn / stats.totalTickets) * 100);
    }, [stats.checkedIn, stats.totalTickets]);

    const remaining = stats.totalTickets - stats.checkedIn;
    const hasMultipleEvents = events.length > 1;

    return (
        <div className="space-y-3.5 mb-6 overflow-hidden">
            {/* Event Banner */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-primary/[0.03] to-transparent shadow-sm">
                    {/* Decorative accent line at top */}
                    <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary/20" />

                    <div className="px-5 py-4 sm:px-6 sm:py-5">
                        {/* Live badge */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">
                                Live Check-in
                            </span>
                        </div>

                        {/* Event selector */}
                        <Select
                            value={selectedEventId}
                            onValueChange={onEventChange}
                            disabled={isEventLoading}
                        >
                            <SelectTrigger
                                className={cn(
                                    "w-full border-0 shadow-none p-0 h-auto bg-transparent",
                                    "focus:ring-0 focus-visible:ring-0 [&>svg]:hidden",
                                    hasMultipleEvents && "cursor-pointer hover:opacity-80 active:scale-[0.995] transition-all"
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0 w-full">
                                    <h1 className="text-[1.75rem] sm:text-4xl lg:text-[2.75rem] font-black tracking-tight truncate min-w-0 leading-[1.15] text-foreground">
                                        <SelectValue placeholder="Select event" />
                                    </h1>
                                    {hasMultipleEvents && (
                                        <span className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-colors">
                                            <ChevronDown className="h-4 w-4" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Switch</span>
                                        </span>
                                    )}
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border border-border/60 shadow-2xl p-2 max-w-[calc(100vw-2rem)] bg-popover/95 backdrop-blur-xl">
                                <div className="px-2 pt-1 pb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">Switch event</p>
                                </div>
                                {events.map((event) => (
                                    <SelectItem
                                        key={event.id}
                                        value={event.id}
                                        className="rounded-xl h-12 px-3 overflow-hidden cursor-pointer data-[state=checked]:bg-primary/10"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="shrink-0 h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Radio className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="font-bold text-sm truncate">{event.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Stats Card */}
            <div
                className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
            >
                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                    {/* Progress bar — thin accent at top */}
                    <div className="h-[3px] w-full bg-muted/50">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-out"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    <div className="flex items-center px-5 py-4">
                        {/* Checked in */}
                        <div>
                            <div className="text-2xl font-black leading-none text-primary">{stats.checkedIn}</div>
                            <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/50 mt-1">Checked in</div>
                        </div>

                        <div className="h-7 w-px bg-border/50 mx-4 sm:mx-5" />

                        {/* Total */}
                        <div>
                            <div className="text-2xl font-black leading-none text-foreground/25">{stats.totalTickets}</div>
                            <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/30 mt-1">Total</div>
                        </div>

                        <div className="h-7 w-px bg-border/50 mx-4 sm:mx-5" />

                        {/* Remaining */}
                        <div>
                            <div className="text-2xl font-black leading-none text-foreground/25">{remaining}</div>
                            <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/30 mt-1">Left</div>
                        </div>

                        {/* Percentage ring — pushed right */}
                        <div className="ml-auto pl-3">
                            <div className="relative h-12 w-12 flex items-center justify-center">
                                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                        className="text-muted/50"
                                    />
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                        strokeDasharray={125.66}
                                        strokeDashoffset={125.66 - (125.66 * percentage) / 100}
                                        className="text-primary transition-all duration-1000 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute text-[10px] font-black text-primary">{percentage}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mode Toggle */}
            {showModeToggle && onModeChange && (
                <div
                    className="flex p-1.5 bg-muted/40 border border-border/40 rounded-xl gap-1 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
                >
                    <Button
                        variant="ghost"
                        className={cn(
                            "flex-1 h-11 rounded-lg transition-all duration-300 font-bold text-sm",
                            mode === 'scan'
                                ? "bg-card text-primary shadow-sm border border-border/40"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => onModeChange('scan')}
                    >
                        <ScanLine className="h-4 w-4 mr-2" />
                        Scanner
                    </Button>
                    <Button
                        variant="ghost"
                        className={cn(
                            "flex-1 h-11 rounded-lg transition-all duration-300 font-bold text-sm",
                            mode === 'search'
                                ? "bg-card text-primary shadow-sm border border-border/40"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => onModeChange('search')}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Attendee List
                    </Button>
                </div>
            )}
        </div>
    );
}

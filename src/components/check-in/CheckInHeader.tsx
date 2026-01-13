'use client';

import { useMemo } from 'react';
import { Calendar, Users, CheckCircle, Search, ScanLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    error,
    subtitle,
    isEventLoading,
}: CheckInHeaderProps) {
    const percentage = useMemo(() => {
        if (stats.totalTickets === 0) return 0;
        return Math.round((stats.checkedIn / stats.totalTickets) * 100);
    }, [stats.checkedIn, stats.totalTickets]);

    return (
        <div className="space-y-6 mb-8">
            {/* Title and Event Selector */}
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-1.5 px-1">
                    <h1 className="text-4xl font-black tracking-tight text-black">Check-in</h1>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                        Attendee Directory
                    </p>
                </div>

                <Select
                    value={selectedEventId}
                    onValueChange={onEventChange}
                    disabled={isEventLoading}
                >
                    <SelectTrigger className="w-full bg-white border-2 border-black/5 rounded-2xl h-14 shadow-sm px-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-xl">
                                <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <SelectValue placeholder="Select event" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2 border-black/5 shadow-2xl p-2">
                        {events.map((event) => (
                            <SelectItem key={event.id} value={event.id} className="rounded-xl my-1 h-12">
                                <span className="font-bold">{event.name}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stats Bar - Premium Layout */}
            <Card className="rounded-4xl border-2 border-black/5 shadow-xl shadow-black/5 overflow-hidden bg-white">
                <CardContent className="p-0">
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between p-6">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black">{stats.checkedIn}</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground opacity-50">Checked In</span>
                                </div>
                                <div className="h-10 w-px bg-black/5" />
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black text-black/20">{stats.totalTickets}</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground opacity-30">Total</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="relative h-14 w-14 flex items-center justify-center">
                                    <svg className="h-14 w-14 -rotate-90">
                                        <circle
                                            cx="28"
                                            cy="28"
                                            r="24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="6"
                                            className="text-black/5"
                                        />
                                        <circle
                                            cx="28"
                                            cy="28"
                                            r="24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="6"
                                            strokeDasharray={150.8}
                                            strokeDashoffset={150.8 - (150.8 * percentage) / 100}
                                            className="text-primary transition-all duration-1000 ease-out"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute text-[11px] font-black text-primary">{percentage}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-black/5">
                            <div
                                className="h-full bg-primary transition-all duration-1000 ease-out"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Mode Toggle - Modern Switch (Solid Background) */}
            {showModeToggle && onModeChange && (
                <div className="flex p-2 bg-white border-2 border-black/5 rounded-3xl gap-1.5 shadow-sm">
                    <Button
                        variant="ghost"
                        className={cn(
                            "flex-1 h-14 rounded-2xl transition-all duration-300 font-black text-sm tracking-wide",
                            mode === 'scan' ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-black/5"
                        )}
                        onClick={() => onModeChange('scan')}
                    >
                        <ScanLine className="h-4 w-4 mr-2" />
                        Scanner
                    </Button>
                    <Button
                        variant="ghost"
                        className={cn(
                            "flex-1 h-14 rounded-2xl transition-all duration-300 font-black text-sm tracking-wide",
                            mode === 'search' ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-black/5"
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

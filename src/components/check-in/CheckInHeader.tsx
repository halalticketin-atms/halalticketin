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
        <div className="space-y-4 mb-6">
            {/* Title and Event Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight">Check-in</h1>
                    <p className="text-sm text-muted-foreground font-medium">
                        {subtitle || 'Manage event entry'}
                    </p>
                </div>

                <Select
                    value={selectedEventId}
                    onValueChange={onEventChange}
                    disabled={isEventLoading}
                >
                    <SelectTrigger className="w-full sm:w-[280px] bg-white border-2 border-black/5 rounded-xl h-12">
                        <Calendar className="h-4 w-4 mr-2 shrink-0 text-primary" />
                        <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                        {events.map((event) => (
                            <SelectItem key={event.id} value={event.id} className="rounded-lg my-1">
                                {event.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive" className="rounded-xl border-2">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Stats Bar - Cleaner Mobile Version */}
            <Card className="rounded-2xl border-2 border-black/5 shadow-none overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between p-4 bg-muted/20">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black">{stats.checkedIn}</span>
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Checked In</span>
                                </div>
                                <div className="h-8 w-[2px] bg-black/5" />
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-muted-foreground/40">{stats.totalTickets}</span>
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">Total</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-2xl font-black text-primary">{percentage}%</span>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Progress</span>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted">
                            <div
                                className="h-full bg-primary transition-all duration-700 ease-out"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Mode Toggle (Mobile) */}
            {showModeToggle && onModeChange && (
                <div className="flex p-1.5 bg-muted/40 rounded-2xl gap-1">
                    <Button
                        variant="ghost"
                        className={cn(
                            "flex-1 h-12 rounded-xl transition-all font-bold",
                            mode === 'scan' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                        )}
                        onClick={() => onModeChange('scan')}
                    >
                        <ScanLine className="h-4 w-4 mr-2" />
                        Scanner
                    </Button>
                    <Button
                        variant="ghost"
                        className={cn(
                            "flex-1 h-12 rounded-xl transition-all font-bold",
                            mode === 'search' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
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

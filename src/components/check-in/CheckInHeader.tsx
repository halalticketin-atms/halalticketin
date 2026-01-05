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
                <div>
                    <h1 className="text-2xl font-bold">Check-in</h1>
                    <p className="text-sm text-muted-foreground">
                        {subtitle || 'Scan tickets or search for attendees'}
                    </p>
                </div>

                <Select
                    value={selectedEventId}
                    onValueChange={onEventChange}
                    disabled={isEventLoading}
                >
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <Calendar className="h-4 w-4 mr-2 shrink-0" />
                        <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                        {events.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                                {event.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Stats Bar */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{stats.totalTickets}</span>
                                <span className="text-sm text-muted-foreground">total</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-600">{stats.checkedIn}</span>
                                <span className="text-sm text-muted-foreground">checked in</span>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Mode Toggle (Mobile) */}
            {showModeToggle && onModeChange && (
                <div className="flex gap-2">
                    <Button
                        variant={mode === 'scan' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => onModeChange('scan')}
                    >
                        <ScanLine className="h-4 w-4 mr-2" />
                        Scan
                    </Button>
                    <Button
                        variant={mode === 'search' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => onModeChange('search')}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Search
                    </Button>
                </div>
            )}
        </div>
    );
}

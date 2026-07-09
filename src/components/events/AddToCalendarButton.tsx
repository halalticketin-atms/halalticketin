'use client';

import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    buildGoogleCalendarUrl,
    buildIcsFileContent,
    type CalendarEventInput,
} from '@/lib/calendar-links';

export function AddToCalendarButton({ event }: { event: CalendarEventInput }) {
    const googleUrl = buildGoogleCalendarUrl(event);
    if (!googleUrl) return null;

    const downloadIcs = () => {
        const content = buildIcsFileContent(event);
        if (!content) return;
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${event.title.replace(/[^\w\s-]/g, '').trim() || 'event'}.ics`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-11 sm:h-9 rounded-lg">
                    <CalendarPlus className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
                    Add to calendar
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                    <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                        Google Calendar
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={downloadIcs}>
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Apple / Outlook (.ics)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

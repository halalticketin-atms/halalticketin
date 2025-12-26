'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion'; // Changed from 'motion/react' to 'framer-motion' based on common usage and the diff's implied context
import { Calendar, MapPin, MoreHorizontal, Eye, Edit, Trash2, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteEventDialog } from './DeleteEventDialog';
import { SUPPORTED_CURRENCIES } from '@/lib/fees';

interface Event {
    id: string;
    title: string;
    date: string;
    location: string;
    status: 'published' | 'draft' | 'completed'; // Kept for statusColors/Labels
    displayStatus: 'published' | 'draft' | 'completed'; // Added based on diff
    ticketsSold: number;
    totalTickets: number;
    imageUrl?: string; // Kept as optional for backward compatibility if not all events have bannerImageUrl
    bannerImageUrl?: string; // Added based on diff
    currency: string; // Added based on diff
}

interface RecentEventsProps {
    events: Event[];
    organizerId?: string | null;
}

const statusColors = {
    published: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    draft: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    completed: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
};

const statusLabels = {
    published: 'Published',
    draft: 'Draft',
    completed: 'Past',
};

export function RecentEvents({ events, organizerId }: RecentEventsProps) {
    const router = useRouter();
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; eventId: string; eventTitle: string }>({
        open: false,
        eventId: '',
        eventTitle: '',
    });

    const handleCardClick = (eventId: string, e: React.MouseEvent) => {
        // Don't navigate if clicking on the dropdown menu
        const target = e.target as HTMLElement;
        if (target.closest('[data-dropdown-trigger]') || target.closest('[data-dropdown-content]')) {
            return;
        }
        router.push(`/events/${eventId}/edit`);
    };

    const handleDeleteSuccess = () => {
        // Refresh the page to show updated events list
        router.refresh();
    };

    return (
        <>
            <Card className="border-border/50 overflow-hidden">
                <CardHeader className="flex-row items-center justify-between pb-4">
                    <CardTitle className="text-xl font-semibold">Recent Events</CardTitle>
                    <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
                        <Link href={organizerId ? `/dashboard/o/${organizerId}/events` : '/events'}>
                            View all
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    {events.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                                <Calendar className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">No events yet</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                Get started by creating your first event. It only takes a few minutes.
                            </p>
                            <Button asChild>
                                <Link href="/events/new">Create your first event</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {events.map((event, index) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                >
                                    <Card
                                        className="group relative overflow-hidden border border-border/60 hover:border-primary/20 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                                        onClick={(e) => handleCardClick(event.id, e)}
                                    >
                                        {/* Banner Image - Portrait 4:5 */}
                                        <div className="relative w-full aspect-[4/5] overflow-hidden bg-muted">
                                            {event.bannerImageUrl ? (
                                                <Image
                                                    src={event.bannerImageUrl}
                                                    alt={event.title || 'Event'}
                                                    fill
                                                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                                                    <Calendar className="h-12 w-12 text-muted-foreground/40" />
                                                </div>
                                            )}

                                            {/* Currency Badge - Top Right */}
                                            <div className="absolute top-2 right-2">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm border border-slate-200/50">
                                                    {SUPPORTED_CURRENCIES[event.currency as keyof typeof SUPPORTED_CURRENCIES]?.symbol || event.currency}
                                                    <span className="text-[10px] font-semibold text-slate-500">{event.currency}</span>
                                                </span>
                                            </div>

                                            {/* Status Badge - Top Left */}
                                            <div className="absolute top-2 left-2">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${event.displayStatus === 'published'
                                                            ? 'bg-emerald-500/90 text-white'
                                                            : event.displayStatus === 'draft'
                                                                ? 'bg-slate-500/90 text-white'
                                                                : 'bg-amber-500/90 text-white'
                                                        }`}
                                                >
                                                    {statusLabels[event.displayStatus]}
                                                </span>
                                            </div>

                                            {/* Three-Dot Menu - Top Right (adjusted position due to currency badge) */}
                                            <div className="absolute top-2 right-2" data-dropdown-trigger>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            className="h-8 w-8 bg-background/80 hover:bg-background backdrop-blur-sm shadow-sm"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" data-dropdown-content>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/events/${event.id}`}>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/events/${event.id}/edit`}>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteDialog({
                                                                    open: true,
                                                                    eventId: event.id,
                                                                    eventTitle: event.title,
                                                                });
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>

                                        {/* Card Content */}
                                        <CardContent className="p-3 space-y-2 bg-gradient-to-b from-background to-muted/20">
                                            {/* Title */}
                                            <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem] leading-tight">
                                                {event.title}
                                            </h3>

                                            {/* Event Details */}
                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3 shrink-0 text-primary/70" />
                                                    <span className="truncate">{event.date}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                                                    <span className="truncate">{event.location}</span>
                                                </div>
                                            </div>

                                            {/* Tickets Sold - Enhanced */}
                                            <div className="-mx-3 px-3 py-2 mt-2 border-t bg-primary/5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Sold</span>
                                                    <span className="font-bold text-primary">
                                                        {event.ticketsSold}/{event.totalTickets}
                                                    </span>
                                                </div>
                                                {/* Progress Bar - Enhanced */}
                                                <div className="mt-1.5 h-1 bg-background rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                                                        style={{
                                                            width: `${Math.min((event.ticketsSold / event.totalTickets) * 100, 100)}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <DeleteEventDialog
                eventId={deleteDialog.eventId}
                eventTitle={deleteDialog.eventTitle}
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
                onSuccess={handleDeleteSuccess}
            />
        </>
    );
}

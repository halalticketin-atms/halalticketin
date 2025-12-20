'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
    Calendar,
    MapPin,
    Plus,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    Clock,
    CheckCircle,
    Archive,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizerEvents, DashboardEvent, DashboardEventStatus } from '@/hooks/useOrganizerEvents';

const statusConfig: Record<DashboardEventStatus, { label: string; color: string; icon: typeof Clock }> = {
    active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: Calendar },
    past: { label: 'Completed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
    draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700', icon: Archive },
};

/**
 * Format event datetime for display.
 */
function formatEventDateTime(event: DashboardEvent): { date: string; time: string } {
    if (!event.startDatetime) {
        return { date: 'Date TBD', time: '' };
    }

    const start = new Date(event.startDatetime);
    const date = start.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const time = start.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return { date, time };
}

/**
 * Get location display string.
 */
function getLocationDisplay(event: DashboardEvent): string {
    if (event.locationType === 'online') {
        return 'Online Event';
    }
    if (event.venue) {
        return event.city ? `${event.venue}, ${event.city}` : event.venue;
    }
    if (event.city) {
        return event.city;
    }
    return 'Location TBD';
}

function EventCard({ event, index }: { event: DashboardEvent; index: number }) {
    const config = statusConfig[event.displayStatus];
    const StatusIcon = config.icon;
    const { date, time } = formatEventDateTime(event);
    const location = getLocationDisplay(event);

    // For now, we don't have ticket sales data - will be added when orders are implemented
    const ticketsSold = 0;
    const totalTickets = 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
        >
            <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow group">
                <div className="flex flex-col sm:flex-row">
                    {/* Poster Image */}
                    <div className="relative w-full sm:w-40 md:w-48 aspect-[4/5] sm:aspect-auto shrink-0 bg-muted overflow-hidden">
                        {event.bannerImageUrl ? (
                            <Image
                                src={event.bannerImageUrl}
                                alt={event.title || 'Event'}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                <Calendar className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                        <Badge className={`absolute top-3 left-3 ${config.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                        </Badge>
                    </div>

                    {/* Content */}
                    <CardContent className="flex-1 p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                                    {event.title || 'Untitled Event'}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {date}{time && ` at ${time}`}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {location}
                                    </span>
                                </div>

                                {/* Stats - placeholder until orders are implemented */}
                                <div className="flex items-center gap-6 mt-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Tickets Sold</p>
                                        <p className="font-semibold">
                                            {ticketsSold}/{totalTickets}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Revenue</p>
                                        <p className="font-semibold text-primary">£0</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Capacity</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${(ticketsSold / totalTickets) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium">
                                                {Math.round((ticketsSold / totalTickets) * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="shrink-0">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {event.slug && event.displayStatus !== 'draft' && (
                                        <DropdownMenuItem asChild>
                                            <Link href={`/events/${event.slug}`}>
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Public Page
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem asChild>
                                        <Link href={`/events/${event.id}/edit`}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </motion.div>
    );
}

export default function MyEventsPage() {
    const organizerId = useOrganizerFromParams();
    const { events, isLoading, error, counts } = useOrganizerEvents(organizerId);
    const [activeTab, setActiveTab] = useState('all');

    const getFilteredEvents = (status: string) => {
        if (status === 'all') return events;
        return events.filter(e => e.displayStatus === status);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading events...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <Card className="max-w-md p-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                    <h2 className="text-lg font-semibold">Failed to load events</h2>
                    <p className="text-muted-foreground mt-2">{error}</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
                >
                    <div>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold">My Events</h1>
                        <p className="text-muted-foreground mt-1">Manage your events and track performance</p>
                    </div>
                    <Button asChild className="shrink-0">
                        <Link href={organizerId ? `/events/new?organizerId=${organizerId}` : '/events/new'}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Event
                        </Link>
                    </Button>
                </motion.div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="all" className="gap-2">
                            All <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="active" className="gap-2">
                            Active <Badge variant="secondary" className="ml-1">{counts.active}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="past" className="gap-2">
                            Past <Badge variant="secondary" className="ml-1">{counts.past}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="draft" className="gap-2">
                            Drafts <Badge variant="secondary" className="ml-1">{counts.draft}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    {['all', 'active', 'past', 'draft'].map(tab => (
                        <TabsContent key={tab} value={tab} className="space-y-4">
                            {getFilteredEvents(tab).length === 0 ? (
                                <Card className="p-12 text-center">
                                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                    <h3 className="font-semibold text-lg">No events found</h3>
                                    <p className="text-muted-foreground mt-1">
                                        {tab === 'draft'
                                            ? "You don't have any draft events."
                                            : tab === 'all'
                                                ? "You haven't created any events yet."
                                                : tab === 'active'
                                                    ? "You don't have any active events."
                                                    : "You don't have any past events yet."}
                                    </p>
                                    <Button asChild className="mt-4">
                                        <Link href={organizerId ? `/events/new?organizerId=${organizerId}` : '/events/new'}>
                                            Create your first event
                                        </Link>
                                    </Button>
                                </Card>
                            ) : (
                                getFilteredEvents(tab).map((event, i) => (
                                    <EventCard key={event.id} event={event} index={i} />
                                ))
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}

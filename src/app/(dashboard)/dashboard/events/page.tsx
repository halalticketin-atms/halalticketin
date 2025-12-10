'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
    Calendar,
    MapPin,
    Users,
    Plus,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    Clock,
    CheckCircle,
    Archive,
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
import { dashboardEvents, type DashboardEvent } from '@/data/mock-events';

const statusConfig = {
    ongoing: { label: 'Ongoing', color: 'bg-blue-100 text-blue-700', icon: Clock },
    upcoming: { label: 'Upcoming', color: 'bg-green-100 text-green-700', icon: Calendar },
    past: { label: 'Completed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
    draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700', icon: Archive },
};

function EventCard({ event, index }: { event: DashboardEvent; index: number }) {
    const config = statusConfig[event.status];
    const StatusIcon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
        >
            <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow group">
                <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0">
                        <Image
                            src={event.imageUrl}
                            alt={event.title}
                            fill
                            className="object-cover"
                        />
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
                                    {event.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {event.date} at {event.time}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {event.location}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-6 mt-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Tickets Sold</p>
                                        <p className="font-semibold">
                                            {event.ticketsSold}/{event.totalTickets}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Revenue</p>
                                        <p className="font-semibold text-primary">{event.revenue}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Capacity</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${(event.ticketsSold / event.totalTickets) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium">
                                                {Math.round((event.ticketsSold / event.totalTickets) * 100)}%
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
                                    <DropdownMenuItem asChild>
                                        <Link href={`/events/${event.id}`}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Event
                                        </Link>
                                    </DropdownMenuItem>
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
    const [activeTab, setActiveTab] = useState('all');

    const getFilteredEvents = (status: string) => {
        if (status === 'all') return dashboardEvents;
        return dashboardEvents.filter(e => e.status === status);
    };

    const counts = {
        all: dashboardEvents.length,
        ongoing: dashboardEvents.filter(e => e.status === 'ongoing').length,
        upcoming: dashboardEvents.filter(e => e.status === 'upcoming').length,
        past: dashboardEvents.filter(e => e.status === 'past').length,
        draft: dashboardEvents.filter(e => e.status === 'draft').length,
    };

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
                        <Link href="/events/new">
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
                        <TabsTrigger value="ongoing" className="gap-2">
                            Ongoing <Badge variant="secondary" className="ml-1">{counts.ongoing}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="gap-2">
                            Upcoming <Badge variant="secondary" className="ml-1">{counts.upcoming}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="past" className="gap-2">
                            Past <Badge variant="secondary" className="ml-1">{counts.past}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="draft" className="gap-2">
                            Drafts <Badge variant="secondary" className="ml-1">{counts.draft}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    {['all', 'ongoing', 'upcoming', 'past', 'draft'].map(tab => (
                        <TabsContent key={tab} value={tab} className="space-y-4">
                            {getFilteredEvents(tab).length === 0 ? (
                                <Card className="p-12 text-center">
                                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                    <h3 className="font-semibold text-lg">No events found</h3>
                                    <p className="text-muted-foreground mt-1">
                                        {tab === 'draft'
                                            ? "You don't have any draft events."
                                            : `You don't have any ${tab} events yet.`}
                                    </p>
                                    <Button asChild className="mt-4">
                                        <Link href="/events/new">Create your first event</Link>
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

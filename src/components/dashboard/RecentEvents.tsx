'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Calendar, MapPin, MoreHorizontal, Eye, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Event {
    id: string;
    title: string;
    date: string;
    location: string;
    status: 'published' | 'draft' | 'completed';
    ticketsSold: number;
    totalTickets: number;
    imageUrl: string;
}

interface RecentEventsProps {
    events: Event[];
}

const statusColors = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gray-100 text-gray-700',
};

export function RecentEvents({ events }: RecentEventsProps) {
    return (
        <Card className="border-border/50 overflow-hidden">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Events</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/events">View all</Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {events.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                        You haven&apos;t created any events yet.{' '}
                        <Link href="/events/new" className="text-primary hover:underline font-medium">
                            Create your first event
                        </Link>{' '}
                        to see them here.
                    </div>
                ) : (
                    <div className="divide-y">
                        {events.map((event, index) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className="flex items-start gap-3 p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                            >
                                <div className="relative w-12 sm:w-16 aspect-[4/5] shrink-0 overflow-hidden rounded-lg bg-muted">
                                    {event.imageUrl ? (
                                        <Image
                                            src={event.imageUrl}
                                            alt={event.title}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                        <h3 className="font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{event.title}</h3>
                                        <Badge className={`${statusColors[event.status]} text-xs`} variant="secondary">
                                            {event.status}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs sm:text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {event.date}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {event.location}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        {event.ticketsSold}/{event.totalTickets} tickets sold
                                    </p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
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
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </motion.div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

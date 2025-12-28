'use client';

import { motion } from 'motion/react';
import { Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SalesChart } from './SalesChart';

interface WeeklySalesData {
    weekStart: string;
    ticketsSold: number;
    revenue: number;
}

interface EventPerformanceData {
    id: string;
    title: string;
    startDatetime: string | null;
    venue: string | null;
    city: string | null;
    bannerImageUrl: string | null;
    ticketsSold: number;
    totalTickets: number;
    revenue: number;
    currency: string;
    status: 'published' | 'draft' | 'cancelled' | 'archived';
    displayStatus: 'published' | 'draft' | 'past';
    salesTrend: number[];
    trendPercentage: number;
    weeklySales: WeeklySalesData[];
}

interface EventPerformanceCardsProps {
    events: EventPerformanceData[];
    organizerId: string | null;
}

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
    } catch {
        return `£${amount.toFixed(2)}`;
    }
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date TBD';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Date TBD';
    }
};

const statusColors = {
    published: 'bg-emerald-500/90 text-white',
    draft: 'bg-slate-500/90 text-white',
    past: 'bg-amber-500/90 text-white',
};

export function EventPerformanceCards({ events, organizerId }: EventPerformanceCardsProps) {
    if (events.length === 0) {
        return (
            <Card className="border-dashed border-2 border-border/50">
                <CardContent className="py-16 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">No active events</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        Get started by creating your first event.
                    </p>
                    <Button asChild>
                        <Link href="/events/new">Create your first event</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">Active Events Performance</h2>
                <Button variant="ghost" size="sm" asChild>
                    <Link href={organizerId ? `/dashboard/o/${organizerId}/events` : '/events'}>
                        View all events
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6">
                {events.map((event, index) => {
                    const percentage = (event.ticketsSold / event.totalTickets) * 100 || 0;
                    const location = event.city && event.venue
                        ? `${event.venue}, ${event.city}`
                        : event.venue || event.city || 'Location TBD';

                    return (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                        >
                            <Card className="group overflow-hidden border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                                <div className="grid md:grid-cols-[280px_1fr] gap-0">
                                    {/* Banner Image - 4:5 aspect ratio for full poster */}
                                    <div className="relative w-full aspect-[4/5] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
                                        {event.bannerImageUrl ? (
                                            <Image
                                                src={event.bannerImageUrl}
                                                alt={event.title}
                                                fill
                                                className="object-contain"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Calendar className="h-16 w-16 text-muted-foreground/40" />
                                            </div>
                                        )}
                                        {/* Status Badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColors[event.displayStatus]}`}>
                                                {event.displayStatus}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <CardContent className="p-6 space-y-4">
                                        {/* Header */}
                                        <div className="space-y-2">
                                            <h3 className="font-display text-xl font-semibold leading-tight line-clamp-2">
                                                {event.title}
                                            </h3>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>{formatDate(event.startDatetime)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-4 w-4" />
                                                    <span>{location}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div>
                                            <div className="flex items-center justify-between text-sm mb-2">
                                                <span className="text-muted-foreground">Capacity</span>
                                                <span className="font-mono font-bold text-primary">
                                                    {event.ticketsSold}/{event.totalTickets} ({Math.round(percentage)}%)
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                                                    transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Revenue Metric */}
                                        <div className="pt-2">
                                            <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                                            <div className="font-mono text-2xl font-bold text-primary">
                                                {formatCurrency(event.revenue, event.currency)}
                                            </div>
                                        </div>

                                        {/* Weekly Sales Chart */}
                                        <div className="border-t pt-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">12-Week Sales Trend</div>
                                            <SalesChart data={event.weeklySales} currency={event.currency} />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/events/${event.id}`}>
                                                    View Event
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/events/${event.id}/edit`}>
                                                    Edit Event
                                                </Link>
                                            </Button>
                                            {event.displayStatus === 'published' && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/dashboard/o/${organizerId}/email-attendees?eventId=${event.id}`}>
                                                        Email Attendees
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

'use client';

import { motion } from 'motion/react';
import { Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SalesChart } from './SalesChart';
import { CircularProgress, ticketTypeColors } from './CircularProgress';

interface WeeklySalesData {
    weekStart: string;
    ticketsSold: number;
    revenue: number;
}

interface TicketTypeBreakdown {
    id: string;
    name: string;
    sold: number;
    total: number;
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
    ticketTypeBreakdown: TicketTypeBreakdown[];
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
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                            className="min-w-0"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                        >
                            <Card className="group overflow-hidden border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300 w-full max-w-full min-w-0">
                                <div className="flex min-w-0 flex-col gap-0 md:grid md:grid-cols-[280px_1fr]">
                                    {/* Banner Image - centered and contained */}
                                    <div className="relative w-full h-48 sm:h-56 md:h-auto md:aspect-[4/5] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                                        {event.bannerImageUrl ? (
                                            <Image
                                                src={event.bannerImageUrl}
                                                alt={event.title}
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768px) 100vw, 280px"
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

                                    {/* Content - contained within bounds */}
                                    <CardContent className="min-w-0 p-4 sm:p-6 space-y-4 overflow-hidden w-full max-w-full">
                                        {/* Header */}
                                        <div className="space-y-2">
                                            <h3 className="font-display text-lg sm:text-xl font-semibold leading-tight line-clamp-2">
                                                {event.title}
                                            </h3>
                                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-x-4 sm:gap-y-1 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Calendar className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">{formatDate(event.startDatetime)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <MapPin className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">{location}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Revenue Metric */}
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Net Revenue</div>
                                            <div className="font-mono text-xl sm:text-2xl font-bold text-primary">
                                                {formatCurrency(event.revenue, event.currency)}
                                            </div>
                                        </div>

                                        {/* Capacity Bar */}
                                        <div className="w-full pt-2">
                                            <div className="flex items-center justify-between text-sm mb-2 gap-2">
                                                <span className="text-muted-foreground flex-shrink-0">Capacity</span>
                                                <span className="font-mono text-xs sm:text-sm font-bold text-primary truncate">
                                                    {event.ticketsSold}/{event.totalTickets} ({Math.round(percentage)}%)
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden w-full">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                                                    transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Ticket Type Breakdown - Circular with Distinct Colors */}
                                        {event.ticketTypeBreakdown && event.ticketTypeBreakdown.length > 0 && (
                                            <div className="border-t pt-5">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                                                    Sales by Ticket Type
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {event.ticketTypeBreakdown.map((ticketType, ttIndex) => {
                                                        const ttPercentage = ticketType.total > 0
                                                            ? (ticketType.sold / ticketType.total) * 100
                                                            : (ticketType.sold > 0 ? 100 : 0);
                                                        const colorVariant = ticketTypeColors[ttIndex % ticketTypeColors.length];
                                                        return (
                                                            <motion.div
                                                                key={ticketType.id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ duration: 0.5, delay: index * 0.05 + ttIndex * 0.1 }}
                                                            >
                                                                <CircularProgress
                                                                    percentage={ttPercentage}
                                                                    size="md"
                                                                    colorVariant={colorVariant}
                                                                    label={ticketType.name}
                                                                    sublabel={`${ticketType.sold}${ticketType.total > 0 ? ` / ${ticketType.total}` : ' sold'}`}
                                                                />
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Weekly Sales Chart - contained */}
                                        <div className="border-t pt-4 w-full overflow-hidden">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">12-Week Sales Trend</div>
                                            <div className="w-full max-w-full overflow-hidden">
                                                <SalesChart data={event.weeklySales} currency={event.currency} />
                                            </div>
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

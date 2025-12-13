'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
    Calendar,
    Clock,
    MapPin,
    Globe,
    Users,
    Share2,
    Heart,
    Ticket,
    Loader2,
    AlertCircle,
    ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { PublicTicketRecord } from '@/lib/events-api';

/**
 * Format a price for display.
 */
function formatPrice(price: string | null, currency: string): string {
    if (!price || price === '0' || price === '0.00') {
        return 'Free';
    }
    const num = parseFloat(price);
    const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
    return `${symbol}${num.toFixed(2)}`;
}

/**
 * Ticket card component.
 */
function TicketCard({ ticket }: { ticket: PublicTicketRecord }) {
    const price = formatPrice(ticket.price, ticket.currency);
    const isFree = ticket.type === 'free' || price === 'Free';

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex-1">
                <h4 className="font-medium">{ticket.name}</h4>
                {ticket.description && (
                    <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                )}
            </div>
            <div className="text-right ml-4">
                <p className={`font-semibold ${isFree ? 'text-green-600' : 'text-primary'}`}>
                    {price}
                </p>
                {ticket.maxQuantity && (
                    <p className="text-xs text-muted-foreground">
                        Limited availability
                    </p>
                )}
            </div>
        </div>
    );
}

export default function EventDetailsPage() {
    const params = useParams();
    const slug = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    const { event, tickets, isLoading, error } = usePublicEvent(slug ?? null);

    // Format event date/time
    const eventDateTime = useMemo(() => {
        if (!event?.startDatetime) {
            return { date: 'Date TBD', time: '', endTime: '' };
        }
        const start = new Date(event.startDatetime);
        const end = event.endDatetime ? new Date(event.endDatetime) : null;

        const date = start.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const time = start.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const endTime = end
            ? end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : '';

        return { date, time, endTime };
    }, [event?.startDatetime, event?.endDatetime]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading event details...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !event) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-2xl rounded-3xl border bg-background p-8 text-center shadow-lg"
                >
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h1 className="mt-3 font-display text-3xl font-bold">
                        Event not found
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        {error || "This event doesn't exist or is no longer available."}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Button asChild>
                            <Link href="/events">Browse Events</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/">Go Home</Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Hero Section */}
            <div className="relative">
                {/* Banner Image */}
                <div className="relative h-64 sm:h-80 md:h-96 bg-muted">
                    {event.bannerImageUrl ? (
                        <Image
                            src={event.bannerImageUrl}
                            alt={event.title || 'Event'}
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <Calendar className="h-16 w-16 text-primary/40" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Back Button */}
                    <div className="absolute top-4 left-4">
                        <Button variant="secondary" size="sm" asChild className="backdrop-blur-sm">
                            <Link href="/events">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Events
                            </Link>
                        </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        <Button variant="secondary" size="icon" className="backdrop-blur-sm">
                            <Heart className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="icon" className="backdrop-blur-sm">
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container py-8">
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Title and Organizer */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h1 className="font-display text-3xl sm:text-4xl font-bold">
                                {event.title || 'Untitled Event'}
                            </h1>
                            {event.organizerName && (
                                <p className="mt-2 text-muted-foreground">
                                    Hosted by <span className="font-medium text-foreground">{event.organizerName}</span>
                                </p>
                            )}
                        </motion.div>

                        {/* Date, Time, Location Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="flex flex-wrap gap-4"
                        >
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-5 w-5 text-primary" />
                                <span>{eventDateTime.date}</span>
                            </div>
                            {eventDateTime.time && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-5 w-5 text-primary" />
                                    <span>
                                        {eventDateTime.time}
                                        {eventDateTime.endTime && ` - ${eventDateTime.endTime}`}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                                {event.locationType === 'online' ? (
                                    <>
                                        <Globe className="h-5 w-5 text-primary" />
                                        <span>Online Event</span>
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="h-5 w-5 text-primary" />
                                        <span>
                                            {event.venue && `${event.venue}, `}
                                            {event.city || 'Location TBD'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </motion.div>

                        <Separator />

                        {/* Description */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            <h2 className="text-xl font-semibold mb-4">About this event</h2>
                            {event.description ? (
                                <div className="prose prose-neutral dark:prose-invert max-w-none">
                                    <p className="text-muted-foreground whitespace-pre-wrap">
                                        {event.description}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic">
                                    No description available for this event.
                                </p>
                            )}
                        </motion.div>

                        {/* Location Details */}
                        {event.locationType !== 'online' && (event.venue || event.address) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                            >
                                <h2 className="text-xl font-semibold mb-4">Location</h2>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
                                            <div>
                                                {event.venue && (
                                                    <p className="font-medium">{event.venue}</p>
                                                )}
                                                {event.address && (
                                                    <p className="text-muted-foreground">{event.address}</p>
                                                )}
                                                {event.city && (
                                                    <p className="text-muted-foreground">
                                                        {event.city}{event.country && `, ${event.country}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar - Tickets */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="sticky top-8"
                        >
                            <Card className="overflow-hidden">
                                <CardHeader className="bg-primary/5">
                                    <CardTitle className="flex items-center gap-2">
                                        <Ticket className="h-5 w-5" />
                                        Tickets
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    {tickets.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">
                                            No tickets available yet.
                                        </p>
                                    ) : (
                                        <>
                                            {tickets.map((ticket) => (
                                                <TicketCard key={ticket.id} ticket={ticket} />
                                            ))}
                                        </>
                                    )}

                                    <Separator />

                                    <Button className="w-full" size="lg" disabled={tickets.length === 0}>
                                        <Ticket className="h-4 w-4 mr-2" />
                                        {tickets.length === 0 ? 'No Tickets Available' : 'Get Tickets'}
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground">
                                        Secure checkout powered by Stripe
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Attendees placeholder */}
                            <Card className="mt-4">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Be the first to register!
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
